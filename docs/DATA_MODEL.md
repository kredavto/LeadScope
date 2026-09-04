# Модель данных

Все бизнес-таблицы содержат `tenant_id`; глобальными могут быть только системные `niche_templates` и `jurisdiction_policies` с `tenant_id = NULL`.

## Группы сущностей

- Identity: `tenants`, `users`, `memberships`, `roles`.
- Configuration: `niche_templates`, `jurisdiction_policies`, `retention_policies`, `integration_configs`.
- Acquisition: `competitors`, `domains`, `data_sources`, `crawl_jobs`, `crawl_runs`, `pages`, `page_snapshots`.
- Intelligence: `extracted_facts`, `products`, `offers`, `review_topics`, `demand_clusters`, `opportunities`.
- B2B: `companies`, `company_locations`, `business_contacts`, `company_signals`.
- Leads: `campaigns`, `leads`, `lead_events`, `consent_events`, `source_evidence`, `suppression_entries`.
- Governance: `scoring_models`, `score_explanations`, `data_subject_requests`, `exports`, `audit_logs`.

## Классификация и provenance

Персональные значения находятся в зашифрованных полях, сопровождаются status, legal basis, allowed channels, evidence и `retained_until`. `source_evidence` связывает поле сущности с точным источником. Review data хранится только после удаления автора, профиля и случайных контактов.

## Дедупликация

- Lead: tenant + idempotency key; suppression проверяется по HMAC identity hash.
- Company: точный домен, регистрационный номер, подтверждённый корпоративный телефон либо имя **вместе** с адресом.
- Сходство одного названия недостаточно и приводит к manual review.

Миграция `backend/migrations/versions/0001_initial.py` создаёт полную схему на чистой базе.

