import csv
import io
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import audit
from app.config import settings
from app.crawler import CrawlBlocked, validate_public_url
from app.database import get_db
from app.deps import ROLE_PERMISSIONS, TenantContext, current_user, require
from app.models import (
    AuditLog,
    BusinessContact,
    Company,
    CompanySignal,
    Competitor,
    ConsentEvent,
    CrawlJob,
    CrawlRun,
    DataSource,
    DataSubjectRequest,
    Export,
    IntegrationConfig,
    Lead,
    LeadEvent,
    LeadStatus,
    Membership,
    NicheTemplate,
    Opportunity,
    RetentionPolicy,
    ReviewStatus,
    SuppressionEntry,
    Tenant,
    User,
)
from app.policy import PolicyInput, evaluate_policy
from app.schemas import (
    CompetitorCreate,
    CompetitorOut,
    ConsentChange,
    CrawlJobCreate,
    DSRCreate,
    LeadIn,
    LeadOut,
    LoginRequest,
    NicheCreate,
    NicheOut,
    PolicyRequest,
    PolicyResponse,
    SourceCreate,
    SourceOut,
    TenantOut,
    TokenResponse,
)
from app.scoring import additive_score
from app.security import (
    create_token,
    decode_token,
    decrypt_json,
    encrypt_json,
    identity_hash,
    mask_email,
    mask_phone,
    safe_csv_cell,
    verify_password,
    verify_webhook,
)

router = APIRouter(prefix="/api/v1")


def set_refresh_cookies(response: Response, user_id: str) -> None:
    refresh = create_token(user_id, "refresh")
    csrf = identity_hash(refresh)[:32]
    shared_options: dict[str, Any] = {
        "secure": settings.app_env == "production",
        "samesite": "strict",
        "max_age": settings.refresh_token_days * 86400,
    }
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        path="/api/v1/auth/refresh",
        **shared_options,
    )
    response.set_cookie("csrf_token", csrf, httponly=False, path="/", **shared_options)


def page_query[T](
    db: Session, model: type[T], tenant_id: str, cursor: str | None, limit: int
) -> tuple[list[T], str | None]:
    query = select(model).where(model.tenant_id == tenant_id)  # type: ignore[attr-defined]
    if cursor:
        query = query.where(model.id > cursor)  # type: ignore[attr-defined]
    items = list(db.scalars(query.order_by(model.id).limit(min(limit, 100) + 1)))  # type: ignore[attr-defined]
    next_cursor = items[-2].id if len(items) > min(limit, 100) else None  # type: ignore[attr-defined]
    return items[: min(limit, 100)], next_cursor


@router.post("/auth/login", response_model=TokenResponse, tags=["auth"])
def login(
    payload: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.casefold()))
    if not user or not verify_password(payload.password, user.password_hash):
        audit(db, "AUTH_LOGIN", outcome="DENIED", reason_codes=["INVALID_CREDENTIALS"])
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    set_refresh_cookies(response, user.id)
    audit(db, "AUTH_LOGIN", actor_user_id=user.id)
    db.commit()
    return TokenResponse(
        access_token=create_token(user.id), expires_in=settings.access_token_minutes * 60
    )


