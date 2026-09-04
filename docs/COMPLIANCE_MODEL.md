# Compliance model

Публичная доступность сведений сама по себе **не означает автоматического разрешения на рекламное использование**. Policy engine является техническим ограничителем и не гарантирует соответствие законодательству. Перед production-запуском правила нужно проверить для страны оператора, субъекта/компании и фактической доставки сообщения.

## Входы и решения

Engine получает страны, B2C/B2B, source/data type, цель, канал, качество consent и чувствительность ниши. Возвращает `ALLOW`, `REVIEW_REQUIRED` или `BLOCK`, reasons, required evidence, retention и actions.

Стартовые правила консервативны:

- B2C cold outreach без подтверждённого разрешения — BLOCK.
- Автор отзыва или идентификация посетителя/звонившего конкуренту — BLOCK.
- Партнёрская заявка без proof — BLOCK в engine и `QUARANTINED` в lifecycle, без контакта/экспорта.
- Общий телефон компании — ALLOW для хранения; коммуникация оценивается отдельно.
- Ролевой e-mail или контакт сотрудника — REVIEW_REQUIRED.
- First-party заявка с версионированным текстом, временем, proof-of-action и каналом — ALLOW в этих каналах.
- Health/children/financial/legal требуют усиленной минимизации и проверенного основания.

## Consent и suppression

Consent ledger append-only. `REVOKED` и `MARKETING_OBJECTED` немедленно очищают каналы, переводят запись в `SUPPRESSED` и сохраняют минимальный HMAC-хеш для предотвращения повторного импорта. Экспорт выбирает исключительно `CONTACT_ALLOWED`.

## Права субъекта

Workflow `data_subject_requests` покрывает access, correction, restriction, consent withdrawal, portable export и deletion/anonymization. Результат, исполнитель и audit event обязательны. Retention job удаляет encrypted payload, но может сохранить минимальный suppression hash, если он нужен для соблюдения запрета контакта.

