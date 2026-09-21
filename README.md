# SREDA Analytic — коробка

Запуск с **Windows и macOS** из корня репозитория (рядом с `package.json`). Нужны Node.js 18+ и доступ к PostgreSQL заказчика.

## Что заполняет заказчик

Один файл: корневой `.env`. Туда — хост, порт, логин, пароль, база, схема. Остальное коробка пишет сама при `npm start` и `npm run db` (в том числе TLS к Postgres).

## Первый запуск

```bash
cp .env.example .env
```

На Windows PowerShell: `Copy-Item .env.example .env`

В `.env` заполните:

```
DB_HOST=...
DB_PORT=5432
DB_USER=...
DB_PASS=...
DB_DATABASE=...
DB_SCHEMA=...
```

Дальше из корня:

```bash
npm install
npm run db
npm start
```

Если схема в БД заказчика **уже есть**, `npm run db` можно пропустить.

После старта:

- pivot: http://127.0.0.1:3391
- аналитика: http://127.0.0.1:3380
- админка: http://127.0.0.1:3372

Логин по умолчанию: `su` / `su`.

`DB_SSL` в `.env` не обязателен: для удалённого хоста включается TLS, для `localhost` — нет. Если БД заказчика проброшена на `127.0.0.1` туннелем, добавьте `DB_SSL=require`.

## Команды из корня

| Команда | Что делает |
| --- | --- |
| `npm install` | зависимости коробки и модулей |
| `npm run db` | разложить `.env` + миграции |
| `npm start` | разложить `.env` + pivot + аналитика + админка |
| `npm run env` | только разложить `.env` (обычно не нужно) |
| `npm start -- --only pivot` | только бэкенд |
| `npm start -- --no-open` | без открытия браузера |
| `npm run list` | состав коробки |
| `npm run validate` | проверка путей |
| `npm run build` | сборка пакетов (builder.config.json) |

Остановка: Ctrl+C.

## Если фронт не поднимается

В каталоге модуля: `npm install --legacy-peer-deps --ignore-scripts`, затем снова `npm start` из корня.
