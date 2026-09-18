# Агент аналитики Statistics Agent UI

## Обзор проекта

Это TypeScript-библиотека (React-компонент), реализующая агент сбора аналитических данных и трейсов на стороне клиента с использованием OpenTelemetry. Проект предназначен для интеграции в React-приложения и отправки трейсов в backend-сервис (OTLP collector) для последующего анализа производительности и поведения пользователей.

### Основные технологии

- **React 18.2.0** — основная библиотека
- **OpenTelemetry JS SDK** — сбор и экспортирование трейсов:
  - `@opentelemetry/sdk-trace-web` — браузерный SDK
  - `@opentelemetry/exporter-trace-otlp-http` — экспорт через OTLP/HTTP
  - `@opentelemetry/instrumentation-fetch` — автоматический трейсинг fetch-запросов
  - `@opentelemetry/instrumentation-xml-http-request` — автоматический трейсинг XMLHttpRequest
  - `@opentelemetry/instrumentation-user-interaction` — трейсинг взаимодействия пользователя (в планах)
  - `@opentelemetry/instrumentation-document-load` — трейсинг загрузки документа (в планах)
  - `@opentelemetry/context-zone` — управление контекстом трейсов
  - `@opentelemetry/resources` — атрибуты ресурсов (service.name, service.version)

### Архитектура

Проект представляет собой single-file библиотеку с следующей структурой:

| Файл | Назначение |
|------|------------|
| `index.tsx` | Главный файл, экспортирует `initAnalyticAgent()` — точку входа для инициализации агента |
| `types.ts` | TypeScript-интерфейсы и типы (в данный момент — `IAnalyticsProps`) |
| `constants.ts` | Константы по умолчанию (URL collector'а, имена сервисов, таймауты и т.д.) |
| `package.json` | Метаданные проекта и зависимости |

## Инициализация и использование

### Основной API

```typescript
import { initAnalyticAgent } from './index';

initAnalyticAgent({
    otelCollectorUrl: '/api/to/analytics/otel/traces',
    serviceName: 'my-app',
    serviceVersion: '1.0.0',
    maxExportBatchSize: 100,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
    fetchIgnoreUrls: [/\/health/, /\/metrics/],
    xhrIgnoreUrls: [/\/health/, /\/metrics/],
});
```

### Параметры конфигурации (`IAnalyticsProps`)

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `otelCollectorUrl` | `string` | `/api/to/analytics/otel/traces` | URL endpoint'а для отправки трейсов |
| `serviceName` | `string` | из `package.json` или `'ui'` | Имя сервиса в трейсах |
| `serviceVersion` | `string` | из `package.json` или `'0.0.0'` | Версия сервиса в трейсах |
| `maxExportBatchSize` | `number` | `100` | Максимальный размер пакета экспорта |
| `scheduledDelayMillis` | `number` | `5000` | Задержка между отправкой пакетов (мс) |
| `exportTimeoutMillis` | `number` | `30000` | Таймаут одного экспорта (мс) |
| `fetchIgnoreUrls` | `(string \| RegExp)[]` | `[/\/api\/to\/analytics\/otel\/.*/]` | Список URL для игнорирования в fetch |
| `xhrIgnoreUrls` | `(string \| RegExp)[]` | `[/\/api\/to\/analytics\/otel\/.*/]` | Список URL для игнорирования в XMLHttpRequest |

### Пример подключения

```tsx
import { initAnalyticAgent } from './index';

// В корне приложения (например, в App.tsx или main.tsx)
initAnalyticAgent({
    serviceName: 'statistics-agent-ui',
    serviceVersion: '1.0.0',
});
```

После инициализации:
- Все fetch-запросы автоматически трейсятся
- Все XMLHttpRequest-запросы автоматически трейсятся
- Трейсы отправляются пакетами в backend по указанному URL

## Сборка и запуск

**Примечание:** В текущем виде проект не содержит скриптов сборки, так как представляет собой библиотеку/модуль, а не самостоятельное приложение.

### Планируемые скрипты (todo)

В `package.json` отсутствуют скрипты `build`, `start`, `test`. Для полноценной работы рекомендуется добавить:

```json
{
  "scripts": {
    "build": "tsc --build",
    "start": "tsc --watch",
    "test": "jest",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

## Текущие ограничения и планы

### Отмечено в коде как TODO

1. **User Interaction Instrumentation** — добавить запись действий пользователя через `@opentelemetry/instrumentation-user-interaction`
2. **Document Load Instrumentation** — добавить запись скачивания/загрузки файлов через `@opentelemetry/instrumentation-document-load`

### Отсутствует

- TypeScript-конфигурация (`tsconfig.json`)
- Тесты (единственный скрипт `test` выводит сообщение об отсутствии тестов)
- Линтер (ESLint/Stylelint)
- README.md (этот файл)

## Конвенции разработки

### Стиль кода

- **Язык комментариев:** Русский
- **Именование:**
  - Функции и переменные: `camelCase` (`initAnalyticAgent`, `otelCollectorUrl`)
  - Типы и интерфейсы: `PascalCase` с префиксом `I` (`IAnalyticsProps`)
- **Логирование:** Используется `console.log` с эмодзи для визуального разделения уровней:
  - 🚀 — старт операции
  - ✅ — успех
  - ❌ — ошибка

### Обработка ошибок

Функция `initAnalyticAgent` оборачивает всю логику в `try-catch` и выбрасывает ошибку в случае неудачи с подробным логом в консоль.

### Управление трейсами

- Используется `ZoneContextManager` для корректного распространения контекста трейсов через асинхронные вызовы
- Регистрация инструментаций через `registerInstrumentations()`
- Кастомный tracer для диагностики (`react-app`)

## Рекомендации для будущих взаимодействий

1. **Добавление новых инструментаций** — смотреть раздел «Текущие ограничения и планы»
2. **Изменение констант по умолчанию** — редактировать `constants.ts`
3. **Добавление новых типов** — редактировать `types.ts`
4. **Изменение основной логики** — редактировать `index.tsx`
5. **При добавлении зависимостей** — обновлять `package.json` и учитывать совместимость OpenTelemetry версий
