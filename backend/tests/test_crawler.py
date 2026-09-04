import pytest

from app.crawler import (
    CrawlBlocked,
    canonicalize_url,
    robots_text_allows,
    validate_public_url,
    validate_redirect,
    validate_resolved_ips,
)


@pytest.mark.parametrize(
    "target", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "224.0.0.1"]
)
def test_ssrf_private_and_metadata_addresses_blocked(target: str) -> None:
    with pytest.raises(CrawlBlocked) as caught:
        validate_resolved_ips("attacker.example", [target])
    assert caught.value.code == "SSRF_BLOCKED"


def test_non_http_scheme_blocked() -> None:
    with pytest.raises(CrawlBlocked):
        canonicalize_url("file:///etc/passwd")


def test_dns_rebinding_style_private_answer_blocked() -> None:
    def rebinding_resolver(_: str) -> list[str]:
        return ["127.0.0.1"]

    with pytest.raises(CrawlBlocked):
        validate_public_url("https://public.example", resolver=rebinding_resolver)


def test_redirect_to_metadata_address_is_blocked() -> None:
    def metadata_resolver(_: str) -> list[str]:
        return ["169.254.169.254"]

    with pytest.raises(CrawlBlocked):
        validate_redirect(
            "https://public.example/start",
            "http://169.254.169.254/latest/meta-data",
            resolver=metadata_resolver,
        )


def test_url_is_canonicalized() -> None:
    assert canonicalize_url("HTTPS://EXAMPLE.COM:443/path#secret") == "https://example.com/path"


def test_robots_disallow_is_enforced() -> None:
    robots = "User-agent: *\nDisallow: /private\nAllow: /public"
    assert not robots_text_allows(robots, "https://example.com/private/report")
    assert robots_text_allows(robots, "https://example.com/public")
