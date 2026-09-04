# Threat model

## Активы

Tenant data, encrypted contacts, consent evidence, integration secrets, access/refresh tokens, crawl infrastructure and immutable governance records.

## Основные угрозы и меры

| Угроза | Мера 1.0 | Остаточный риск |
|---|---|---|
| Cross-tenant IDOR | membership + `tenant_id` в каждом query | новые endpoints требуют обязательного security review |
| SSRF / cloud metadata | scheme, DNS/IP, redirect и rebinding validation | TOCTOU полностью устраняется network egress policy в production |
| Credential theft | Argon2id, short access JWT, HttpOnly refresh, CSRF double-submit | нужна внешняя MFA/SSO для enterprise |
| XSS from crawled HTML | deterministic sanitizer; raw HTML не рендерится | sanitizer нужно fuzz-test при расширении форматов |
| Webhook replay/spoofing | HMAC, timestamp window, idempotency key | ротация secrets остаётся операционной обязанностью |
| CSV injection | dangerous prefixes escaped | пользователям всё равно нельзя отключать protected view |
| Unauthorized export/contact view | separate RBAC permissions + audit | UI masking не заменяет API enforcement |
| Sensitive data leakage in logs | structured safe metadata only | provider SDK logging must stay disabled/redacted |
| Consent bypass | export/status gate + suppression hash | jurisdiction rules require legal maintenance |
| Crawler resource exhaustion | response/page/depth/redirect/time/rate limits | use container CPU/memory quotas in production |

## Deployment hardening

Run containers as non-root, deny private network egress from crawler, terminate TLS at a trusted proxy, use managed secrets/KMS, enable PostgreSQL TLS/backup encryption, centralize audit logs with write-once retention, scan images and rotate dependencies. Production CSP for UI should be narrowed after choosing hosting/analytics providers.

