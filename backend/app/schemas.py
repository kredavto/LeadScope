from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth token type, not a secret
    expires_in: int


class TenantOut(ORMModel):
    id: str
    name: str
    country: str


class NicheOut(ORMModel):
    id: str
    market_type: str
    name: str
    version: str
    sensitivity: str
    config: dict[str, Any]


class NicheCreate(BaseModel):
    market_type: Literal["B2C", "B2B"]
    name: str = Field(min_length=2, max_length=200)
    version: str = Field(default="1.0", max_length=30)
    countries: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    sensitivity: Literal[
        "NORMAL", "FINANCIAL", "HEALTH", "CHILDREN", "LEGAL", "OTHER_SENSITIVE"
    ] = "NORMAL"
    config: dict[str, Any] = Field(default_factory=dict)
    retention_days: int = Field(default=365, ge=1, le=3650)


class DSRCreate(BaseModel):
    request_type: Literal[
        "ACCESS", "CORRECTION", "EXPORT", "RESTRICTION", "CONSENT_WITHDRAWAL", "DELETE"
    ]
    identity: str = Field(min_length=3, max_length=320)


class CompetitorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    domain: str = Field(min_length=4, max_length=255)
    niche_template_id: str | None = None
    region: str | None = Field(default=None, max_length=160)

    @field_validator("domain")
    @classmethod
    def clean_domain(cls, value: str) -> str:
        return value.casefold().removeprefix("https://").removeprefix("http://").strip("/")


class CompetitorOut(ORMModel):
    id: str
    name: str
    domain: str
    region: str | None
    active: bool


class SourceCreate(BaseModel):
    source_type: str = Field(max_length=64)
    url: HttpUrl
    owner: str | None = Field(default=None, max_length=200)
    country: str = Field(default="RU", min_length=2, max_length=2)
    legal_basis: str | None = Field(default=None, max_length=160)
    terms_url: HttpUrl | None = None
    scan_allowed: bool = False
    contains_personal_data: bool = False


class SourceOut(ORMModel):
    id: str
    source_type: str
    url: str
    country: str
    robots_status: str
    scan_allowed: bool
    trust_score: float
    status: str


class CrawlJobCreate(BaseModel):
    source_id: str
    start_url: HttpUrl
    max_depth: int = Field(default=2, ge=0, le=5)
    max_pages: int = Field(default=100, ge=1, le=1000)
    deny_patterns: list[str] = Field(default_factory=list, max_length=100)


class LeadIn(BaseModel):
    market_type: Literal["B2C", "B2B"]
    source_type: Literal[
        "FIRST_PARTY_FORM",
        "OWNED_CHAT",
        "OWNED_CALL_TRACKING",
        "AD_LEAD_FORM",
        "CRM_WEBHOOK",
        "PARTNER",
        "REVIEW_AUTHOR",
    ]
    contact: dict[str, str]
    purpose: str = Field(min_length=2, max_length=160)
    legal_basis: str | None = Field(default=None, max_length=160)
    consent_text: str | None = Field(default=None, max_length=10_000)
    consent_version: str | None = Field(default=None, max_length=64)
    consent_timestamp: datetime | None = None
    consent_evidence: dict[str, Any] = Field(default_factory=dict)
    allowed_channels: list[Literal["EMAIL", "PHONE", "SMS", "MESSENGER"]] = Field(
        default_factory=list
    )
    retained_until: datetime | None = None
    form_url: HttpUrl | None = None
    partner_id: str | None = Field(default=None, max_length=200)
    utm: dict[str, str] = Field(default_factory=dict)
    campaign_id: str | None = Field(default=None, max_length=200)
    quality: dict[str, Any] = Field(default_factory=dict)

    @field_validator("contact")
    @classmethod
    def reject_sensitive_fields(cls, value: dict[str, str]) -> dict[str, str]:
        forbidden = {"health", "diagnosis", "religion", "ethnicity", "biometric", "child"}
        if forbidden.intersection(key.casefold() for key in value):
            raise ValueError("Sensitive contact attributes are forbidden")
        return value


class LeadOut(BaseModel):
    id: str
    market_type: str
    source_type: str
    status: str
    purpose: str
    allowed_channels: list[str]
    received_at: datetime
    score: float
    masked_contact: dict[str, str]
    policy_reasons: list[str] = Field(default_factory=list)


class ConsentChange(BaseModel):
    event_type: Literal["GRANTED", "CHANNELS_CHANGED", "REVOKED", "MARKETING_OBJECTED"]
    channels: list[str] = Field(default_factory=list)
    text_version: str | None = None
    source: str = Field(min_length=2, max_length=2048)
    evidence: dict[str, Any] = Field(default_factory=dict)


class PolicyRequest(BaseModel):
    operator_country: str = "RU"
    subject_country: str = "RU"
    market_type: Literal["B2C", "B2B"]
    source_type: str
    data_type: str
    purpose: str
    channel: str | None = None
    consent_quality: Literal["NONE", "INCOMPLETE", "VERIFIED"] = "NONE"
    sensitivity: str = "NORMAL"


class PolicyResponse(BaseModel):
    decision: Literal["ALLOW", "REVIEW_REQUIRED", "BLOCK"]
    reasons: list[str]
    required_evidence: list[str]
    retention_days: int
    allowed_actions: list[str]


class PageInfo(BaseModel):
    next_cursor: str | None
    items: list[Any]