@router.post("/auth/refresh", response_model=TokenResponse, tags=["auth"])
def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    csrf_cookie: str | None = Cookie(default=None, alias="csrf_token"),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(get_db),
) -> TokenResponse:
    if (
        not refresh_token
        or not csrf_cookie
        or csrf_cookie != csrf_header
        or csrf_cookie != identity_hash(refresh_token)[:32]
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF validation failed")
    try:
        user_id = decode_token(refresh_token, "refresh")
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Inactive user")
    set_refresh_cookies(response, user.id)
    return TokenResponse(
        access_token=create_token(user.id), expires_in=settings.access_token_minutes * 60
    )


@router.get("/auth/me", tags=["auth"])
def me(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    memberships = list(db.scalars(select(Membership).where(Membership.user_id == user.id)))
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "memberships": [{"tenant_id": item.tenant_id, "role": item.role} for item in memberships],
    }


@router.get("/tenants", response_model=list[TenantOut], tags=["tenants"])
def tenants(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Tenant]:
    return list(db.scalars(select(Tenant).join(Membership).where(Membership.user_id == user.id)))


@router.get("/niche-templates", response_model=list[NicheOut], tags=["niches"])
def niche_templates(
    context: TenantContext = Depends(require("read")), db: Session = Depends(get_db)
) -> list[NicheTemplate]:
    return list(
        db.scalars(
            select(NicheTemplate)
            .where(
                (NicheTemplate.tenant_id == context.tenant_id) | (NicheTemplate.tenant_id.is_(None))
            )
            .order_by(NicheTemplate.market_type, NicheTemplate.name)
        )
    )


@router.post("/niche-templates", response_model=NicheOut, status_code=201, tags=["niches"])
def create_niche_template(
    payload: NicheCreate,
    context: TenantContext = Depends(require("manage_rules")),
    db: Session = Depends(get_db),
) -> NicheTemplate:
    item = NicheTemplate(tenant_id=context.tenant_id, **payload.model_dump())
    db.add(item)
    db.flush()
    audit(
        db,
        "NICHE_TEMPLATE_CREATE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="niche_template",
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/roles", tags=["tenants"])
def roles(context: TenantContext = Depends(require("read"))) -> list[dict[str, Any]]:
    return [
        {"name": name, "permissions": sorted(permissions)}
        for name, permissions in ROLE_PERMISSIONS.items()
    ]


@router.get("/competitors", tags=["competitors"])
def competitors(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, Competitor, context.tenant_id, cursor, limit)
    return {
        "items": [CompetitorOut.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.post("/competitors", response_model=CompetitorOut, status_code=201, tags=["competitors"])
def create_competitor(
    payload: CompetitorCreate,
    context: TenantContext = Depends(require("write")),
    db: Session = Depends(get_db),
) -> Competitor:
    item = Competitor(tenant_id=context.tenant_id, **payload.model_dump())
    db.add(item)
    db.flush()
    audit(
        db,
        "COMPETITOR_CREATE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="competitor",
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/sources", tags=["sources"])
def sources(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, DataSource, context.tenant_id, cursor, limit)
    return {
        "items": [SourceOut.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.post("/sources", response_model=SourceOut, status_code=201, tags=["sources"])
def create_source(
    payload: SourceCreate,
    context: TenantContext = Depends(require("write")),
    db: Session = Depends(get_db),
) -> DataSource:
    source = DataSource(
        tenant_id=context.tenant_id,
        source_type=payload.source_type,
        url=str(payload.url),
        owner=payload.owner,
        country=payload.country.upper(),
        legal_basis=payload.legal_basis,
        terms_url=str(payload.terms_url) if payload.terms_url else None,
        scan_allowed=payload.scan_allowed,
        contains_personal_data=payload.contains_personal_data,
        status=ReviewStatus.REVIEW_REQUIRED.value,
    )
    db.add(source)
    db.flush()
    audit(
        db,
        "SOURCE_CREATE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="source",
        entity_id=source.id,
    )
    db.commit()
    db.refresh(source)
    return source


@router.post("/sources/{source_id}/approve", response_model=SourceOut, tags=["sources"])
def approve_source(
    source_id: str,
    context: TenantContext = Depends(require("manage_rules")),
    db: Session = Depends(get_db),
) -> DataSource:
    source = db.scalar(
        select(DataSource).where(
            DataSource.id == source_id, DataSource.tenant_id == context.tenant_id
        )
    )
    if not source:
        raise HTTPException(404, "Source not found")
    if not source.scan_allowed or not source.legal_basis:
        raise HTTPException(409, "Scanning permission and legal basis are required")
    source.status = ReviewStatus.APPROVED.value
    audit(
        db,
        "SOURCE_APPROVE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="source",
        entity_id=source.id,
    )
    db.commit()
    return source


@router.get("/crawl-jobs", tags=["crawler"])
def crawl_jobs(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, CrawlJob, context.tenant_id, cursor, limit)
    return {
        "items": [
            {
                "id": item.id,
                "source_id": item.source_id,
                "start_url": item.start_url,
                "status": item.status,
                "max_pages": item.max_pages,
            }
            for item in items
        ],
        "next_cursor": next_cursor,
    }


@router.post("/crawl-jobs", status_code=201, tags=["crawler"])
def create_crawl_job(
    payload: CrawlJobCreate,
    context: TenantContext = Depends(require("run_crawl")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    source = db.scalar(
        select(DataSource).where(
            DataSource.id == payload.source_id, DataSource.tenant_id == context.tenant_id
        )
    )
    if not source or source.status != ReviewStatus.APPROVED.value or not source.scan_allowed:
        audit(
            db,
            "CRAWL_BLOCKED",
            tenant_id=context.tenant_id,
            actor_user_id=context.user.id,
            outcome="BLOCKED",
            reason_codes=["SOURCE_NOT_APPROVED"],
        )
        db.commit()
        raise HTTPException(403, "Source is not approved for scanning")
    try:
        canonical, _ = validate_public_url(str(payload.start_url))
    except CrawlBlocked as exc:
        audit(
            db,
            "CRAWL_BLOCKED",
            tenant_id=context.tenant_id,
            actor_user_id=context.user.id,
            outcome="BLOCKED",
            reason_codes=[exc.code],
        )
        db.commit()
        raise HTTPException(422, {"code": exc.code, "message": str(exc)}) from exc
    if (urlsplit(canonical).hostname or "").casefold() != (
        urlsplit(source.url).hostname or ""
    ).casefold():
        audit(
            db,
            "CRAWL_BLOCKED",
            tenant_id=context.tenant_id,
            actor_user_id=context.user.id,
            outcome="BLOCKED",
            reason_codes=["SOURCE_HOST_MISMATCH"],
        )
        db.commit()
        raise HTTPException(422, "Start URL must belong to the approved source host")
    job = CrawlJob(
        tenant_id=context.tenant_id,
        source_id=source.id,
        start_url=canonical,
        max_depth=payload.max_depth,
        max_pages=payload.max_pages,
        deny_patterns=payload.deny_patterns,
    )
    db.add(job)
    db.flush()
    run = CrawlRun(tenant_id=context.tenant_id, job_id=job.id, status="QUEUED")
    db.add(run)
    audit(
        db,
        "CRAWL_JOB_CREATE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="crawl_job",
        entity_id=job.id,
    )
    db.commit()
    if not settings.database_url.startswith("sqlite"):
        from app.tasks import run_crawl

        run_crawl.delay(run.id)
    return {"id": job.id, "run_id": run.id, "status": job.status}


@router.get("/crawl-runs", tags=["crawler"])
def crawl_runs(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, CrawlRun, context.tenant_id, cursor, limit)
    return {
        "items": [
            {
                "id": item.id,
                "job_id": item.job_id,
                "status": item.status,
                "pages_seen": item.pages_seen,
                "pages_changed": item.pages_changed,
                "error_code": item.error_code,
            }
            for item in items
        ],
        "next_cursor": next_cursor,
    }


@router.post("/crawl-jobs/{job_id}/stop", tags=["crawler"])
def stop_crawl_job(
    job_id: str,
    context: TenantContext = Depends(require("run_crawl")),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    job = db.scalar(
        select(CrawlJob).where(CrawlJob.id == job_id, CrawlJob.tenant_id == context.tenant_id)
    )
    if not job:
        raise HTTPException(404, "Crawl job not found")
    job.status = "STOPPED"
    job.stopped_at = datetime.now(UTC)
    audit(
        db,
        "CRAWL_JOB_STOP",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="crawl_job",
        entity_id=job.id,
    )
    db.commit()
    return {"id": job.id, "status": job.status}


def consent_quality(payload: LeadIn) -> str:
    has_action = bool(
        payload.consent_evidence.get("action") or payload.consent_evidence.get("proof")
    )
    if (
        payload.consent_text
        and payload.consent_version
        and payload.consent_timestamp
        and has_action
        and payload.allowed_channels
    ):
        return "VERIFIED"
    return "INCOMPLETE" if payload.consent_text or payload.consent_evidence else "NONE"


def ingest_lead(
    db: Session,
    tenant_id: str,
    payload: LeadIn,
    idempotency_key: str,
    actor_user_id: str | None = None,
) -> tuple[Lead, list[str]]:
    existing = db.scalar(
        select(Lead).where(Lead.tenant_id == tenant_id, Lead.idempotency_key == idempotency_key)
    )
    if existing:
        return existing, ["IDEMPOTENT_REPLAY"]
    primary = (
        payload.contact.get("email")
        or payload.contact.get("phone")
        or payload.contact.get("company_domain")
        or ""
    )
    contact_digest = identity_hash(primary) if primary else None
    suppressed = contact_digest and db.scalar(
        select(SuppressionEntry).where(
            SuppressionEntry.tenant_id == tenant_id,
            SuppressionEntry.identity_hash == contact_digest,
        )
    )
    quality = consent_quality(payload)
    decision = evaluate_policy(
        PolicyInput(
            "RU",
            "RU",
            payload.market_type,
            payload.source_type,
            "PERSON_CONTACT" if payload.market_type == "B2C" else "COMPANY_CONTACT",
            payload.purpose,
            payload.allowed_channels[0] if payload.allowed_channels else None,
            quality,
            "NORMAL",
        )
    )
    if suppressed:
        lead_status = LeadStatus.SUPPRESSED.value
        reasons = ["SUPPRESSION_MATCH"]
    elif decision.decision == "ALLOW":
        lead_status = LeadStatus.CONTACT_ALLOWED.value
        reasons = decision.reasons
    elif payload.source_type == "PARTNER" or "EVIDENCE" in " ".join(decision.reasons):
        lead_status = LeadStatus.QUARANTINED.value
        reasons = decision.reasons
    else:
        lead_status = LeadStatus.BLOCKED.value
        reasons = decision.reasons
    factors = {
        "intent": 20 if "demo" not in payload.quality else 10,
        "recency": 20,
        "product_fit": float(payload.quality.get("product_fit", 10)),
        "source_quality": 20 if payload.source_type != "PARTNER" else 10,
        "consent_quality": 20 if quality == "VERIFIED" else 0,
    }
    score = additive_score(
        factors, {"compliance_risk": 30 if lead_status != LeadStatus.CONTACT_ALLOWED.value else 0}
    )
    lead = Lead(
        tenant_id=tenant_id,
        market_type=payload.market_type,
        source_type=payload.source_type,
        contact_encrypted=encrypt_json(payload.contact),
        contact_hash=contact_digest,
        status=lead_status,
        purpose=payload.purpose,
        legal_basis=payload.legal_basis,
        allowed_channels=payload.allowed_channels,
        consent_version=payload.consent_version,
        consent_text=payload.consent_text,
        consent_timestamp=payload.consent_timestamp,
        consent_evidence=payload.consent_evidence,
        retained_until=payload.retained_until,
        idempotency_key=idempotency_key,
        quality={
            **payload.quality,
            "policy_reasons": reasons,
            "score_factors": score.factors,
            "form_url": str(payload.form_url) if payload.form_url else None,
            "partner_id": payload.partner_id,
            "utm": payload.utm,
            "campaign_id": payload.campaign_id,
        },
        score=score.score,
    )
    db.add(lead)
    db.flush()
    db.add(
        LeadEvent(
            tenant_id=tenant_id,
            lead_id=lead.id,
            event_type="INGESTED",
            metadata_json={"status": lead_status, "policy_reasons": reasons},
        )
    )
    if payload.consent_timestamp:
        db.add(
            ConsentEvent(
                tenant_id=tenant_id,
                lead_id=lead.id,
                event_type="GRANTED",
                channels=payload.allowed_channels,
                text_version=payload.consent_version,
                source=str(payload.form_url or payload.partner_id or payload.source_type),
                evidence=payload.consent_evidence,
                occurred_at=payload.consent_timestamp,
            )
        )
    audit(
        db,
        "LEAD_INGEST",
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        entity_type="lead",
        entity_id=lead.id,
        outcome="SUCCESS" if lead_status == LeadStatus.CONTACT_ALLOWED.value else lead_status,
        reason_codes=reasons,
        safe_metadata={"source_type": payload.source_type, "market_type": payload.market_type},
    )
    db.commit()
    db.refresh(lead)
    return lead, reasons


def lead_out(lead: Lead, can_view: bool, reasons: list[str] | None = None) -> LeadOut:
    contact = decrypt_json(lead.contact_encrypted)
    masked: dict[str, str] = {}
    for key, value in contact.items():
        if can_view:
            masked[key] = str(value)
        elif key == "email":
            masked[key] = mask_email(str(value))
        elif key == "phone":
            masked[key] = mask_phone(str(value))
        else:
            masked[key] = "••••"
    return LeadOut(
        id=lead.id,
        market_type=lead.market_type,
        source_type=lead.source_type,
        status=lead.status,
        purpose=lead.purpose,
        allowed_channels=lead.allowed_channels,
        received_at=lead.received_at,
        score=lead.score,
        masked_contact=masked,
        policy_reasons=reasons or list(lead.quality.get("policy_reasons", [])),
    )


@router.post("/leads", response_model=LeadOut, status_code=201, tags=["leads"])
def create_lead(
    payload: LeadIn,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=200),
    context: TenantContext = Depends(require("write")),
    db: Session = Depends(get_db),
) -> LeadOut:
    lead, reasons = ingest_lead(db, context.tenant_id, payload, idempotency_key, context.user.id)
    can_view = "*" in context.permissions or "view_contacts" in context.permissions
    return lead_out(lead, can_view, reasons)


@router.post("/webhooks/leads", response_model=LeadOut, tags=["leads"])
async def signed_lead_webhook(
    request: Request,
    tenant_id: str = Header(alias="X-Tenant-ID"),
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=200),
    timestamp: str = Header(alias="X-Webhook-Timestamp"),
    signature: str = Header(alias="X-Webhook-Signature"),
    db: Session = Depends(get_db),
) -> LeadOut:
    body = await request.body()
    if not verify_webhook(body, timestamp, signature):
        audit(
            db,
            "WEBHOOK_REJECTED",
            tenant_id=tenant_id,
            outcome="DENIED",
            reason_codes=["INVALID_SIGNATURE_OR_TIMESTAMP"],
        )
        db.commit()
        raise HTTPException(401, "Invalid webhook signature or timestamp")
    if not db.get(Tenant, tenant_id):
        raise HTTPException(404, "Tenant not found")
    payload = LeadIn.model_validate_json(body)
    lead, reasons = ingest_lead(db, tenant_id, payload, idempotency_key)
    return lead_out(lead, False, reasons)


@router.get("/leads", tags=["leads"])
def leads(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, Lead, context.tenant_id, cursor, limit)
    can_view = "*" in context.permissions or "view_contacts" in context.permissions
    if can_view:
        audit(
            db,
            "CONTACTS_VIEW",
            tenant_id=context.tenant_id,
            actor_user_id=context.user.id,
            safe_metadata={"record_count": len(items)},
        )
        db.commit()
    return {
        "items": [lead_out(item, can_view).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.post("/leads/{lead_id}/consent", tags=["consent"])
def change_consent(
    lead_id: str,
    payload: ConsentChange,
    context: TenantContext = Depends(require("write")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == context.tenant_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    event = ConsentEvent(
        tenant_id=context.tenant_id,
        lead_id=lead.id,
        event_type=payload.event_type,
        channels=payload.channels,
        text_version=payload.text_version,
        source=payload.source,
        evidence=payload.evidence,
        actor_user_id=context.user.id,
    )
    db.add(event)
    if payload.event_type in {"REVOKED", "MARKETING_OBJECTED"}:
        lead.status = LeadStatus.SUPPRESSED.value
        lead.allowed_channels = []
        if lead.contact_hash:
            for channel in payload.channels or ["ALL"]:
                existing = db.scalar(
                    select(SuppressionEntry).where(
                        SuppressionEntry.tenant_id == context.tenant_id,
                        SuppressionEntry.identity_hash == lead.contact_hash,
                        SuppressionEntry.channel == channel,
                    )
                )
                if not existing:
                    db.add(
                        SuppressionEntry(
                            tenant_id=context.tenant_id,
                            identity_hash=lead.contact_hash,
                            channel=channel,
                            reason=payload.event_type,
                        )
                    )
    elif payload.event_type == "CHANNELS_CHANGED":
        lead.allowed_channels = payload.channels
    audit(
        db,
        "CONSENT_CHANGE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="lead",
        entity_id=lead.id,
        reason_codes=[payload.event_type],
    )
    db.commit()
    return {
        "lead_id": lead.id,
        "status": lead.status,
        "allowed_channels": lead.allowed_channels,
        "event_id": event.id,
    }


@router.post("/policy/evaluate", response_model=PolicyResponse, tags=["compliance"])
def policy_evaluate(
    payload: PolicyRequest, context: TenantContext = Depends(require("read"))
) -> PolicyResponse:
    decision = evaluate_policy(PolicyInput(**payload.model_dump()))
    return PolicyResponse(**decision.__dict__)


@router.get("/companies", tags=["companies"])
def companies(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, Company, context.tenant_id, cursor, limit)
    return {
        "items": [
            {
                "id": item.id,
                "legal_name": item.legal_name,
                "domain": item.domain,
                "industry": item.industry,
                "icp_score": item.icp_score,
                "merge_confidence": item.merge_confidence,
                "merge_reasons": item.merge_reasons,
            }
            for item in items
        ],
        "next_cursor": next_cursor,
    }


@router.get("/company-signals", tags=["companies"])
def company_signals(
    cursor: str | None = None,
    limit: int = 25,
    context: TenantContext = Depends(require("read")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items, next_cursor = page_query(db, CompanySignal, context.tenant_id, cursor, limit)
    return {
        "items": [
            {
                "id": item.id,
                "company_id": item.company_id,
                "signal_type": item.signal_type,
                "title": item.title,
                "source_url": item.source_url,
                "signal_at": item.signal_at,
            }
            for item in items
        ],
        "next_cursor": next_cursor,
    }


@router.get("/business-contacts", tags=["companies"])
def business_contacts(
    context: TenantContext = Depends(require("read")), db: Session = Depends(get_db)
) -> dict[str, Any]:
    can_view = "*" in context.permissions or "view_contacts" in context.permissions
    items = list(
        db.scalars(
            select(BusinessContact).where(BusinessContact.tenant_id == context.tenant_id).limit(100)
        )
    )
    result = []
    for item in items:
        raw = decrypt_json({"ciphertext": item.value_encrypted})
        value = str(raw.get("value", ""))
        visible = (
            value
            if can_view
            else (mask_email(value) if item.kind == "EMAIL" else mask_phone(value))
        )
        result.append(
            {
                "id": item.id,
                "company_id": item.company_id,
                "kind": item.kind,
                "value": visible,
                "status": item.status,
                "source_url": item.source_url,
                "is_role_contact": item.is_role_contact,
            }
        )
    if can_view:
        audit(
            db,
            "BUSINESS_CONTACTS_VIEW",
            tenant_id=context.tenant_id,
            actor_user_id=context.user.id,
            safe_metadata={"record_count": len(result)},
        )
        db.commit()
    return {"items": result, "next_cursor": None}


@router.get("/opportunities", tags=["analytics"])
def opportunities(
    context: TenantContext = Depends(require("read")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    items = list(
        db.scalars(
            select(Opportunity)
            .where(Opportunity.tenant_id == context.tenant_id)
            .order_by(Opportunity.score.desc())
            .limit(100)
        )
    )
    return [
        {
            "id": item.id,
            "title": item.title,
            "market_type": item.market_type,
            "score": item.score,
            "factors": item.factors,
            "recommendation": item.recommendation,
        }
        for item in items
    ]


@router.get("/dashboard", tags=["analytics"])
def dashboard(
    context: TenantContext = Depends(require("read")), db: Session = Depends(get_db)
) -> dict[str, Any]:
    def count(model: type[Any], *conditions: Any) -> int:
        return int(
            db.scalar(
                select(func.count())
                .select_from(model)
                .where(model.tenant_id == context.tenant_id, *conditions)
            )
            or 0
        )

    statuses = {
        status_value: count(Lead, Lead.status == status_value)
        for status_value in [item.value for item in LeadStatus]
    }
    return {
        "competitors": count(Competitor, Competitor.active.is_(True)),
        "companies": count(Company),
        "signals": count(CompanySignal),
        "leads": count(Lead),
        "lead_statuses": statuses,
        "open_risks": count(DataSource, DataSource.status != ReviewStatus.APPROVED.value),
        "metrics_note": "Aggregated market signals are never counted as identified leads.",
    }


@router.get("/exports/leads.csv", tags=["exports"])
def export_leads(
    context: TenantContext = Depends(require("export")), db: Session = Depends(get_db)
) -> Response:
    records = list(
        db.scalars(
            select(Lead).where(
                Lead.tenant_id == context.tenant_id, Lead.status == LeadStatus.CONTACT_ALLOWED.value
            )
        )
    )
    output = io.StringIO(newline="")
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "id",
            "market_type",
            "source_type",
            "email",
            "phone",
            "allowed_channels",
            "score",
        ],
    )
    writer.writeheader()
    for lead in records:
        contact = decrypt_json(lead.contact_encrypted)
        writer.writerow(
            {
                "id": safe_csv_cell(lead.id),
                "market_type": safe_csv_cell(lead.market_type),
                "source_type": safe_csv_cell(lead.source_type),
                "email": safe_csv_cell(contact.get("email", "")),
                "phone": safe_csv_cell(contact.get("phone", "")),
                "allowed_channels": safe_csv_cell("|".join(lead.allowed_channels)),
                "score": lead.score,
            }
        )
    export = Export(
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        provider="csv",
        record_count=len(records),
        status="COMPLETED",
        filters={"status": LeadStatus.CONTACT_ALLOWED.value},
    )
    db.add(export)
    db.flush()
    audit(
        db,
        "LEADS_EXPORT",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="export",
        entity_id=export.id,
        safe_metadata={"record_count": len(records)},
    )
    db.commit()
    return Response(
        output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=leads.csv",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/audit", tags=["audit"])
def audit_log(
    context: TenantContext = Depends(require("manage_rules")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    items = list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.tenant_id == context.tenant_id)
            .order_by(AuditLog.created_at.desc())
            .limit(100)
        )
    )
    return [
        {
            "id": item.id,
            "action": item.action,
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "outcome": item.outcome,
            "reason_codes": item.reason_codes,
            "safe_metadata": item.safe_metadata,
            "created_at": item.created_at,
        }
        for item in items
    ]


@router.get("/consent/{lead_id}", tags=["consent"])
def consent_timeline(
    lead_id: str, context: TenantContext = Depends(require("read")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == context.tenant_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    events = list(
        db.scalars(
            select(ConsentEvent)
            .where(ConsentEvent.lead_id == lead.id, ConsentEvent.tenant_id == context.tenant_id)
            .order_by(ConsentEvent.occurred_at)
        )
    )
    return [
        {
            "id": item.id,
            "event_type": item.event_type,
            "channels": item.channels,
            "text_version": item.text_version,
            "source": item.source,
            "occurred_at": item.occurred_at,
        }
        for item in events
    ]


@router.get("/compliance-review", tags=["compliance"])
def compliance_review(
    context: TenantContext = Depends(require("manage_rules")), db: Session = Depends(get_db)
) -> dict[str, Any]:
    sources = list(
        db.scalars(
            select(DataSource)
            .where(
                DataSource.tenant_id == context.tenant_id,
                DataSource.status == ReviewStatus.REVIEW_REQUIRED.value,
            )
            .limit(50)
        )
    )
    contacts = list(
        db.scalars(
            select(BusinessContact)
            .where(
                BusinessContact.tenant_id == context.tenant_id,
                BusinessContact.status == ReviewStatus.REVIEW_REQUIRED.value,
            )
            .limit(50)
        )
    )
    leads = list(
        db.scalars(
            select(Lead)
            .where(Lead.tenant_id == context.tenant_id, Lead.status == LeadStatus.QUARANTINED.value)
            .limit(50)
        )
    )
    return {
        "sources": [
            {"id": item.id, "url": item.url, "reason": "SOURCE_REVIEW_REQUIRED"} for item in sources
        ],
        "business_contacts": [
            {
                "id": item.id,
                "company_id": item.company_id,
                "reason": "MARKETING_USE_REQUIRES_REVIEW",
            }
            for item in contacts
        ],
        "leads": [
            {
                "id": item.id,
                "source_type": item.source_type,
                "reason": list(item.quality.get("policy_reasons", [])),
            }
            for item in leads
        ],
    }


@router.get("/suppression", tags=["suppression"])
def suppression_list(
    context: TenantContext = Depends(require("manage_rules")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    items = list(
        db.scalars(
            select(SuppressionEntry)
            .where(SuppressionEntry.tenant_id == context.tenant_id)
            .order_by(SuppressionEntry.created_at.desc())
            .limit(100)
        )
    )
    return [
        {
            "id": item.id,
            "identity_hash": f"{item.identity_hash[:10]}…{item.identity_hash[-6:]}",
            "channel": item.channel,
            "reason": item.reason,
            "created_at": item.created_at,
        }
        for item in items
    ]


@router.get("/data-subject-requests", tags=["data-subject-requests"])
def data_subject_requests(
    context: TenantContext = Depends(require("manage_rules")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    items = list(
        db.scalars(
            select(DataSubjectRequest)
            .where(DataSubjectRequest.tenant_id == context.tenant_id)
            .order_by(DataSubjectRequest.created_at.desc())
            .limit(100)
        )
    )
    return [
        {
            "id": item.id,
            "request_type": item.request_type,
            "status": item.status,
            "assigned_to": item.assigned_to,
            "created_at": item.created_at,
            "result": item.result,
        }
        for item in items
    ]


@router.post("/data-subject-requests", status_code=201, tags=["data-subject-requests"])
def create_data_subject_request(
    payload: DSRCreate,
    context: TenantContext = Depends(require("manage_rules")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    item = DataSubjectRequest(
        tenant_id=context.tenant_id,
        request_type=payload.request_type,
        identity_hash=identity_hash(payload.identity),
        assigned_to=context.user.id,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        "DATA_SUBJECT_REQUEST_CREATE",
        tenant_id=context.tenant_id,
        actor_user_id=context.user.id,
        entity_type="data_subject_request",
        entity_id=item.id,
        safe_metadata={"request_type": payload.request_type},
    )
    db.commit()
    return {"id": item.id, "request_type": item.request_type, "status": item.status}


@router.get("/retention-policies", tags=["retention"])
def retention_policies(
    context: TenantContext = Depends(require("manage_rules")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    items = list(
        db.scalars(select(RetentionPolicy).where(RetentionPolicy.tenant_id == context.tenant_id))
    )
    return [
        {
            "id": item.id,
            "data_class": item.data_class,
            "retention_days": item.retention_days,
            "action": item.action,
        }
        for item in items
    ]


@router.get("/integrations", tags=["integrations"])
def integrations(
    context: TenantContext = Depends(require("manage_rules")), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    items = list(
        db.scalars(
            select(IntegrationConfig).where(IntegrationConfig.tenant_id == context.tenant_id)
        )
    )
    configured = [
        {
            "id": item.id,
            "provider_type": item.provider_type,
            "provider_name": item.provider_name,
            "secret_version": item.secret_version,
            "active": item.active,
        }
        for item in items
    ]
    return configured + [
        {"provider_type": "CRM_EXPORT", "provider_name": "CSV", "active": True, "mode": "local"},
        {
            "provider_type": "CRM_EXPORT",
            "provider_name": "Mock CRM",
            "active": True,
            "mode": "mock",
        },
        {
            "provider_type": "LLM_ANALYSIS",
            "provider_name": "Mock Analysis",
            "active": True,
            "mode": "mock",
        },
    ]


@router.post("/scoring/preview", tags=["scoring"])
def scoring_preview(
    factors: dict[str, float], context: TenantContext = Depends(require("read"))
) -> dict[str, Any]:
    try:
        result = additive_score(factors)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {
        "score": result.score,
        "factors": result.factors,
        "explanation": "Additive transparent score capped to 0..100",
    }
