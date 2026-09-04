# LeadScope

LeadScope — production-oriented MVP для законной аналитики конкурентного спроса, B2B company intelligence и приёма собственных/разрешённых лидов. Система принципиально не деанонимизирует посетителей чужих сайтов, не перехватывает звонки и не превращает авторов отзывов в лидов.

## Что входит в 1.0

- B2C intelligence: конкуренты, предложения, цены, изменения, обезличенные темы отзывов и opportunity score.
- B2B intelligence: компании, опубликованные общие/ролевые контакты, вакансии, тендеры и объяснимый ICP/intent score.
- First-party/partner lead gateway: idempotency, HMAC webhook, consent evidence, quarantine и suppression.
- Multi-tenant API, RBAC, маскирование, шифрование полей, audit trail, retention task и CSV export gate.
- Безопасный crawler preflight: robots policy, только HTTP(S), DNS/IP-проверка, redirect/rebinding guard, лимиты типа/размера и остановка на 401/403/CAPTCHA.
- Русский адаптивный интерфейс и словарь английской локализации основных терминов.

> Политики LeadScope — технические ограничители, а не автоматическая гарантия юридического соответствия. Их должен настроить специалист для стран фактической работы продукта.

## Быстрый запуск через Docker

Требования: Docker Desktop с включённым Linux/WSL2 engine.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

После health checks:

- UI: http://localhost:3000
- API docs: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

Демо-доступ: `owner@leadscope.example` / `Demo-LeadScope-2026!`.

## Vercel

Конфигурация `vercel.json` публикует Next.js-интерфейс из `apps/web` в безопасном
демонстрационном режиме. Он не обращается к `localhost` посетителя и не содержит
production-секретов. Полный контур с FastAPI, PostgreSQL, Redis и Celery запускается
через Docker Compose. Для отдельного production-backend задайте
`NEXT_PUBLIC_API_URL` и отключите `NEXT_PUBLIC_DEMO_MODE` в настройках Vercel.

## Запуск без Docker

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
Set-Location backend
..\.venv\Scripts\alembic.exe upgrade head
..\.venv\Scripts\python.exe -m app.seed
..\.venv\Scripts\uvicorn.exe app.main:app --reload
```

В другом терминале:

```powershell
pnpm install
pnpm dev
```

По умолчанию backend без `.env` использует `backend/leadscope.db`. Для Celery нужны Redis и переменная `REDIS_URL`.

## Проверки

```powershell
.\.venv\Scripts\ruff.exe check backend
.\.venv\Scripts\mypy.exe backend/app
.\.venv\Scripts\pytest.exe backend --cov=backend/app
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @leadscope/web test:e2e
```

E2E требует установленных браузеров Playwright: `pnpm --filter @leadscope/web exec playwright install chromium`.

## Демо API

1. `POST /api/v1/auth/login` с JSON `{"email":"owner@leadscope.example","password":"Demo-LeadScope-2026!"}`.
2. Передавайте `Authorization: Bearer …` и `X-Tenant-ID: 00000000-0000-4000-8000-000000000001`.
3. Для `POST /api/v1/leads` нужен уникальный `Idempotency-Key`.

Подробности: [архитектура](docs/ARCHITECTURE.md), [модель compliance](docs/COMPLIANCE_MODEL.md), [crawler policy](docs/CRAWLER_POLICY.md), [операции](docs/OPERATIONS.md).
