# Release 1.0

## Реализовано

Схема всех обязательных сущностей, миграция/seed, auth/RBAC/tenant boundaries, source approval, crawler network guard, deterministic extraction/redaction, B2B resolver, explainable scoring, signed/idempotent ingestion, consent/quarantine/suppression, retention, CSV gate, audit, responsive UI, compose и CI.

## Ограничения

- Static HTTP crawler fetcher реализован как безопасный service layer; полный link traversal/sitemap scheduler и isolated Playwright worker — следующий инкремент.
- CRM, search, registries, ads, telephony, enrichment и LLM используют provider boundary/mock; production credentials не включены.
- Ключевые write-flow UI (вход, ниши, конкуренты, источники и задания сбора) подключены к API; специализированные редакторы остальных разделов пока используют обзорный workflow и OpenAPI.
- In-memory rate limiter предназначен для одного API instance; production требует Redis/API gateway.
- Policy set стартовый и не заменяет юридическую настройку.

## 1.1

Добавить isolated browser worker, sitemap frontier, per-domain Redis token buckets, SSO/MFA, Redis-backed token revocation, KMS envelope encryption, provider-specific connectors, полноценную RU/EN locale routing, compliance policy editor, distributed tracing и externalized tamper-evident audit sink.
