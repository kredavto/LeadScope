from dataclasses import dataclass


@dataclass(frozen=True)
class CompanyCandidate:
    domain: str | None = None
    registration_number: str | None = None
    normalized_name: str | None = None
    normalized_address: str | None = None
    confirmed_phone_hash: str | None = None


@dataclass(frozen=True)
class Resolution:
    should_merge: bool
    confidence: float
    reasons: list[str]


def resolve_company(left: CompanyCandidate, right: CompanyCandidate) -> Resolution:
    reasons: list[str] = []
    if left.registration_number and left.registration_number == right.registration_number:
        reasons.append("registration_number_exact")
    if left.domain and left.domain.casefold() == (right.domain or "").casefold():
        reasons.append("domain_exact")
    if left.confirmed_phone_hash and left.confirmed_phone_hash == right.confirmed_phone_hash:
        reasons.append("confirmed_company_phone")
    name_address = bool(
        left.normalized_name
        and left.normalized_name == right.normalized_name
        and left.normalized_address
        and left.normalized_address == right.normalized_address
    )
    if name_address:
        reasons.append("name_and_address_exact")
    strong = len(reasons)
    return Resolution(
        strong > 0,
        min(1.0, 0.72 + 0.1 * (strong - 1)) if strong else 0.2,
        reasons or ["insufficient_evidence"],
    )
