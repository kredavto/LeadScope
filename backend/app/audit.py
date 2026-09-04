from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def audit(
    db: Session,
    action: str,
    *,
    tenant_id: str | None = None,
    actor_user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    outcome: str = "SUCCESS",
    reason_codes: list[str] | None = None,
    safe_metadata: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        outcome=outcome,
        reason_codes=reason_codes or [],
        safe_metadata=safe_metadata or {},
    )
    db.add(entry)
    return entry
