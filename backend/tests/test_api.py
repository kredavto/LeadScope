from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DataSource, Membership, Role, Tenant, User
from app.security import create_token, hash_password


def test_tenant_isolation(client: TestClient, db: Session, auth: dict[str, str]) -> None:
    tenant_b = Tenant(name="Tenant B", country="RU")
    db.add(tenant_b)
    db.commit()
    response = client.get("/api/v1/competitors", headers={**auth, "X-Tenant-ID": tenant_b.id})
    assert response.status_code == 403


def test_refresh_cookie_is_rotated(client: TestClient, db: Session) -> None:
    user = User(
        email="login@example.com",
        password_hash=hash_password("long-test-password"),
        display_name="Login user",
    )
    db.add(user)
    db.commit()
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "long-test-password"},
    )
    assert logged_in.status_code == 200
    old_refresh = client.cookies.get("refresh_token")
    csrf = client.cookies.get("csrf_token")
    refreshed = client.post("/api/v1/auth/refresh", headers={"X-CSRF-Token": csrf or ""})
    assert refreshed.status_code == 200
    assert client.cookies.get("refresh_token") != old_refresh


def test_partner_without_evidence_is_quarantined(client: TestClient, auth: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/leads",
        headers={**auth, "Idempotency-Key": "partner-001"},
        json={
            "market_type": "B2C",
            "source_type": "PARTNER",
            "contact": {"email": "person@example.com"},
            "purpose": "MARKETING",
            "allowed_channels": [],
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "QUARANTINED"

    exported = client.get("/api/v1/exports/leads.csv", headers=auth)
    assert exported.status_code == 200
    assert "person@example.com" not in exported.text


def test_idempotent_ingestion(client: TestClient, auth: dict[str, str]) -> None:
    payload = {
        "market_type": "B2C",
        "source_type": "FIRST_PARTY_FORM",
        "contact": {"email": "person@example.com"},
        "purpose": "MARKETING",
        "consent_text": "ok",
        "consent_version": "v1",
        "consent_timestamp": datetime.now(UTC).isoformat(),
        "consent_evidence": {"action": "checked"},
        "allowed_channels": ["EMAIL"],
    }
    headers = {**auth, "Idempotency-Key": "same-request"}
    first = client.post("/api/v1/leads", headers=headers, json=payload)
    second = client.post("/api/v1/leads", headers=headers, json=payload)
    assert first.json()["id"] == second.json()["id"]


def test_revocation_suppresses_lead(client: TestClient, auth: dict[str, str]) -> None:
    payload = {
        "market_type": "B2C",
        "source_type": "FIRST_PARTY_FORM",
        "contact": {"email": "revoke@example.com"},
        "purpose": "MARKETING",
        "consent_text": "ok",
        "consent_version": "v1",
        "consent_timestamp": datetime.now(UTC).isoformat(),
        "consent_evidence": {"action": "checked"},
        "allowed_channels": ["EMAIL"],
    }
    created = client.post(
        "/api/v1/leads", headers={**auth, "Idempotency-Key": "revoke-001"}, json=payload
    ).json()
    response = client.post(
        f"/api/v1/leads/{created['id']}/consent",
        headers=auth,
        json={
            "event_type": "REVOKED",
            "channels": ["EMAIL"],
            "source": "self-service",
            "evidence": {"request_id": "r1"},
        },
    )
    assert response.json()["status"] == "SUPPRESSED"
    assert response.json()["allowed_channels"] == []


def test_viewer_cannot_export(client: TestClient, db: Session) -> None:
    tenant = Tenant(name="Read only", country="RU")
    user = User(
        email="viewer@example.com",
        password_hash=hash_password("long-test-password"),
        display_name="Viewer",
    )
    db.add_all([tenant, user])
    db.flush()
    db.add(Membership(tenant_id=tenant.id, user_id=user.id, role=Role.VIEWER.value))
    db.commit()
    response = client.get(
        "/api/v1/exports/leads.csv",
        headers={"Authorization": f"Bearer {create_token(user.id)}", "X-Tenant-ID": tenant.id},
    )
    assert response.status_code == 403


def test_unapproved_source_cannot_be_crawled(
    client: TestClient, db: Session, auth: dict[str, str]
) -> None:
    source = DataSource(
        tenant_id=auth["X-Tenant-ID"],
        source_type="PUBLIC_COMPANY_SITE",
        url="https://example.com",
        scan_allowed=True,
        status="REVIEW_REQUIRED",
    )
    db.add(source)
    db.commit()
    response = client.post(
        "/api/v1/crawl-jobs",
        headers=auth,
        json={"source_id": source.id, "start_url": "https://example.com"},
    )
    assert response.status_code == 403
