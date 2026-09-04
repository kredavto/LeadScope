# Архитектура

## Контуры

```text
Browser → Next.js UI → FastAPI /api/v1 → PostgreSQL
                          │       ├→ immutable audit/consent events
                          │       └→ provider interfaces (CSV + mocks)
                          └→ Redis/Celery → crawler + retention jobs
```

Monorepo разделён на `apps/web` и `backend`. Next.js 16 App Router работает как responsive presentation layer; внешний версионированный REST API и OpenAPI принадлежат FastAPI. API всегда извлекает tenant из проверенного membership, а не из payload.

## Ключевые решения

1. **Policy before action.** Источник утверждается до crawl job; lead проходит policy/suppression до разрешения контакта или экспорта.
2. **Provenance per fact.** `source_evidence` и `extracted_facts` хранят URL, время, extractor version, confidence и content hash.
3. **Events over mutable consent.** `consent_events` не обновляются; текущий статус лида — производная для быстрого gate.
4. **Deterministic baseline.** JSON-LD, цены, метаданные, role e-mail и redaction работают без LLM. LLM provider получает только отредактированный текст.
5. **PostgreSQL in deployment, SQLite for tests.** ORM-модель едина; CI использует быстрый изолированный SQLite, compose — PostgreSQL.
6. **Node runtime and standalone output.** Next.js собирается в self-hosted standalone container без Edge-only зависимостей.

## Trust boundaries

- Internet content is untrusted and enters only through crawler limits and sanitization.
- Webhooks are untrusted until HMAC and replay-window verification.
- Browser never decides tenant scope or export eligibility.
- Contacts are encrypted at application level and masked unless `view_contacts` is present.
- System logs and audit metadata contain identifiers/statuses, not raw contacts or tokens.

## Provider interfaces

Contracts exist for CRM and analysis providers; 1.0 includes CSV, Mock CRM and Mock Analysis. The same boundary is intended for official search, registries, ad lead forms, owned call tracking, licensed B2B enrichment and telephony.

