from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Membership, Role, User
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

ROLE_PERMISSIONS: dict[str, set[str]] = {
    Role.OWNER.value: {"*"},
    Role.ADMIN.value: {"read", "write", "export", "manage_rules", "view_contacts", "delete"},
    Role.ANALYST.value: {"read", "write", "run_crawl"},
    Role.SALES.value: {"read", "view_contacts", "export"},
    Role.COMPLIANCE.value: {"read", "view_contacts", "manage_rules", "delete", "export"},
    Role.VIEWER.value: {"read"},
}


@dataclass(frozen=True)
class TenantContext:
    user: User
    tenant_id: str
    role: str
    permissions: set[str]


def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        user_id = decode_token(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Inactive user")
    return user


def tenant_context(
    tenant_id: str = Header(alias="X-Tenant-ID"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> TenantContext:
    membership = db.scalar(
        select(Membership).where(Membership.tenant_id == tenant_id, Membership.user_id == user.id)
    )
    if not membership:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tenant access denied")
    permissions = ROLE_PERMISSIONS.get(membership.role, set()).union(membership.permissions)
    return TenantContext(user, tenant_id, membership.role, permissions)


def require(permission: str):  # type: ignore[no-untyped-def]
    def checker(context: TenantContext = Depends(tenant_context)) -> TenantContext:
        if "*" not in context.permissions and permission not in context.permissions:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Permission required: {permission}")
        return context

    return checker
