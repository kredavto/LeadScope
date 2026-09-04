import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


def new_id() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    SALES = "SALES"
    COMPLIANCE = "COMPLIANCE"
    VIEWER = "VIEWER"


class ReviewStatus(str, enum.Enum):
    APPROVED = "APPROVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    BLOCKED = "BLOCKED"


class LeadStatus(str, enum.Enum):
    CONTACT_ALLOWED = "CONTACT_ALLOWED"
    QUARANTINED = "QUARANTINED"
    BLOCKED = "BLOCKED"
    SUPPRESSED = "SUPPRESSED"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    country: Mapped[str] = mapped_column(String(2), default="RU")
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    display_name: Mapped[str] = mapped_column(String(160))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Membership(Base, TimestampMixin):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("tenant_id", "user_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32), default=Role.VIEWER.value)
    permissions: Mapped[list[str]] = mapped_column(JSON, default=list)


class RoleDefinition(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str | None] = mapped_column(
        ForeignKey("tenants.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(32))
    permissions: Mapped[list[str]] = mapped_column(JSON, default=list)


class NicheTemplate(Base, TimestampMixin):
    __tablename__ = "niche_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str | None] = mapped_column(
        ForeignKey("tenants.id"), nullable=True, index=True
    )
    market_type: Mapped[str] = mapped_column(String(3), index=True)
    name: Mapped[str] = mapped_column(String(200))
    version: Mapped[str] = mapped_column(String(30), default="1.0")
    countries: Mapped[list[str]] = mapped_column(JSON, default=list)
    regions: Mapped[list[str]] = mapped_column(JSON, default=list)
    sensitivity: Mapped[str] = mapped_column(String(32), default="NORMAL")
    config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    retention_days: Mapped[int] = mapped_column(Integer, default=365)


class JurisdictionPolicy(Base, TimestampMixin):
    __tablename__ = "jurisdiction_policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str | None] = mapped_column(
        ForeignKey("tenants.id"), nullable=True, index=True
    )
    country: Mapped[str] = mapped_column(String(2), index=True)
    version: Mapped[str] = mapped_column(String(30))
    rules: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Competitor(Base, TimestampMixin):
    __tablename__ = "competitors"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    niche_template_id: Mapped[str | None] = mapped_column(
        ForeignKey("niche_templates.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200))
    domain: Mapped[str] = mapped_column(String(255))
    region: Mapped[str | None] = mapped_column(String(160), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Domain(Base, TimestampMixin):
    __tablename__ = "domains"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    hostname: Mapped[str] = mapped_column(String(255), index=True)
    canonical_url: Mapped[str] = mapped_column(String(2048))
    robots_status: Mapped[str] = mapped_column(String(32), default="UNKNOWN")


class DataSource(Base, TimestampMixin):
    __tablename__ = "data_sources"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(64))
    url: Mapped[str] = mapped_column(String(2048))
    owner: Mapped[str | None] = mapped_column(String(200), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="RU")
    legal_basis: Mapped[str | None] = mapped_column(String(160), nullable=True)
    terms_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    robots_status: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    scan_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    contains_personal_data: Mapped[bool] = mapped_column(Boolean, default=False)
    trust_score: Mapped[float] = mapped_column(Float, default=0.5)
    status: Mapped[str] = mapped_column(String(32), default=ReviewStatus.REVIEW_REQUIRED.value)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CrawlJob(Base, TimestampMixin):
    __tablename__ = "crawl_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("data_sources.id"), index=True)
    start_url: Mapped[str] = mapped_column(String(2048))
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    schedule: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_depth: Mapped[int] = mapped_column(Integer, default=2)
    max_pages: Mapped[int] = mapped_column(Integer, default=100)
    deny_patterns: Mapped[list[str]] = mapped_column(JSON, default=list)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CrawlRun(Base, TimestampMixin):
    __tablename__ = "crawl_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("crawl_jobs.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="QUEUED")
    pages_seen: Mapped[int] = mapped_column(Integer, default=0)
    pages_changed: Mapped[int] = mapped_column(Integer, default=0)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Page(Base, TimestampMixin):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("tenant_id", "canonical_url"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("data_sources.id"), index=True)
    canonical_url: Mapped[str] = mapped_column(String(2048))
    page_type: Mapped[str] = mapped_column(String(64), default="UNKNOWN")
    language: Mapped[str | None] = mapped_column(String(12), nullable=True)
    http_status: Mapped[int] = mapped_column(Integer, default=200)


class PageSnapshot(Base):
    __tablename__ = "page_snapshots"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    page_id: Mapped[str] = mapped_column(ForeignKey("pages.id"), index=True)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    etag: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_modified: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sanitized_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExtractedFact(Base):
    __tablename__ = "extracted_facts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    page_id: Mapped[str] = mapped_column(ForeignKey("pages.id"), index=True)
    fact_type: Mapped[str] = mapped_column(String(64), index=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSON)
    source_url: Mapped[str] = mapped_column(String(2048))
    content_hash: Mapped[str] = mapped_column(String(64))
    extractor_version: Mapped[str] = mapped_column(String(30), default="deterministic-1.0")
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Company(Base, TimestampMixin):
    __tablename__ = "companies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    legal_name: Mapped[str] = mapped_column(String(250))
    trading_name: Mapped[str | None] = mapped_column(String(250), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    country: Mapped[str] = mapped_column(String(2), default="RU")
    industry: Mapped[str | None] = mapped_column(String(160), nullable=True)
    size_band: Mapped[str | None] = mapped_column(String(64), nullable=True)
    icp_score: Mapped[float] = mapped_column(Float, default=0)
    merge_confidence: Mapped[float] = mapped_column(Float, default=1)
    merge_reasons: Mapped[list[str]] = mapped_column(JSON, default=list)


class CompanyLocation(Base, TimestampMixin):
    __tablename__ = "company_locations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    country: Mapped[str] = mapped_column(String(2))
    region: Mapped[str | None] = mapped_column(String(160), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)


class BusinessContact(Base, TimestampMixin):
    __tablename__ = "business_contacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    value_encrypted: Mapped[str] = mapped_column(Text)
    value_hash: Mapped[str] = mapped_column(String(64), index=True)
    is_role_contact: Mapped[bool] = mapped_column(Boolean, default=True)
    professional_context: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(32), default=ReviewStatus.REVIEW_REQUIRED.value)
    source_url: Mapped[str] = mapped_column(String(2048))
    legal_basis: Mapped[str | None] = mapped_column(String(160), nullable=True)
    allowed_channels: Mapped[list[str]] = mapped_column(JSON, default=list)
    retained_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CompanySignal(Base, TimestampMixin):
    __tablename__ = "company_signals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    signal_type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(300))
    source_url: Mapped[str] = mapped_column(String(2048))
    signal_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    competitor_id: Mapped[str | None] = mapped_column(ForeignKey("competitors.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(250))
    category: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_url: Mapped[str] = mapped_column(String(2048))


class Offer(Base, TimestampMixin):
    __tablename__ = "offers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str] = mapped_column(String(2048))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ReviewTopic(Base, TimestampMixin):
    __tablename__ = "review_topics"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    topic: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(100))
    sentiment: Mapped[str] = mapped_column(String(32))
    mentions: Mapped[int] = mapped_column(Integer, default=1)
    safe_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_hash: Mapped[str] = mapped_column(String(64))


class DemandCluster(Base, TimestampMixin):
    __tablename__ = "demand_clusters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    market_type: Mapped[str] = mapped_column(String(3))
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    demand_score: Mapped[float] = mapped_column(Float, default=0)
    themes: Mapped[list[str]] = mapped_column(JSON, default=list)


class Opportunity(Base, TimestampMixin):
    __tablename__ = "opportunities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    title: Mapped[str] = mapped_column(String(250))
    market_type: Mapped[str] = mapped_column(String(3))
    score: Mapped[float] = mapped_column(Float, default=0)
    factors: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)


class Campaign(Base, TimestampMixin):
    __tablename__ = "campaigns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    channel: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("tenant_id", "idempotency_key"),
        Index("ix_leads_tenant_status", "tenant_id", "status"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("data_sources.id"), nullable=True)
    market_type: Mapped[str] = mapped_column(String(3))
    source_type: Mapped[str] = mapped_column(String(64))
    contact_encrypted: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    contact_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default=LeadStatus.QUARANTINED.value)
    purpose: Mapped[str] = mapped_column(String(160))
    legal_basis: Mapped[str | None] = mapped_column(String(160), nullable=True)
    allowed_channels: Mapped[list[str]] = mapped_column(JSON, default=list)
    consent_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    consent_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    consent_timestamp: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    consent_evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    retained_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(200))
    quality: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    score: Mapped[float] = mapped_column(Float, default=0)


