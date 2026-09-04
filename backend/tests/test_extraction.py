from app.extraction import extract_facts, redact_review, sanitize_html


def test_json_ld_price_and_role_email_extraction() -> None:
    html = (
        '<html><head><title>Service</title><script type="application/ld+json">'
        '{"@type":"Product","name":"Repair"}</script></head>'
        "<body>Цена 7 500 ₽, sales@example.com, ivan@example.com</body></html>"
    )
    facts = extract_facts(html)
    types = [fact.fact_type for fact in facts]
    assert "JSON_LD" in types
    assert "PRICE" in types
    assert [fact.value["email"] for fact in facts if fact.fact_type == "ROLE_EMAIL"] == [
        "sales@example.com"
    ]


def test_review_pii_redaction() -> None:
    safe = redact_review(
        "Иван: пишите ivan@example.com или +7 (999) 123-45-67 https://profile.example"
    )
    assert "ivan@example.com" not in safe
    assert "999" not in safe
    assert "https://" not in safe


def test_html_sanitization() -> None:
    clean = sanitize_html(
        '<div onclick="steal()">ok<script>alert(1)</script><iframe src="x"></iframe></div>'
    )
    assert "onclick" not in clean
    assert "script" not in clean
    assert "iframe" not in clean
