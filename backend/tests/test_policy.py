import pytest

from app.policy import PolicyInput, evaluate_policy
from app.scoring import additive_score


@pytest.mark.parametrize("source", ["REVIEW_AUTHOR", "COMPETITOR_VISITOR", "COMPETITOR_CALLER"])
def test_forbidden_sources_are_blocked(source: str) -> None:
    result = evaluate_policy(PolicyInput("RU", "RU", "B2C", source, "PERSON_CONTACT", "MARKETING"))
    assert result.decision == "BLOCK"


def test_verified_first_party_channel_is_allowed() -> None:
    result = evaluate_policy(
        PolicyInput(
            "RU",
            "RU",
            "B2C",
            "FIRST_PARTY_FORM",
            "PERSON_CONTACT",
            "MARKETING",
            "EMAIL",
            "VERIFIED",
        )
    )
    assert result.decision == "ALLOW"
    assert "EXPORT" in result.allowed_actions


def test_sensitive_scoring_factor_rejected() -> None:
    with pytest.raises(ValueError):
        additive_score({"intent": 10, "health": 5})
