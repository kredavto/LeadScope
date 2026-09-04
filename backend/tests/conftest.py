import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-definitely-long-enough"  # noqa: S105
os.environ["SUPPRESSION_PEPPER"] = "test-pepper"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Membership, Role, Tenant, User
from app.security import create_token, hash_password


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    yield session
    session.close()


@pytest.fixture()
def client(db: Session) -> TestClient:
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth(db: Session) -> dict[str, str]:
    tenant = Tenant(name="Tenant A", country="RU")
    user = User(
        email="owner@example.com",
        password_hash=hash_password("long-test-password"),
        display_name="Owner",
    )
    db.add_all([tenant, user])
    db.flush()
    db.add(Membership(tenant_id=tenant.id, user_id=user.id, role=Role.OWNER.value))
    db.commit()
    return {"Authorization": f"Bearer {create_token(user.id)}", "X-Tenant-ID": tenant.id}
