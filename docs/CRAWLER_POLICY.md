# Политика crawler

## Разрешение источника

Задание принимается только для `data_sources.status = APPROVED`, `scan_allowed = true` и сохранённого основания. Перед фактической загрузкой проверяется `robots.txt`. Явный запрет, 401, 403 или CAPTCHA прекращают обработку ресурса.

## Сетевые ограничения

- Только абсолютные `http`/`https` URL.
- DNS проверяется до запроса и после каждого redirect.
- Запрещены loopback, private, link-local, multicast, reserved и metadata IP, включая `169.254.169.254`.
- DNS answer закрепляется на запрос; изменение адресов трактуется как rebinding.
- Максимум четыре redirect, 2 MB ответа и только HTML/XHTML.
- Пользовательские proxy и заголовки авторизации не принимаются.
- Браузерный worker для разрешённых динамических страниц должен работать в отдельном непривилегированном контейнере; в 1.0 он оставлен adapter boundary и не включён по умолчанию.

## Вежливое сканирование

User-Agent содержит рабочий контакт оператора. Планировщик применяет отдельный rate limit на домен, exponential backoff, depth/page/time budgets, sitemap discovery, allow/deny patterns, ETag/Last-Modified и content hash. Неизменившиеся страницы повторно не извлекаются.

## Отображение

Сырой HTML не отображается. Sanitizer удаляет scripts, event handlers, forms, iframe/object/embed и inline style. Отзывы проходят отдельную PII-redaction и никогда не создают leads.

