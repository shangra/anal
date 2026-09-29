# MDM UI Application — Frontend Project

## Project Overview

**MDM UI Application** — это frontend-платформа для управления метаданными (Master Data Management), построенная на ядре Sreda Frontend. Проект реализует архитектуру Micro Frontends с использованием **Webpack Module Federation**, что позволяет интегрировать отдельные микрофронтенды как встроенные компоненты.

### Основные технологии

| Категория | Технологии |
|-----------|-----------|
| **Framework** | React 18.2.0, TypeScript 5.6.3 |
| **Routing** | React Router DOM 6.0.2 |
| **UI Library** | Bootstrap 5.3.0, bootstrap-icons, ui-kit (vendored) |
| **Build Tool** | CRACO (Create React App Configuration Override) 7.1.0 |
| **Module Federation** | Webpack Module Federation + @module-federation/typescript 3.1.3 |
| **State Management** | lite-react-statemanager |
| **Testing** | Jest, @testing-library/react |
| **Documentation** | Storybook 7.6.19 |

### Архитектура

Проект поддерживает два способа подключения микрофронтендов:

1. **Static (статический)** — конфигурация через `craco.config.js`, задаётся на этапе сборки
2. **Runtime (динамический)** — через компонент `ModuleFederationCMP` с пропсами

## Building and Running

### Основные команды

| Команда | Описание |
|---------|----------|
| `npm start` | Запуск dev-сервера (порт по умолчанию 3000) с очисткой Module Federation файлов |
| `npm run startw` | Запуск dev-сервера без очистки |
| `npm run start:debug` | Запуск в debug-режиме с логированием (порт 3100, MF_TYPES_PORT 31000) |
| `npm run build` | Сборка production-версии (HTTPS включен) |
| `npm run build:local` | Локальная сборка без ESLint |
| `npm run build:analyze` | Сборка с анализом бандла (webpack-bundle-analyzer) |
| `npm run buildssldev` | SSL dev-сборка с отладкой (PUBLIC_URL=/mdm_ui) |
| `npm run test` | Запуск тестов в watch-режиме |
| `npm run test:all` | Запуск всех тестов без watch |
| `npm run test:coverage` | Генерация coverage-отчета (text) |
| `npm run test:coverage:html` | Генерация HTML coverage-отчета |
| `npm run test:report:json` | JSON-отчет в формате SonarQube |
| `npm run test:report:junit` | JUnit-отчет для CI/CD |
| `npm run storybook` | Запуск Storybook на порту 6006 |
| `npm run build-storybook` | Сборка статической версии Storybook |

### Переменные окружения

- `ESB_HOST` — хост бэкенда для проксирования `/api` (по умолчанию)
- `MODULE_FEDERATION_CONTAINER_NAME` — имя контейнера Module Federation (по умолчанию `MDM_UI_COMPONENTS`)
- `PUBLIC_URL` — путь публикации (например `/mdm_ui`)
- `REACT_APP_BACKEND_PREFIX` — префикс бэкенд API (по умолчанию `/api`)
- `REACT_APP_DOMAIN` — домен приложения
- `MF_TYPES_PORT` — порт сервера типов Module Federation (по умолчанию 31000)

## Development Conventions

### Кодстайл

- **Линтер**: ESLint с конфигурацией `airbnb` + `prettier`
- **Форматтер**: Prettier
  - Отступ: 4 пробела
  - Точка с запятой: обязательна
  - Одинарные кавычки в JS/TS
  - Трейлинг-запятая: `all`
  - Ширина строки: 127 символов

### Именование и структура

- Компоненты React — в папках под `src/components/`
- Экспортируемые компоненты Module Federation — в подпапках `src/components/MDM/` и `src/components/Flowdemo/`
- TypeScript-описания — в файлах `.d.ts`
- Имена интерфейсов/типов: `I*` или `*.type.ts` / `*.types.ts`

### Module Federation

