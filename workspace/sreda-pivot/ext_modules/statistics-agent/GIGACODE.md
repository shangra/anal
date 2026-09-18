# GIGACODE.md

## Обзор проекта

Это Node.js агент сбора телеметрии для сервисов на базе NodeCMS. Проект интегрируется с OpenTelemetry для сбора и экспорта трейсов, метрик и логов в централизованные коллекторы.

### Основные технологии

- **OpenTelemetry SDK Node** (`@opentelemetry/sdk-node` v0.218.0)
- **OpenTelemetry Metrics API** (`@opentelemetry/api`) для создания пользовательских метрик
- **Автоматические инструментации** (`@opentelemetry/auto-instrumentations-node` v0.76.0)
- **OTLP экспортеры** для трейсов, метрик и логов по HTTP
- **Express HTTP контекст** (`express-http-context`) для передачи данных между middleware

### Архитектура

Проект состоит из следующих компонентов:

| Компонент | Назначение |
|-----------|-----------|
| `Init.service.js` | Главная точка инициализации агента, перехватывает `process.stdout`, `process.stderr` и глобальные ошибки |
| `AnalyticAgent.service.js` | Управление SDK Node для сбора метрик и трейсов |
| `Config.service.js` | Формирование конфигурации ресурсов, агента, логгера и инструментаций |
| `Logger.service.js` | Создание провайдера логов и вспомогательные методы формирования логов, включая сбор process mining событий и HTTP-логов |
| `Metrics.service.js` | Высокоуровневая абстракция для создания и изменения пользовательских метрик (через `MetricsManager`) |
| `MetricsManager.service.js` | Менеджер метрик — абстракция над OpenTelemetry Metrics API для создания Counter, UpDownCounter, Histogram, Gauge |
| `DiagLogger.service.js` | Сервис инициализации OpenTelemetry diag логгера |
| `loggerMiddleware.js` | Express middleware для сбора HTTP-логов (запросы/ответы) |

### Поддерживаемые телеметрии

- **Трейсы** — через `OTLPTraceExporter` (опционально)
- **Метрики** — через `OTLPMetricExporter` с `PeriodicExportingMetricReader` (опционально)
- **Пользовательские метрики** — Counter, UpDownCounter, Histogram, Gauge через `Metrics.service.js` / `MetricsManager.service.js`
- **Логи консоли** — перехват `console.log/error/warn` (опционально)
- **HTTP-логи** — сбор детальной информации о запросах/ответах Express (опционально)
- **Process Mining события** — структурированные логи через OpenTelemetry Logs API для анализа бизнес-процессов (опционально)

### Сбор process mining событий

Агент предоставляет метод `recordProcessMiningEvent` для регистрации событий процессного майнинга через `Logger.service.js` или `index.js`:

```javascript
// Через Logger.service
const LoggerService = require('statistics-agent/services/Logger.service');
LoggerService.recordProcessMiningEvent('user.login');

// Через index.js (глобальный хелпер)
const { recordProcessMiningEvent } = require('statistics-agent');
recordProcessMiningEvent('order.placed', {
    'order.id': 'ord-789',
    'order.total': 159.99,
    'payment.method': 'credit_card',
});
```

### Пользовательские метрики

Агент предоставляет высокоуровневую абстракцию для создания и изменения пользовательских метрик через `index.js`:

```javascript
const { createMetric, getMetric, METRIC_TYPES } = require('statistics-agent');

// Создание счётчика
const mailSentMetric = await createMetric('mails.sent', {
    type: METRIC_TYPES.COUNTER,
    scope: 'mailings-chat-bots',
    description: 'Кол-во отправленных писем',
});
mailSentMetric.add(1, { type: 'notification' });

// Создание гистограммы
const latencyMetric = await createMetric('api.latency', {
    type: METRIC_TYPES.HISTOGRAM,
    description: 'Время ответа API',
    unit: 'ms',
});
latencyMetric.record(42, { endpoint: '/users' });

// Получение существующей метрики
const existingMetric = await getMetric('mails.sent');
```

Поддерживаемые типы метрик: `Counter`, `UpDownCounter`, `Gauge`, `Histogram`.

## Building and Running

### Запуск

Агент инициализируется автоматически при старте приложения через подключение `Init.service.js` или `index.js`. В конфигурации используются переменные окружения `global.env`.

> **Примечание:** Для удобства можно также использовать `index.js` — единый экспортный файл, который предоставляет методы `createMetric`, `getMetric`, `recordProcessMiningEvent`.

#### Обязательные переменные окружения

| Переменная | Описание |
|-----------|----------|
| `SERVICE_NAME` | Наименование сервиса (по умолчанию: "Неизвестный сервис") |
| `METRICS_EXPORT_URL` | API endpoint для сбора метрик (опционально) |
| `TRACES_EXPORT_URL` | API endpoint для сбора трейсов (опционально) |

