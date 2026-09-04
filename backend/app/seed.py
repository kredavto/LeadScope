from datetime import UTC, datetime, timedelta

from pydantic import HttpUrl

from app.api import ingest_lead
from app.database import SessionLocal
from app.models import (
    AuditLog,
    BusinessContact,
    Company,
    CompanySignal,
    Competitor,
    CrawlJob,
    CrawlRun,
    DataSource,
    DemandCluster,
    Membership,
    NicheTemplate,
    Offer,
    Opportunity,
    Product,
    ReviewStatus,
    ReviewTopic,
    Role,
    SuppressionEntry,
    Tenant,
    User,
)
from app.schemas import LeadIn
from app.security import encrypt_json, hash_password, identity_hash

TENANT_ID = "00000000-0000-4000-8000-000000000001"
USER_ID = "00000000-0000-4000-8000-000000000002"


NICHE_CONFIGS = [
    ("B2C", "Автокредиты", "FINANCIAL", ["автокредит", "ставка", "первоначальный взнос"]),
    ("B2C", "Ремонт смартфонов", "NORMAL", ["замена экрана", "срочный ремонт", "гарантия"]),
    ("B2C", "Косметологическая клиника", "HEALTH", ["консультация", "процедура", "лицензия"]),
    ("B2B", "Оборудование для автосервисов", "NORMAL", ["подъёмник", "диагностика", "тендер"]),
    ("B2B", "SaaS для отделов продаж", "NORMAL", ["CRM", "автоматизация", "интеграция"]),
    ("B2B", "Коммерческая недвижимость", "NORMAL", ["офис", "склад", "аренда"]),
]


