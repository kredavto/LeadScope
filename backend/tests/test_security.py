import hashlib
import hmac
import time

from app.config import settings
from app.security import decrypt_json, encrypt_json, safe_csv_cell, verify_webhook


def test_encryption_roundtrip() -> None:
    value = {"email": "private@example.com"}
    assert decrypt_json(encrypt_json(value)) == value


def test_csv_formula_injection() -> None:
    assert safe_csv_cell("=HYPERLINK('bad')").startswith("'=")
    assert safe_csv_cell("normal") == "normal"


def test_signed_webhook_validation() -> None:
    body = b'{"event":"test"}'
    timestamp = str(int(time.time()))
    signature = hmac.new(
        settings.webhook_secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    assert verify_webhook(body, timestamp, signature)
    assert not verify_webhook(body + b"x", timestamp, signature)
