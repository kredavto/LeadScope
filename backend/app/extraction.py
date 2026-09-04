import hashlib
import json
import re
from dataclasses import dataclass
from html import unescape
from typing import Any

from bs4 import BeautifulSoup
from bs4.element import Tag

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\s()\-.]*){9,15}(?!\d)")
PRICE_RE = re.compile(
    r"(?P<price>\d[\d\s.,]{1,14})\s*(?P<currency>₽|руб\.?|RUB|USD|\$|EUR|€)", re.IGNORECASE
)
ROLE_PREFIXES = {"info", "sales", "support", "hello", "office", "procurement", "contact", "service"}


@dataclass(frozen=True)
class Fact:
    fact_type: str
    value: dict[str, Any]
    confidence: float


def sanitize_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style", "iframe", "object", "embed", "form"]):
        element.decompose()
    for tag in soup.find_all(True):
        if not isinstance(tag, Tag):
            continue
        for attribute in list(tag.attrs):
            if attribute.casefold().startswith("on") or attribute.casefold() in {"srcdoc", "style"}:
                del tag.attrs[attribute]
    return str(soup)


def redact_review(text: str) -> str:
    safe = EMAIL_RE.sub("[email удалён]", text)
    safe = PHONE_RE.sub("[телефон удалён]", safe)
    safe = re.sub(r"https?://\S+", "[ссылка удалена]", safe)
    return safe[:300].strip()


def extract_facts(html: str) -> list[Fact]:
    soup = BeautifulSoup(html, "html.parser")
    facts: list[Fact] = []
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(script.get_text(strip=True))
            facts.append(Fact("JSON_LD", {"data": data}, 0.9))
        except (json.JSONDecodeError, TypeError):
            continue
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    if title:
        facts.append(Fact("PAGE_TITLE", {"text": unescape(title)[:300]}, 0.95))
    text = soup.get_text(" ", strip=True)
    for match in PRICE_RE.finditer(text):
        normalized = match.group("price").replace(" ", "").replace(",", ".")
        try:
            value = float(normalized)
        except ValueError:
            continue
        facts.append(Fact("PRICE", {"amount": value, "currency": match.group("currency")}, 0.7))
    for email in sorted(set(EMAIL_RE.findall(text))):
        local = email.split("@", 1)[0].casefold()
        if local in ROLE_PREFIXES:
            facts.append(Fact("ROLE_EMAIL", {"email": email.casefold()}, 0.85))
    return facts


def source_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()
