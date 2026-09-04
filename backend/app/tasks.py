import asyncio
from datetime import UTC, datetime

from celery import Celery  # type: ignore[import-untyped]
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.config import settings
from app.crawler import CrawlBlocked, fetch_allowed, robots_allows
from app.database import SessionLocal
from app.extraction import extract_facts, sanitize_html
from app.models import (
    CrawlJob,
    CrawlRun,
    DataSource,
    ExtractedFact,
    Lead,
    LeadEvent,
    LeadStatus,
    Page,
    PageSnapshot,
)

celery_app = Celery("leadscope", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.beat_schedule = {
    "retention-daily": {"task": "app.tasks.apply_retention", "schedule": 86400.0},
}
celery_app.conf.timezone = "UTC"


async def _crawl_once(run_id: str) -> dict[str, int | str]:
    with SessionLocal() as db:
        run = db.get(CrawlRun, run_id)
        if not run:
            return {"status": "NOT_FOUND", "pages": 0}
        job = db.get(CrawlJob, run.job_id)
        source = db.get(DataSource, job.source_id) if job else None
        if not job or not source or job.status == "STOPPED":
            run.status = "STOPPED"
            db.commit()
            return {"status": "STOPPED", "pages": 0}
        run.status = "RUNNING"
        job.status = "RUNNING"
        db.commit()
        try:
            if not await robots_allows(job.start_url):
                source.robots_status = "DENIED"
                raise CrawlBlocked("ROBOTS_DENIED", "robots.txt forbids this URL")
            source.robots_status = "ALLOWED"
            result = await fetch_allowed(job.start_url)
            page = db.scalar(
                select(Page).where(
                    Page.tenant_id == job.tenant_id, Page.canonical_url == result.url
                )
            )
            if not page:
                page = Page(
                    tenant_id=job.tenant_id,
                    source_id=source.id,
                    canonical_url=result.url,
                    http_status=result.status_code,
                )
                db.add(page)
                db.flush()
            previous = db.scalar(
                select(PageSnapshot)
                .where(PageSnapshot.page_id == page.id)
                .order_by(PageSnapshot.captured_at.desc())
                .limit(1)
            )
            changed = not previous or previous.content_hash != result.content_hash
            run.pages_seen = 1
            if changed:
                cleaned = sanitize_html(result.content.decode("utf-8", errors="replace"))
                snapshot = PageSnapshot(
                    tenant_id=job.tenant_id,
                    page_id=page.id,
                    content_hash=result.content_hash,
                    etag=result.etag,
                    last_modified=result.last_modified,
                    sanitized_excerpt=cleaned[:2000],
                )
                db.add(snapshot)
                for fact in extract_facts(cleaned):
                    db.add(
                        ExtractedFact(
                            tenant_id=job.tenant_id,
                            page_id=page.id,
                            fact_type=fact.fact_type,
                            value=fact.value,
                            source_url=result.url,
                            content_hash=result.content_hash,
                            confidence=fact.confidence,
                        )
                    )
                run.pages_changed = 1
            run.status = "COMPLETED"
            job.status = "COMPLETED"
            run.finished_at = datetime.now(UTC)
            audit(
                db,
                "CRAWL_RUN_COMPLETE",
                tenant_id=job.tenant_id,
                entity_type="crawl_run",
                entity_id=run.id,
                safe_metadata={"pages_seen": 1, "pages_changed": int(changed)},
            )
            db.commit()
            return {"status": "COMPLETED", "pages": 1}
        except CrawlBlocked as exc:
            run.status = "BLOCKED"
            run.error_code = exc.code
            run.error_message = str(exc)
            run.finished_at = datetime.now(UTC)
            job.status = "BLOCKED"
            audit(
                db,
                "CRAWL_RUN_BLOCKED",
                tenant_id=job.tenant_id,
                entity_type="crawl_run",
                entity_id=run.id,
                outcome="BLOCKED",
                reason_codes=[exc.code],
            )
            db.commit()
            return {"status": "BLOCKED", "pages": 0}
        except Exception as exc:
            run.status = "FAILED"
            run.error_code = "FETCH_FAILED"
            run.error_message = type(exc).__name__
            run.finished_at = datetime.now(UTC)
            job.status = "FAILED"
            audit(
                db,
                "CRAWL_RUN_FAILED",
                tenant_id=job.tenant_id,
                entity_type="crawl_run",
                entity_id=run.id,
                outcome="FAILED",
                reason_codes=["FETCH_FAILED"],
            )
            db.commit()
            return {"status": "FAILED", "pages": 0}


@celery_app.task(name="app.tasks.run_crawl")
def run_crawl(run_id: str) -> dict[str, int | str]:
    return asyncio.run(_crawl_once(run_id))


@celery_app.task(name="app.tasks.apply_retention")
def apply_retention() -> dict[str, int]:
    with SessionLocal() as db:
        anonymized = apply_retention_in_session(db, datetime.now(UTC))
    return {"anonymized": anonymized}


def apply_retention_in_session(db: Session, now: datetime) -> int:
    leads = list(
        db.scalars(select(Lead).where(Lead.retained_until.is_not(None), Lead.retained_until < now))
    )
    for lead in leads:
        lead.contact_encrypted = {"ciphertext": "", "version": "deleted"}
        lead.consent_text = None
        lead.consent_evidence = {}
        lead.status = LeadStatus.SUPPRESSED.value if lead.contact_hash else LeadStatus.BLOCKED.value
        db.add(
            LeadEvent(
                tenant_id=lead.tenant_id,
                lead_id=lead.id,
                event_type="RETENTION_ANONYMIZED",
                metadata_json={"had_suppression_hash": bool(lead.contact_hash)},
            )
        )
        audit(
            db,
            "RETENTION_ANONYMIZE",
            tenant_id=lead.tenant_id,
            entity_type="lead",
            entity_id=lead.id,
        )
    db.commit()
    return len(leads)
