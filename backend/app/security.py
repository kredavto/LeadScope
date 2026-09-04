import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_token(
    subject: str,
    token_type: str = "access",  # noqa: S107 - token category, not a password
) -> str:
    minutes = settings.access_token_minutes
    expires = datetime.now(UTC) + (
        timedelta(minutes=minutes)
        if token_type == "access"  # noqa: S105 - token category, not a secret
        else timedelta(days=settings.refresh_token_days)
    )
    payload = {
        "sub": subject,
        "type": token_type,
        "jti": secrets.token_urlsafe(16),
        "iat": datetime.now(UTC),
        "exp": expires,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str, expected_type: str = "access") -> str:
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    if payload.get("type") != expected_type or not payload.get("sub"):
        raise jwt.InvalidTokenError("Unexpected token type")
    return str(payload["sub"])


def _fernet() -> Fernet:
    material = settings.field_encryption_key or settings.secret_key
    key = base64.urlsafe_b64encode(hashlib.sha256(material.encode()).digest())
    return Fernet(key)


def encrypt_json(value: dict[str, Any]) -> dict[str, str]:
    token = _fernet().encrypt(json.dumps(value, ensure_ascii=False).encode()).decode()
    return {"ciphertext": token, "version": "v1"}


def decrypt_json(value: dict[str, Any]) -> dict[str, Any]:
    try:
        raw = _fernet().decrypt(str(value["ciphertext"]).encode())
        return dict(json.loads(raw))
    except (InvalidToken, KeyError, TypeError, json.JSONDecodeError):
        return {}


def identity_hash(value: str) -> str:
    normalized = "".join(value.casefold().split())
    return hmac.new(
        settings.suppression_pepper.encode(), normalized.encode(), hashlib.sha256
    ).hexdigest()


def verify_webhook(
    body: bytes, timestamp: str, signature: str, tolerance_seconds: int = 300
) -> bool:
    try:
        sent_at = datetime.fromtimestamp(int(timestamp), tz=UTC)
    except (ValueError, OSError):
        return False
    if abs((datetime.now(UTC) - sent_at).total_seconds()) > tolerance_seconds:
        return False
    expected = hmac.new(
        settings.webhook_secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def mask_email(value: str) -> str:
    if "@" not in value:
        return "••••"
    local, domain = value.split("@", 1)
    return f"{local[:1]}•••@{domain}"


def mask_phone(value: str) -> str:
    digits = "".join(character for character in value if character.isdigit())
    return f"+••• ••• •• {digits[-2:]}" if digits else "••••"


def safe_csv_cell(value: object) -> str:
    text = str(value or "")
    return "'" + text if text.startswith(("=", "+", "-", "@", "\t", "\r")) else text
