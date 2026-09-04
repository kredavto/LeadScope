import hashlib
import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import httpx

from app.config import settings


class CrawlBlocked(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


def canonicalize_url(url: str) -> str:
    parsed = urlsplit(url.strip())
    scheme = parsed.scheme.casefold()
    hostname = (parsed.hostname or "").casefold().rstrip(".")
    if scheme not in {"http", "https"} or not hostname:
        raise CrawlBlocked("INVALID_SCHEME", "Only absolute HTTP(S) URLs are allowed")
    port = parsed.port
    netloc = (
        hostname
        if not port or (scheme == "http" and port == 80) or (scheme == "https" and port == 443)
        else f"{hostname}:{port}"
    )
    path = parsed.path or "/"
    return urlunsplit((scheme, netloc, path, parsed.query, ""))


def validate_resolved_ips(hostname: str, resolved: list[str]) -> None:
    if not resolved:
        raise CrawlBlocked("DNS_EMPTY", "Domain has no resolved addresses")
    for raw in resolved:
        ip = ipaddress.ip_address(raw)
        if (
            not ip.is_global
            or ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
        ):
            raise CrawlBlocked("SSRF_BLOCKED", "Target resolves to a non-public network")


def resolve_public(hostname: str) -> list[str]:
    lowered = hostname.casefold().rstrip(".")
    if lowered in {"localhost", "localhost.localdomain"} or lowered.endswith(".localhost"):
        raise CrawlBlocked("SSRF_BLOCKED", "Localhost is forbidden")
    try:
        addresses = sorted({str(item[4][0]) for item in socket.getaddrinfo(lowered, None)})
    except socket.gaierror as exc:
        raise CrawlBlocked("DNS_FAILED", "Domain resolution failed") from exc
    validate_resolved_ips(lowered, addresses)
    return addresses


def validate_public_url(url: str, resolver=resolve_public) -> tuple[str, list[str]]:  # type: ignore[no-untyped-def]
    canonical = canonicalize_url(url)
    hostname = urlsplit(canonical).hostname or ""
    addresses = resolver(hostname)
    validate_resolved_ips(hostname, addresses)
    return canonical, addresses


def validate_redirect(
    current_url: str,
    location: str,
    resolver=resolve_public,  # type: ignore[no-untyped-def]
) -> tuple[str, list[str]]:
    return validate_public_url(urljoin(current_url, location), resolver=resolver)


@dataclass(frozen=True)
class FetchResult:
    url: str
    status_code: int
    content: bytes
    content_hash: str
    etag: str | None
    last_modified: str | None


async def fetch_allowed(url: str) -> FetchResult:
    current, pinned_addresses = validate_public_url(url)
    headers = {
        "User-Agent": settings.crawler_user_agent,
        "Accept": "text/html,application/xhtml+xml",
    }
    async with httpx.AsyncClient(follow_redirects=False, timeout=15.0, headers=headers) as client:
        for _ in range(settings.max_redirects + 1):
            hostname = urlsplit(current).hostname or ""
            fresh_addresses = resolve_public(hostname)
            if set(fresh_addresses) != set(pinned_addresses):
                raise CrawlBlocked("DNS_REBINDING", "DNS answer changed during request")
            response = await client.get(current)
            if response.status_code in {401, 403}:
                raise CrawlBlocked("ACCESS_DENIED", "Remote resource denied automated access")
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location")
                if not location:
                    raise CrawlBlocked("INVALID_REDIRECT", "Redirect has no location")
                current, pinned_addresses = validate_redirect(current, location)
                continue
            content_type = response.headers.get("content-type", "").split(";", 1)[0].casefold()
            if content_type not in settings.allowed_content_types:
                raise CrawlBlocked("CONTENT_TYPE_BLOCKED", "Only HTML content is accepted")
            content = response.content
            if len(content) > settings.max_response_bytes:
                raise CrawlBlocked("RESPONSE_TOO_LARGE", "Response exceeds configured limit")
            if b"captcha" in content[:100_000].lower():
                raise CrawlBlocked("CAPTCHA_DETECTED", "CAPTCHA encountered; bypass is forbidden")
            return FetchResult(
                current,
                response.status_code,
                content,
                hashlib.sha256(content).hexdigest(),
                response.headers.get("etag"),
                response.headers.get("last-modified"),
            )
    raise CrawlBlocked("TOO_MANY_REDIRECTS", "Redirect limit exceeded")


async def robots_allows(url: str) -> bool:
    canonical, _ = validate_public_url(url)
    parsed = urlsplit(canonical)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    async with httpx.AsyncClient(
        timeout=10, headers={"User-Agent": settings.crawler_user_agent}
    ) as client:
        response = await client.get(robots_url)
    if response.status_code in {401, 403}:
        return False
    if response.status_code >= 400:
        return True
    return robots_text_allows(response.text, canonical, robots_url)


def robots_text_allows(
    robots_text: str, url: str, robots_url: str = "https://example.com/robots.txt"
) -> bool:
    parser = RobotFileParser()
    parser.set_url(robots_url)
    parser.parse(robots_text.splitlines())
    return parser.can_fetch(settings.crawler_user_agent, url)
