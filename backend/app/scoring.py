from dataclasses import dataclass

SENSITIVE_FACTORS = {"health", "religion", "ethnicity", "biometric", "political", "children"}


@dataclass(frozen=True)
class ScoreResult:
    score: float
    factors: dict[str, float]


def additive_score(
    factors: dict[str, float], penalties: dict[str, float] | None = None
) -> ScoreResult:
    if SENSITIVE_FACTORS.intersection(key.casefold() for key in factors):
        raise ValueError("Sensitive factors cannot be used for scoring")
    penalty_values = penalties or {}
    score = sum(factors.values()) - sum(abs(value) for value in penalty_values.values())
    explanation = {
        **factors,
        **{f"penalty:{key}": -abs(value) for key, value in penalty_values.items()},
    }
    return ScoreResult(round(max(0, min(100, score)), 2), explanation)


def opportunity_score(factors: dict[str, float]) -> ScoreResult:
    required = {
        "demand",
        "commercial_intent",
        "competitor_gap",
        "expected_margin",
        "data_confidence",
    }
    missing = required.difference(factors)
    if missing:
        raise ValueError(f"Missing opportunity factors: {', '.join(sorted(missing))}")
    normalized = 1.0
    for key in required:
        normalized *= max(0, min(1, factors[key]))
    return ScoreResult(round(normalized * 100, 2), factors)