Компоненты для экспорта автоматически обнаруживаются скриптом `processModuleExportComponentsConfig` в `scripts/helpers/moduleFederationConfigProcessor/`.

**Конфигурация экспорта в `craco.config.js`:**
```javascript
const MODULE_FEDERATION_EXPORT_COMPONENTS = [
    {
        dir: 'MDM',
        recursive: true,       // сканировать вложенные папки
        includeCurrentDir: true, // включать папку MDM itself
        excludePattern: /^local.*$/, // паттерн исключения
    },
    {
        dir: 'Flowdemo',
    },
];
```

Компонент в папке `src/components/MDM/MyComponent/` будет экспортирован как `./MyComponent`.

### Использование экспортированных компонентов

**Static (статический импорт):**
```javascript
import React, { Suspense } from 'react';

const MfComponent = React.lazy(() => import('./ExportedComponentName'));

const App = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <MfComponent prop1="value" />
    </Suspense>
);
```

**Runtime (динамический через компонент):**
```javascript
import { ModuleFederationCMP } from '...';

<ModuleFederationCMP
    remoteModuleInfo={{
        remoteUrl: 'http://localhost:8080/remoteEntry.js',
        containerName: 'SomeContainer',
        module: './ExampleComponent',
    }}
    remoteComponentProps={{ title: 'value' }}
    loader={<div>Loading...</div>}
/>
```

### TypeScript конфигурация

- Типы из Module Federation автоматически подгружаются в `@mf-types/`
- Путь `*` в `tsconfig.json` резолвится в `./@mf-types/*`
- Используется `react-jsx` трансформ
- `noFallthroughCasesInSwitch`, `noImplicitAny`, `strict` включены

### Тестирование

- Jest + @testing-library/react
- Mоки для стилей и ассетов настроены через `moduleNameMapper`
- Исключаются из coverage: type-файлы, ui-утилиты, MetadataGuideList, некоторые папки компонентов
- Отчеты генерируются в форматах: text, HTML, JSON, JUnit, Cobertura, LCOV

### Storybook

- Конфигурация в `.storybook/main.ts`
- Поддержка autodocs по тегам
- Папка для статических файлов: `../public`
- Используется SWC--builder
- Дополнительные stories: `../src/**/*.stories.@(js|jsx|mjs|ts|tsx)`

### Специфические особенности

1. **Polyfills**: для Node.js-библиотек используются browserify-полифилы (path, crypto, stream)
2. **Babel**: все пакеты bpmn-js и зависимые транспилируются через babel-jest
3. **Window errors**: глобальный handler перехватывает и подавляет React-слушатели ошибок
4. **Bootstrap**: импортированы CSS и JS (ESM и Bundle версии)
5. **Formatters/Parser**: json2jsx, jsx2json, fast-formula-parser, editorjs

## Key Files

| Файл | Назначение |
|------|-----------|
| `src/index.tsx` | Точка входа приложения |
| `src/bootstrap.js` | Инициализация React, роутинг, глобальные обработчики |
| `src/App/App.js` | Основной компонент приложения с роутами |
| `src/components/routes.js` | Конфигурация маршрутов |
| `craco.config.js` | Конфигурация Webpack и Module Federation |
| `tsconfig.json` | Настройки TypeScript |
| `.eslintrc.js` | Конфигурация ESLint |
| `.prettierrc.json` | Конфигурация Prettier |
| `.storybook/main.ts` | Конфигурация Storybook |
| `scripts/helpers/moduleFederationConfigProcessor/` | Утилиты для обработки конфигурации MF |

## Примечания

- Запуск dev-сервера автоматически очищает папки `build` и `@mf-types` (см. скрипт `refresh-module-federation-files`)
- В production-сборке отключен ESLint для ускорения
- Для работы с API используется кастомный axios-хелпер (`src/helpers/axios.jsx`)
- Поддерживается темизация через `ui-kit` (ThemeProvider с темой DARK_THEME по умолчанию)
- Используется windows helper (`src/components/ui/windows.helper`) для открытия форм в отдельных окнах
