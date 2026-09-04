# Развёртывание

## Local compose

```powershell
Copy-Item .env.example .env
docker compose build
docker compose up -d
docker compose ps
```

API выполняет `alembic upgrade head` и идемпотентный seed до старта. Web использует Next.js standalone output. Worker и beat используют Redis.

## Production checklist

1. Заменить все development secrets и хранить их в secret manager/KMS.
2. Использовать managed PostgreSQL/Redis с TLS, PITR и network ACL.
3. Отделить crawler egress и запретить private/metadata ranges на уровне сети.
4. Настроить TLS, trusted proxy, origin allowlist, CSP и rate limiter на Redis/API gateway.
5. Не запускать seed; создать owner через контролируемую bootstrap-команду.
6. Настроить centralized logs без payload и WORM audit storage.
7. Выполнить restore drill, DAST и jurisdiction review до трафика.

Horizontal web instances не используют ISR. При добавлении revalidation нужен shared Next.js cache handler. Celery tasks должны быть идемпотентны; retention запускается одним beat leader.

