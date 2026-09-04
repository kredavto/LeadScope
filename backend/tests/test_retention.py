from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Lead, LeadEvent, Tenant
from app.security import encrypt_json, identity_hash
from app.tasks import apply_retention_in_session


def test_expired_lead_is_anonymized_but_suppression_hash_remains(db: Session) -> None:
    tenant = Tenant(name="Retention test", country="RU")
    db.add(tenant)
    db.flush()
    lead = Lead(
        tenant_id=tenant.id,
        market_type="B2C",
        source_type="FIRST_PARTY_FORM",
        contact_encrypted=encrypt_json({"email": "expired@example.com"}),
        contact_hash=identity_hash("expired@example.com"),
        status="CONTACT_ALLOWED",
        purpose="MARKETING",
        allowed_channels=["EMAIL"],
        idempotency_key="expired-001",
        retained_until=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(lead)
    db.commit()

    assert apply_retention_in_session(db, datetime.now(UTC)) == 1
    db.refresh(lead)
    assert lead.contact_encrypted["version"] == "deleted"
    assert lead.contact_hash
    assert lead.status == "SUPPRESSED"
    event = db.scalar(select(LeadEvent).where(LeadEvent.lead_id == lead.id))
    assert event and event.event_type == "RETENTION_ANONYMIZED"
