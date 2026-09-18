# Statistics Agent UI — Агент аналитики для React-приложений

[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://react.dev)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-JS-blue)](https://opentelemetry.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org)

Этот пакет предоставляет простую и гибкую интеграцию OpenTelemetry для React-приложений. Он автоматически собирает трейсы HTTP-запросов (fetch и XMLHttpRequest) и отправляет их в ваш OTLP-collector для анализа производительности и поведения пользователей.

## Особенности

- ✅ Автоматический трейсинг всех `fetch` и `XMLHttpRequest` запросов
- ✅ Настраиваемые параметры отправки трейсов (batch size, задержки, таймауты)
- ✅ Поддержка игнорирования определённых URL
- ✅ Интеграция с OpenTelemetry Semantic Conventions
- ✅ Модульная архитектура для лёгкого расширения

## Установка

```bash
npm install @opentelemetry/api \
  @opentelemetry/context-zone \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-xml-http-request \
  @opentelemetry/instrumentation-user-interaction \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/resources \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/semantic-conventions
```

Установите сам пакет локально или добавьте его как подмодуль в ваш проект.

## Быстрый старт

```tsx
import { initAnalyticAgent } from '@your-org/statistics-agent-ui';

// Инициализация с параметрами по умолчанию
initAnalyticAgent();

// Или с кастомной конфигурацией
initAnalyticAgent({
    serviceName: 'my-app',
    serviceVersion: '1.2.3',
    otelCollectorUrl: '/api/to/analytics/otel/traces',
});
```

## Конфигурация

```typescript
interface IAnalyticsProps {
    otelCollectorUrl?: string;              // URL endpoint для отправки трейсов
    serviceName?: string;                   // Имя сервиса в трейсах
    serviceVersion?: string;                // Версия сервиса в трейсах
    maxExportBatchSize?: number;            // Макс. размер пакета экспорта (по умолчанию: 100)
    scheduledDelayMillis?: number;          // Задержка между отправкой (мс, по умолчанию: 5000)
    exportTimeoutMillis?: number;           // Таймаут экспорта (мс, по умолчанию: 30000)
    fetchIgnoreUrls?: (string | RegExp)[];  // URL для игнорирования в fetch
    xhrIgnoreUrls?: (string | RegExp)[];    // URL для игнорирования в XMLHttpRequest
}
```

### Примеры конфигурации

**Минимальная конфигурация:**
```tsx
initAnalyticAgent({
    serviceName: 'frontend-app',
});
```

**Полная конфигурация:**
```tsx
initAnalyticAgent({
    serviceName: 'frontend-app',
    serviceVersion: '2.0.0',
    otelCollectorUrl: 'https://otel-collector.example.com/v1/traces',
    maxExportBatchSize: 50,
    scheduledDelayMillis: 2000,
    exportTimeoutMillis: 10000,
    fetchIgnoreUrls: [
        /\/health$/,
        /\/metrics$/,
        /\/api\/internal\//,
    ],
    xhrIgnoreUrls: [
        /\/health$/,
        /\/metrics$/,
    ],
});
```

## Как это работает

1. При вызове `initAnalyticAgent()` создаётся `WebTracerProvider`
2. Регистрируется `BatchSpanProcessor` с OTLP-экспортером
3. Регистрируются инструментации для `fetch` и `XMLHttpRequest`
4. Каждый HTTP-запрос автоматически оборачивается в трейс-спан
5. Спаны собираются в пакеты и отправляются на указанный endpoint

## Поддерживаемые инструментации

| Инструментация | Статус | Описание |
|---------------|--------|----------|
| Fetch | ✅ Готово | Автоматический трейсинг fetch-запросов |
| XMLHttpRequest | ✅ Готово | Автоматический трейсинг XHR-запросов |
| User Interaction | 🔄 Планируется | Трейсинг взаимодействия пользователя (click, input и т.д.) |
| Document Load | 🔄 Планируется | Трейсинг загрузки и рендеринга документа |

## Результаты

После инициализации вы получите:

- Трейсы всех HTTP-запросов с метаданными (URL, метод, статус, длительность)
- Контекст трейсов с информацией о сервисе и версии
- Опциональные метрики производительности (в планах)

## Примеры проектов

- [React + Vite + Statistics Agent](https://github.com/example/react-vite-template)
- [Next.js + Statistics Agent](https://github.com/example/nextjs-template)

## Разработка

### Структура проекта

```
statistics-agent-ui/
├── index.tsx          # Основной файл, экспорт initAnalyticAgent()
├── types.ts           # TypeScript-типы
├── constants.ts       # Константы по умолчанию
├── package.json       # Зависимости и метаданные
└── README.md          # Документация
```

### Добавление новых инструментаций

1. Установите пакет: `npm install @opentelemetry/instrumentation-XXX`
2. Импортируйте: `import { XXXInstrumentation } from '@opentelemetry/instrumentation-XXX'`
3. Добавьте в массив инструментаций в `index.tsx`:
   ```typescript
   registerInstrumentations({
       tracerProvider,
       instrumentations: [
           // ... существующие
           new XXXInstrumentation({ /* опции */ }),
       ],
   });
   ```

## Лицензия

ISC