**Важно:** Для сбора HTTP-логов и process mining событий также требуется `CONSOLE_EXPORT_URL`.

#### Параметры сбора консольных логов

| Переменная | Описание | Значение по умолчанию |
|-----------|----------|----------------------|
| `CONSOLE_EXPORT_ENABLED` | Включить сбор консольных логов | `false` |
| `CONSOLE_EXPORT_URL` | URL коллектора логов | - |
| `CONSOLE_LOGGER_MAX_EXPORT_BATCH_SIZE` | Макс. размер батча | `512` |
| `CONSOLE_LOGGER_MAX_QUEUE_SIZE` | Макс. очередь | `2048` |
| `CONSOLE_LOGGER_SCHEDULED_DELAY_MILLIS` | Интервал отправки | `5000` (5 сек) |
| `CONSOLE_LOGGER_EXPORT_TIMEOUT_MILLIS` | Таймаут экспорта | `30000` (30 сек) |

#### Параметры логирования OpenTelemetry diag

| Переменная | Описание | Значение по умолчанию |
|-----------|----------|----------------------|
| `STATISTICS_LOG_LEVEL` | Уровень логирования diag (1-5) | `0` (выключено) |

**Уровни логирования:**
- `0` — выключено (по умолчанию)
- `1` — ERROR (только ошибки)
- `2` — WARN (ошибки и предупреждения)
- `3` — INFO (ошибки, предупреждения, информационные)
- `4` — DEBUG (все + отладочные сообщения)
- `5` — VERBOSE (максимальный уровень)

**Важно:** `STATISTICS_LOG_LEVEL` должен быть задан **ДО** инициализации агента, так как diag логгер должен быть включен до всех остальных действий.

### Проверка SSL-сертификатов

При работе с серверами, использующими самоподписанные сертификаты, можно отключить проверку SSL-сертификатов:

| Переменная | Описание | Значение |
|-----------|----------|----------|
| `STATISTICS_AGENT_USE_SSL` | Включить/Отключить проверку SSL-сертификатов | `true` |

**Важно:** Отключение проверки SSL-сертификатов снижает безопасность соединения. Используйте только в доверенных сетях.

### Параметры сбора HTTP-логов

| Переменная | Описание | Значение по умолчанию |
|-----------|----------|----------------------|
| `HTTP_EXPORT_ENABLED` | Включить сбор HTTP-логов | `false` |
| `HTTP_EXPORT_URL` | URL коллектора HTTP-логов | - |
| `HTTP_LOGGER_MAX_EXPORT_BATCH_SIZE` | Макс. размер батча | `512` |
| `HTTP_LOGGER_MAX_QUEUE_SIZE` | Макс. очередь | `2048` |
| `HTTP_LOGGER_SCHEDULED_DELAY_MILLIS` | Интервал отправки | `5000` (5 сек) |
| `HTTP_LOGGER_EXPORT_TIMEOUT_MILLIS` | Таймаут экспорта | `30000` (30 сек) |

**Важно:** Для сбора HTTP-логов также требуется подключение middleware `loggerMiddleware.js` в Express приложении.

### Параметры для локальной разработки

| Переменная | Описание | Значение по умолчанию |
|-----------|----------|----------------------|
| `STATISTICS_DEV_MODE` | Включить режим локальной разработки | `false` |
| `STATISTICS_DEV_CN_HEADER` | Заголовок для подмены CN-сертификата | `'x-original-client-cn'` |
| `STATISTICS_DEV_CN` | Значение подменяемого CN-сертификата | `''` |

### Сборка и тестирование

Для установки зависимостей:
```bash
npm install
```

> **Примечание:** Тесты расположены в `__tests__/`, запускаются через `jest`.

## Development Conventions

### Код и структура

- **JavaScript (CommonJS)** — использование `require()` вместо ES-модулей
- **Классовый стиль** — сервисы реализованы как классы с экспортом экземпляра
- **Методы-фабрики** — конфигурационные методы (например, `getResourceConfig()`, `getAgentConfig()`, `getLoggerConfig()`)
- **Описание на русском языке** — комментарии и лог сообщения на русском
- **Документация JSDoc** — используется для описания методов

### Используемые расширения

Проект наследуется от `../../../core/class/Extensions.class` (класс `Extensions`), который предоставляет базовую функциональность.

`Metrics.service.js` и `MetricsManager.service.js` также наследуются от `Extensions` — это даёт доступ к общим методам валидации и логирования.

### Стандарты именования

- Классы: `PascalCase` (например, `AnalyticAgentService`, `ConfigService`, `MetricsService`, `MetricsManager`)
- Экземпляры классов: `camelCase` с суффиксом `Class` для класса и без для инстанса (например, `AnalyticAgentServiceClass` и `AnalyticAgentService`)
- Константы: `SCREAMING_SNAKE_CASE` (например, `LOG_LEVEL`, `METRICS_EXPORT_ENABLED`, `METRIC_TYPES`)

