# API и интеграции

Base URL: `/api/v1`. Интерактивная документация — `/docs`, схема — `/openapi.json` и `docs/openapi.json`.

## Авторизация

`POST /auth/login` возвращает short-lived Bearer access token и ставит HttpOnly refresh cookie. Все tenant endpoints требуют `X-Tenant-ID`. Refresh использует double-submit `X-CSRF-Token`.

## Lead ingestion

`POST /leads` требует `Idempotency-Key`. Signed webhook `/webhooks/leads` дополнительно требует:

- `X-Webhook-Timestamp`: Unix timestamp;
- `X-Webhook-Signature`: hex HMAC-SHA256 от `timestamp + "." + raw_body`;
- `X-Tenant-ID` и `Idempotency-Key`.

Missing consent evidence создаёт quarantined запись. Повтор с тем же ключом возвращает исходную запись.

## Providers

Рабочий provider: CSV export с formula-injection protection. Mock providers: CRM и redacted LLM analysis. Для production нужно реализовать adapter и secret rotation для CRM, ad lead forms, owned call tracking, official registries, search API, licensed B2B enrichment, e-mail/telephony и LLM.

Нужные ключи зависят от выбранных сервисов: `LLM_API_KEY`, `SEARCH_API_KEY`, CRM OAuth credentials и webhook secrets. Ни один реальный ключ не хранится в репозитории.

