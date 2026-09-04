# Operations

## Health и наблюдаемость

- API: `GET /health`
- Web: `GET /api/health`
- Контролировать queue depth, crawl block reasons, source freshness, quarantine share, expiring consents, retention failures and export volume.

Не помещать raw contacts, tokens, HTML или webhook body в логи. Correlation ID и hash допустимы.

## Backup

```powershell
docker compose exec -T db pg_dump -U leadscope -Fc leadscope > leadscope.dump
```

Хранить зашифрованно, отдельно от приложения и по проверенной retention policy.

## Restore drill

```powershell
docker compose exec -T db createdb -U leadscope leadscope_restore
Get-Content -AsByteStream leadscope.dump | docker compose exec -T db pg_restore -U leadscope -d leadscope_restore --clean --if-exists
docker compose exec -T db psql -U leadscope -d leadscope_restore -c "select count(*) from tenants;"
```

Проверить schema revision, tenant counts, consent/audit continuity и затем уничтожить drill database контролируемой командой.

## Incident runbook

1. Остановить affected integration/crawl job.
2. Отозвать/ротировать secret и access tokens.
3. Сохранить redacted audit evidence.
4. Определить tenants/data classes/time window.
5. Следовать требованиям уведомления применимой юрисдикции.
6. Исправить причину, добавить regression test и документировать решение.