class LeadEvent(Base):
    __tablename__ = "lead_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey("leads.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(64))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ConsentEvent(Base):
    __tablename__ = "consent_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey("leads.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(64))
    channels: Mapped[list[str]] = mapped_column(JSON, default=list)
    text_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(2048))
    evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SourceEvidence(Base):
    __tablename__ = "source_evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    field_name: Mapped[str] = mapped_column(String(100))
    source_url: Mapped[str] = mapped_column(String(2048))
    content_hash: Mapped[str] = mapped_column(String(64))
    extractor_version: Mapped[str] = mapped_column(String(30))
    confidence: Mapped[float] = mapped_column(Float)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SuppressionEntry(Base):
    __tablename__ = "suppression_entries"
    __table_args__ = (UniqueConstraint("tenant_id", "identity_hash", "channel"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    identity_hash: Mapped[str] = mapped_column(String(64), index=True)
    channel: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ScoringModel(Base, TimestampMixin):
    __tablename__ = "scoring_models"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    model_type: Mapped[str] = mapped_column(String(64))
    version: Mapped[str] = mapped_column(String(30))
    rules: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class ScoreExplanation(Base):
    __tablename__ = "score_explanations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    scoring_model_id: Mapped[str | None] = mapped_column(
        ForeignKey("scoring_models.id"), nullable=True
    )
    score: Mapped[float] = mapped_column(Float)
    factors: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RetentionPolicy(Base, TimestampMixin):
    __tablename__ = "retention_policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    data_class: Mapped[str] = mapped_column(String(64))
    retention_days: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(32), default="ANONYMIZE")


class DataSubjectRequest(Base, TimestampMixin):
    __tablename__ = "data_subject_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    request_type: Mapped[str] = mapped_column(String(64))
    identity_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="OPEN")
    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    result: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class Export(Base):
    __tablename__ = "exports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    actor_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    provider: Mapped[str] = mapped_column(String(64))
    record_count: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32))
    filters: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str | None] = mapped_column(
        ForeignKey("tenants.id"), nullable=True, index=True
    )
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    outcome: Mapped[str] = mapped_column(String(32), default="SUCCESS")
    reason_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    safe_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class IntegrationConfig(Base, TimestampMixin):
    __tablename__ = "integration_configs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    provider_type: Mapped[str] = mapped_column(String(64))
    provider_name: Mapped[str] = mapped_column(String(100))
    encrypted_config: Mapped[str] = mapped_column(Text, default="")
    secret_version: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