def seed() -> None:
    with SessionLocal() as db:
        if db.get(Tenant, TENANT_ID):
            return
        tenant = Tenant(
            id=TENANT_ID, name="LeadScope Demo", country="RU", settings={"locale": "ru"}
        )
        user = User(
            id=USER_ID,
            email="owner@leadscope.example",
            password_hash=hash_password("Demo-LeadScope-2026!"),
            display_name="Демо-владелец",
        )
        # Flush FK parents explicitly. SQLite accepted the previous single flush,
        # while PostgreSQL can schedule the unrelated ORM mappers in an order
        # that inserts Membership before Tenant/User when no relationships exist.
        db.add_all([tenant, user])
        db.flush()
        membership = Membership(tenant_id=tenant.id, user_id=user.id, role=Role.OWNER.value)
        db.add(membership)

        niches: list[NicheTemplate] = []
        for market_type, name, sensitivity, phrases in NICHE_CONFIGS:
            niche = NicheTemplate(
                market_type=market_type,
                name=name,
                version="1.0",
                countries=["RU"],
                regions=["Москва", "Санкт-Петербург"],
                sensitivity=sensitivity,
                retention_days=30 if sensitivity in {"FINANCIAL", "HEALTH"} else 365,
                config={
                    "company_types": [],
                    "product_categories": phrases[:2],
                    "synonyms": phrases,
                    "intent_phrases": phrases,
                    "price_patterns": [r"\d+[\s.,]?\d*\s*(₽|руб.)"],
                    "problem_categories": ["цена", "скорость", "качество"],
                    "icp": {"regions": ["RU"], "min_employees": 10} if market_type == "B2B" else {},
                    "allowed_source_types": [
                        "PUBLIC_COMPANY_SITE",
                        "OFFICIAL_REGISTRY",
                        "LICENSED_API",
                    ],
                    "forbidden_url_patterns": ["/account", "/login", "/private"],
                    "minimum_dataset": ["source_url", "observed_at", "content_hash"],
                    "allowed_contact_channels": ["EMAIL", "PHONE"] if market_type == "B2B" else [],
                    "scoring_rules": {"source_quality": 0.2, "recency": 0.2},
                    "rescan_policy": "P7D",
                },
            )
            db.add(niche)
            niches.append(niche)
        db.flush()

        source = DataSource(
            tenant_id=tenant.id,
            source_type="PUBLIC_COMPANY_SITE",
            url="https://service.example.com/",
            owner="ООО «Пример Сервис»",
            country="RU",
            legal_basis=(
                "Публичная корпоративная информация; использование требует отдельной проверки"
            ),
            terms_url="https://service.example.com/terms",
            robots_status="ALLOWED",
            scan_allowed=True,
            contains_personal_data=False,
            trust_score=0.82,
            status=ReviewStatus.APPROVED.value,
            last_checked_at=datetime.now(UTC),
        )
        competitor = Competitor(
            tenant_id=tenant.id,
            niche_template_id=niches[1].id,
            name="Пример Сервис",
            domain="service.example.com",
            region="Москва",
        )
        db.add_all([source, competitor])
        db.flush()
        job = CrawlJob(
            tenant_id=tenant.id,
            source_id=source.id,
            start_url=source.url,
            status="COMPLETED",
            max_depth=2,
            max_pages=25,
        )
        db.add(job)
        db.flush()
        db.add(
            CrawlRun(
                tenant_id=tenant.id,
                job_id=job.id,
                status="COMPLETED",
                pages_seen=12,
                pages_changed=3,
                finished_at=datetime.now(UTC),
            )
        )
        product = Product(
            tenant_id=tenant.id,
            competitor_id=competitor.id,
            name="Замена экрана",
            category="Ремонт",
            source_url="https://service.example.com/screens",
        )
        db.add(product)
        db.flush()
        db.add_all(
            [
                Offer(
                    tenant_id=tenant.id,
                    product_id=product.id,
                    price=6900,
                    currency="RUB",
                    terms="Гарантия 90 дней",
                    source_url="https://service.example.com/screens",
                    observed_at=datetime.now(UTC) - timedelta(days=7),
                ),
                Offer(
                    tenant_id=tenant.id,
                    product_id=product.id,
                    price=7500,
                    currency="RUB",
                    terms="Гарантия 90 дней",
                    source_url="https://service.example.com/screens",
                ),
                ReviewTopic(
                    tenant_id=tenant.id,
                    topic="Долгое ожидание запчастей",
                    category="скорость",
                    sentiment="NEGATIVE",
                    mentions=18,
                    safe_excerpt="Запчасть пришлось ждать дольше обещанного срока.",
                    source_hash="0" * 64,
                ),
                DemandCluster(
                    tenant_id=tenant.id,
                    name="Срочный ремонт с гарантией",
                    market_type="B2C",
                    evidence_count=42,
                    demand_score=78,
                    themes=["скорость", "прозрачная цена", "гарантия"],
                ),
                Opportunity(
                    tenant_id=tenant.id,
                    title="Фиксированная цена и ремонт за 60 минут",
                    market_type="B2C",
                    score=82,
                    factors={
                        "demand": 0.96,
                        "commercial_intent": 0.96,
                        "competitor_gap": 0.95,
                        "expected_margin": 0.95,
                        "data_confidence": 0.99,
                    },
                    recommendation="Протестировать лендинг с фиксированной ценой и SLA.",
                ),
            ]
        )

        company = Company(
            tenant_id=tenant.id,
            legal_name="ООО «Гараж Технологий»",
            trading_name="Garage Tech",
            domain="garage-tech.example.org",
            registration_number="0000000000",
            country="RU",
            industry="Автосервисы",
            size_band="51-200",
            icp_score=86,
            merge_confidence=1,
            merge_reasons=["domain_exact", "registration_number_exact"],
        )
        db.add(company)
        db.flush()
        db.add_all(
            [
                CompanySignal(
                    tenant_id=tenant.id,
                    company_id=company.id,
                    signal_type="VACANCY",
                    title="Открыта вакансия руководителя отдела закупок",
                    source_url="https://garage-tech.example.org/jobs/procurement",
                    confidence=0.88,
                ),
                CompanySignal(
                    tenant_id=tenant.id,
                    company_id=company.id,
                    signal_type="TENDER",
                    title="Запрос предложений на диагностическое оборудование",
                    source_url="https://garage-tech.example.org/tenders/diagnostics",
                    confidence=0.94,
                ),
                BusinessContact(
                    tenant_id=tenant.id,
                    company_id=company.id,
                    kind="EMAIL",
                    value_encrypted=encrypt_json({"value": "procurement@garage-tech.example.org"})[
                        "ciphertext"
                    ],
                    value_hash=identity_hash("procurement@garage-tech.example.org"),
                    is_role_contact=True,
                    professional_context=True,
                    status=ReviewStatus.REVIEW_REQUIRED.value,
                    source_url="https://garage-tech.example.org/contacts",
                    legal_basis="Опубликованный ролевой адрес",
                    allowed_channels=[],
                ),
            ]
        )

        now = datetime.now(UTC)
        allowed = LeadIn(
            market_type="B2C",
            source_type="FIRST_PARTY_FORM",
            contact={
                "name": "Иван Тестов",
                "email": "ivan@example.com",
                "phone": "+7 000 000-00-01",
            },
            purpose="MARKETING_CALLBACK",
            legal_basis="CONSENT",
            consent_text="Согласен получить ответ по заявке",
            consent_version="v1.2",
            consent_timestamp=now,
            consent_evidence={"action": "checkbox_checked", "request_id": "demo-001"},
            allowed_channels=["EMAIL", "PHONE"],
            retained_until=now + timedelta(days=365),
            form_url=HttpUrl("https://owner.example.com/request"),
            quality={"product_fit": 18, "demo": True},
        )
        quarantine = LeadIn(
            market_type="B2C",
            source_type="PARTNER",
            contact={"email": "partner-lead@example.org"},
            purpose="MARKETING",
            partner_id="partner-demo",
            quality={"demo": True},
        )
        revoked = LeadIn(
            market_type="B2C",
            source_type="FIRST_PARTY_FORM",
            contact={"email": "revoked@example.com"},
            purpose="MARKETING",
            legal_basis="CONSENT",
            consent_text="Согласен",
            consent_version="v1.2",
            consent_timestamp=now - timedelta(days=5),
            consent_evidence={"action": "checkbox_checked"},
            allowed_channels=["EMAIL"],
            quality={"demo": True},
        )
        ingest_lead(db, tenant.id, allowed, "seed-allowed")
        ingest_lead(db, tenant.id, quarantine, "seed-quarantine")
        revoked_lead, _ = ingest_lead(db, tenant.id, revoked, "seed-revoked")
        revoked_lead.status = "SUPPRESSED"
        revoked_lead.allowed_channels = []
        db.add(
            SuppressionEntry(
                tenant_id=tenant.id,
                identity_hash=identity_hash("revoked@example.com"),
                channel="EMAIL",
                reason="REVOKED",
            )
        )
        db.add(
            AuditLog(
                tenant_id=tenant.id,
                actor_user_id=user.id,
                action="LEAD_FROM_REVIEW_ATTEMPT",
                entity_type="review",
                outcome="BLOCKED",
                reason_codes=["REVIEW_AUTHOR_CONTACT_FORBIDDEN"],
                safe_metadata={"review_source_hash": "0" * 64},
            )
        )
        db.commit()


if __name__ == "__main__":
    seed()