### Особенности реализации

1. **HTTP-контекст**: Используется `express-http-context` для передачи `sessionStorage` и `trace-id` между middleware
2. **Перехват потоков**: `process.stdout` и `process.stderr` переопределяются для перенаправления в OpenTelemetry
3. **Глобальные обработчики**: Перехват `uncaughtException` и `unhandledRejection`
4. **OpenTelemetry diag**: Используется базовый логгер OpenTelemetry для логирования всех действий агента
5. **Масштабируемость**: Настройки батчей и очередей позволяют адаптировать агент под разную нагрузку
6. **Метрики**: Поддержка 4 типов метрик через единый интерфейс `Metrics.service.js` / `MetricsManager.service.js`

### Текущие TODO

В коде присутствуют следующие TODO-заметки:

- `Init.service.js`: Добавить функционал маскирования данных; отправка полноценного лога без разбиения на строки
- `AnalyticAgent.service.js`: Поддержка `ConsoleSpanExporter` и `ConsoleMetricExporter` при отключенных экспортерах
- `Config.service.js`: Разделение конфигурации для каждого типа экспорта (метрики/трейсы)
- `Logger.service.js`: Убрать заголовок из логгера; переработать метод `buildLog`
- `loggerMiddleware.js`: Работа с buffers вместо string concatenation

### Конфигурация инструментаций

Автоинструментации настроены для добавления кастомных атрибутов в спаны:

- `user` — информация о пользователе из `sessionStorage`
- `request.locals` — данные `res.locals` или `req.res.locals`

## Константы

В модуле определены следующие константы для настройки логирования:

### Уровни логов для консольных логов

| Константа | Значение | Описание |
|-----------|----------|----------|
| `LOG_LEVEL.INFO` | `'INFO'` | Информационный уровень |
| `LOG_LEVEL.WARN` | `'WARN'` | Уровень предупреждений |
| `LOG_LEVEL.ERROR` | `'ERROR'` | Уровень ошибок |
| `LOG_LEVEL.DEBUG` | `'DEBUG'` | Уровень отладки |

### Уровни логирования OpenTelemetry diag

| Константа | Значение | Описание |
|-----------|----------|----------|
| `DIAG_LOG_LEVEL.NONE` | `0` | Логирование отключено |
| `DIAG_LOG_LEVEL.ERROR` | `1` | Только ошибки |
| `DIAG_LOG_LEVEL.WARN` | `2` | Ошибки и предупреждения |
| `DIAG_LOG_LEVEL.INFO` | `3` | Ошибки, предупреждения и информационные сообщения |
| `DIAG_LOG_LEVEL.DEBUG` | `4` | Все сообщения (включая отладочные) |
| `DIAG_LOG_LEVEL.VERBOSE` | `5` | Максимальный уровень логирования |

### Имена логгеров

| Константа | Значение | Описание |
|-----------|----------|----------|
| `PROCESS_MINING_LOGGER_NAME` | `'process-mining'` | Имя логгера для process mining событий |
| `PROCESS_MINING_LOGGER_VERSION` | `'1.0.0'` | Версия логгера для process mining |
| `HTTP_LOGGER_NAME` | `'http-logs'` | Имя логгера для HTTP-логов |
| `HTTP_LOGGER_VERSION` | `'1.0.0'` | Версия логгера для HTTP-логов |

### Типы пользовательских метрик

| Константа | Значение | Описание |
|-----------|----------|----------|
| `METRIC_TYPES.COUNTER` | `'Counter'` | Счётчик (только увеличение) |
| `METRIC_TYPES.UP_DOWN_COUNTER` | `'UpDownCounter'` | Счётчик (увеличение и уменьшение) |
| `METRIC_TYPES.GAUGE` | `'Gauge'` | Измеритель (произвольное числовое значение) |
| `METRIC_TYPES.HISTOGRAM` | `'Histogram'` | Гистограмма (распределение значений по корзинам) |

## File Structure

```
statistics-agent/
├── package.json                    # Зависимости OpenTelemetry
├── index.js                        # Единая точка экспорта (метрики + process mining)
├── src/
│   └── constants.js                # Константы (уровни логов, типы метрик)
├── services/
│   ├── AnalyticAgent.service.js    # Агент сбора телеметрии (трейсы/метрики через OTLP)
│   ├── Config.service.js           # Конфигурационный сервис
│   ├── DiagLogger.service.js       # Сервис инициализации OpenTelemetry diag логгера
│   ├── Init.service.js             # Инициализация агента
│   ├── Logger.service.js           # Сервис логирования
│   ├── Metrics.service.js          # Высокоуровневая абстракция для пользовательских метрик
│   └── MetricsManager.service.js   # Менеджер метрик (OpenTelemetry Metrics API)
├── middleware/
│   └── loggerMiddleware.js         # Express middleware для HTTP-логов
├── GIGACODE.md                     # Этот файл
└── README.md                       # Документация
```