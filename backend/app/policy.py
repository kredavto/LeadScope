from dataclasses import dataclass, field


@dataclass(frozen=True)
class PolicyInput:
    operator_country: str
    subject_country: str
    market_type: str
    source_type: str
    data_type: str
    purpose: str
    channel: str | None = None
    consent_quality: str = "NONE"
    sensitivity: str = "NORMAL"


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    reasons: list[str]
    required_evidence: list[str] = field(default_factory=list)
    retention_days: int = 365
    allowed_actions: list[str] = field(default_factory=list)


SENSITIVE = {"FINANCIAL", "HEALTH", "CHILDREN", "LEGAL", "OTHER_SENSITIVE"}


def evaluate_policy(data: PolicyInput) -> PolicyDecision:
    source = data.source_type.upper()
    data_type = data.data_type.upper()
    purpose = data.purpose.upper()

    if source == "REVIEW_AUTHOR":
        return PolicyDecision("BLOCK", ["REVIEW_AUTHOR_CONTACT_FORBIDDEN"], retention_days=0)
    if source in {"COMPETITOR_VISITOR", "COMPETITOR_CALLER"}:
        return PolicyDecision(
            "BLOCK", ["COMPETITOR_VISITOR_IDENTIFICATION_FORBIDDEN"], retention_days=0
        )
    if data.sensitivity.upper() in SENSITIVE and data.consent_quality != "VERIFIED":
        return PolicyDecision(
            "BLOCK",
            ["SENSITIVE_DATA_REQUIRES_VERIFIED_BASIS"],
            ["verified_explicit_consent", "compliance_review"],
            30,
        )
    if source == "PARTNER" and data.consent_quality != "VERIFIED":
        return PolicyDecision(
            "BLOCK",
            ["PARTNER_EVIDENCE_MISSING"],
            ["partner_id", "consent_timestamp", "consent_text_version", "proof_of_action"],
            30,
        )
    if data.market_type == "B2C" and "MARKETING" in purpose and data.consent_quality != "VERIFIED":
        return PolicyDecision(
            "BLOCK",
            ["B2C_COLD_OUTREACH_FORBIDDEN"],
            ["verified_consent", "allowed_channel"],
            30,
        )
    if source in {"FIRST_PARTY_FORM", "OWNED_CHAT", "OWNED_CALL_TRACKING", "AD_LEAD_FORM"}:
        if data.consent_quality == "VERIFIED" and data.channel:
            return PolicyDecision(
                "ALLOW",
                ["FIRST_PARTY_VERIFIED_CONSENT"],
                retention_days=365,
                allowed_actions=["STORE", "SCORE", "CONTACT", "EXPORT"],
            )
        return PolicyDecision(
            "BLOCK",
            ["FIRST_PARTY_EVIDENCE_INCOMPLETE"],
            ["consent_text", "consent_version", "timestamp", "proof_of_action"],
            30,
            ["STORE_QUARANTINED"],
        )
    if data_type == "COMPANY_PHONE":
        return PolicyDecision(
            "ALLOW",
            ["PUBLIC_COMPANY_DATA_STORAGE"],
            retention_days=365,
            allowed_actions=["STORE", "SCORE"],
        )
    if data_type in {"ROLE_EMAIL", "EMPLOYEE_PROFESSIONAL_CONTACT"}:
        return PolicyDecision(
            "REVIEW_REQUIRED",
            ["MARKETING_USE_REQUIRES_REVIEW"],
            ["source_url", "publication_date", "lawful_basis"],
            180,
            ["STORE", "SCORE", "REVIEW"],
        )
    return PolicyDecision(
        "REVIEW_REQUIRED",
        ["NO_EXPLICIT_POLICY_MATCH"],
        ["compliance_review"],
        90,
        ["STORE_QUARANTINED", "REVIEW"],
    )
