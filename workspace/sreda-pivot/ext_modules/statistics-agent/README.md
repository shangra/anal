# Statistics Agent

Node.js агент сбора телеметрии для сервисов на базе NodeCMS. Интегрируется с **OpenTelemetry** для сбора и экспорта трейсов, метрик и логов в централизованные коллекторы.

## Возможности

- **Трейсы** — сбор распределённых трейсов через OTLP (опционально)
- **Метрики** — сбор системных и пользовательских метрик через OTLP (опционально)
- **Пользовательские метрики** — Counter, UpDownCounter, Histogram, Gauge
- **Консольные логи** — перехват `console.log/error/warn/info/debug` и отправка в коллектор (опционально)
- **HTTP-логи** — сбор детальной информации о запросах/ответах Express (опционально)
- **Process Mining события** — структурированные логи для анализа бизнес-процессов (опционально)

## Установка

```bash
npm install
```

## Использование

### Быстрый старт

Агент инициализируется автоматически при подключении модуля. В конфигурации используются переменные окружения из `sreda.env`.

```javascript
// Подключение через единую точку входа
const { createMetric, getMetric, recordProcessMiningEvent, METRIC_TYPES } = require('statistics-agent');

// Process Mining событие
recordProcessMiningEvent('user.login', { userId: '123' });

// Пользовательские метрики
const counter = await createMetric('api.requests', {
    type: METRIC_TYPES.COUNTER,
    description: 'Количество запросов к API',
});
counter.add(1);
```

### Инициализация

Инициализация происходит автоматически при подключении `Init.service.js` или `index.js` в загрузчике сервисов NodeCMS. Весь процесс:

1. Включается OpenTelemetry diag логгер (если задан `STATISTICS_LOG_LEVEL`)
2. Формируется конфигурация ресурса (имя и версия сервиса)
3. Если включены трейсы и/или метрики — создаётся и запускается `NodeSDK`
4. Если включён сбор консольных логов — инициализируется `LoggerProvider`
5. Перехватываются методы `console` и глобальные обработчики ошибок

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `SERVICE_NAME` | Наименование сервиса | `'Неизвестный сервис'` |
| `METRICS_EXPORT_ENABLED` | Включить сбор метрик | `false` |
| `METRICS_EXPORT_URL` | URL коллектора метрик | — |
| `TRACES_EXPORT_ENABLED` | Включить сбор трейсов | `false` |
| `TRACES_EXPORT_URL` | URL коллектора трейсов | — |
| `CONSOLE_EXPORT_ENABLED` | Включить сбор консольных логов | `false` |
| `CONSOLE_EXPORT_URL` | URL коллектора логов | — |
| `CONSOLE_INTERCEPT_METHODS` | Какие методы console перехватывать | `['log', 'error', 'warn', 'info', 'debug']` |
| `HTTP_EXPORT_ENABLED` | Включить сбор HTTP-логов | `false` |
| `STATISTICS_LOG_LEVEL` | Уровень diag-логирования (0-5) | `0` (выкл) |
| `STATISTICS_AGENT_USE_SSL` | Проверка SSL-сертификатов | `true` |
| `STATISTICS_DEV_MODE` | Режим локальной разработки | `false` |

### Настройки батчей логов

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `CONSOLE_LOGGER_MAX_EXPORT_BATCH_SIZE` | Макс. размер батча | `512` |
| `CONSOLE_LOGGER_MAX_QUEUE_SIZE` | Макс. очередь | `2048` |
| `CONSOLE_LOGGER_SCHEDULED_DELAY_MILLIS` | Интервал отправки (мс) | `5000` |
| `CONSOLE_LOGGER_EXPORT_TIMEOUT_MILLIS` | Таймаут экспорта (мс) | `30000` |

## API

### Метрики

#### `createMetric(name, options)`

Создаёт новую пользовательскую метрику.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `name` | `string` | Уникальное имя метрики |
| `options.type` | `string` | Тип метрики: `Counter`, `UpDownCounter`, `Gauge`, `Histogram` |
| `options.scope` | `string` | Область видимости (имя пакета по умолчанию) |
| `options.version` | `string` | Версия области видимости |
| `options.description` | `string` | Описание метрики |
| `options.unit` | `string` | Единица измерения |
| `options.boundaries` | `number[]` | Границы гистограммы (только для Histogram) |

**Возвращает:** объект метрики:
- `Counter` / `UpDownCounter` → `{ add(value, attributes) }`
- `Histogram` → `{ record(value, attributes) }`
- `Gauge` → `{ set(value, attributes) }`

#### `getMetric(name, options)`

Получает существующую метрику.

#### `METRIC_TYPES`

Константа с доступными типами метрик: `COUNTER`, `UP_DOWN_COUNTER`, `GAUGE`, `HISTOGRAM`.

### Process Mining

#### `recordProcessMiningEvent(body, attributes, logger)`

Регистрирует бизнес-событие для process mining.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `body` | `string` | Сообщение события |
| `attributes` | `object` | Дополнительные атрибуты |
| `logger` | `object` | Опциональный логгер |

## Middleware

### HTTP-логи

Для сбора HTTP-логов подключите middleware в Express-приложении:

```javascript
const loggerMiddleware = require('statistics-agent/middleware/loggerMiddleware');
app.use(loggerMiddleware);
```

Middleware собирает: заголовки запроса/ответа, параметры, query, тело, информацию о пользователе, виджеты дашборда, трейс-контекст и др.

## Структура проекта

```
statistics-agent/
├── package.json
├── index.js                        # Единая точка экспорта
├── src/
│   └── constants.js                # Константы
├── services/
│   ├── AnalyticAgent.service.js    # Агент OTel SDK
│   ├── Config.service.js           # Конфигурация
│   ├── DiagLogger.service.js       # Diag-логгер
│   ├── Init.service.js             # Инициализация
│   ├── Logger.service.js           # Логирование
│   ├── Metrics.service.js          # Метрики (фасад)
│   └── MetricsManager.service.js   # Менеджер метрик
├── middleware/
│   └── loggerMiddleware.js         # HTTP middleware
├── GIGACODE.md                     # Техническая документация
└── README.md                       # Этот файл
```

## Версионирование

Текущая версия: **1.5.0**