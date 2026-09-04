from app.resolver import CompanyCandidate, resolve_company


def test_similar_name_alone_does_not_merge() -> None:
    result = resolve_company(
        CompanyCandidate(normalized_name="acme"), CompanyCandidate(normalized_name="acme")
    )
    assert not result.should_merge


def test_domain_merges_with_reason() -> None:
    result = resolve_company(
        CompanyCandidate(domain="example.com"), CompanyCandidate(domain="EXAMPLE.com")
    )
    assert result.should_merge
    assert "domain_exact" in result.reasons
