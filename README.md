# SREDA Analytic — коробка

Запуск с **Windows и macOS** из корня репозитория (рядом с `package.json`). Нужны Node.js 18+ и PostgreSQL.

## Первый запуск

```bash
cp .env.example .env
# заполните DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_DATABASE, DB_SCHEMA
npm install
npm run env
npm run db
npm start
```

На Windows PowerShell: `Copy-Item .env.example .env` вместо `cp`.

После старта:

- pivot: http://127.0.0.1:3391
- аналитика: http://127.0.0.1:3380
- админка: http://127.0.0.1:3372

Логин по умолчанию: `su` / `su`.

Если логин даёт 500 и в логе `no pg_hba.conf entry … no encryption` — в корневом `.env` должно быть `DB_SSL=require`, затем снова `npm run env` и `npm start`. Для локальной Postgres без SSL: `DB_SSL=disable`.

## Команды из корня

| Команда | Что делает |
| --- | --- |
| `npm install` | зависимости коробки и модулей |
| `npm run env` | `.env` модулей из корневого `.env` |
| `npm run db` | миграции |
| `npm start` | pivot + аналитика + админка |
| `npm start -- --only pivot` | только бэкенд |
| `npm start -- --no-open` | без открытия браузера |
| `npm run list` | состав коробки |
| `npm run validate` | проверка путей |
| `npm run build` | сборка пакетов (builder.config.json) |

Остановка: Ctrl+C.

## Если фронт не поднимается

В каталоге модуля: `npm install --legacy-peer-deps --ignore-scripts`, затем снова `npm start` из корня.
