# Module Federation в Micro Frontends

Module Federation — это технология, позволяющая встраивать один микрофронтенд внутрь другого. Для этого необходимо настроить конфигурацию сборщика на стороне фронтендов, добавив плагин `ModuleFederationPlugin` с соответствующими настройками. В рамках нашего портала используется сборщик CRACO, и все примеры будут рассмотрены на его основе.

## Описания проекта 

Проект построен на ядре Sreda Frontend, фактически является ядром разработки frontend решения приложения так и распростронения компонентов по технологии Micro Frontends. Для удобства разработки подключен storybook для документирования и изолированной разработки компонентов.

## Общая структура конфигурации Micro Frontends

Конфигурация в общем виде выглядит так:

```json
{
    ...,
    plugins: [...]
}
```

Существует два основных способа подключения микрофронтендов:

- **Static**: подключение через файл конфигурации `craco.config.js`, где известна точная структура и содержание на этапе сборки.
- **Runtime**: подключение через компонент `ModuleFederationCMP`, в котором конфигурации передаются через пропсы.

## Static способ подключения

### Пример конфигурации ModuleFederationPlugin

```javascript
new ModuleFederationPlugin({
    name: MODULE_FEDERATION_HOST_CONTAINER_NAME,
    exposes: {
        './ExportTestMFComponent': './src/module-federation/TestMF',
    },
    remotes: {
        './ImportTestMFComponent': 'someContainer@http://localhost:3000/remoteEntry.js',
    },
    filename: 'remoteEntry.js',
    shared: {...}
}),
```

### Поля конфигурации:

- **`name`**: уникальное имя ModuleFederation-контейнера, используемое для его обращения из других микрофронтендов.
- **`exposes`**: объект, где ключ — экспортируемый компонент, а значение — путь к компоненту. Например, если компонент `TestMF` лежит по пути `./src/module-federation/TestMF`, то в конфиге прописывается `'./ExportTestMFComponent': './src/module-federation/TestMF'`.
- **`remotes`**: объект, где ключ — имя импортируемого компонента, а значение — URL источника в формате `${containerName}@${host}:${port}/remoteEntry.js`.
- **`filename`**: имя бандла, создаваемого контейнером (обычно оставляют стандартное `remoteEntry.js`).
- **`shared`**: настройки совместного использования библиотек между фронтендами.

### Типизация и поддержка TypeScript

Если используется TypeScript, необходимо добавить дополнительный плагин `ModuleFederationTypesPlugin`, который поднимает отдельный сервер для распространения типов:

```javascript
new ModuleFederationTypesPlugin({
    typescriptFolderName: '@mf-types',
    federationConfig: {...},
    typeFetchOptions: {
        downloadRemoteTypesTimeout: 2000,
        maxRetryAttempts: 2,
        retryDelay: 1000,
        shouldRetryOnTypesNotFound: false,
        shouldRetry: true,
    },
    typeServeOptions: {
        port: Number(process.env.MF_TYPES_PORT) || 31000,
        host: 'localhost',
    },
}),
```

Типы автоматически подгружаются в директорию `@mf-types`, а компилятор TypeScript будет учитывать их, если правильно настроен `tsconfig.json`:

```json
{
    "compilerOptions": {
        "paths": {
            "*": ["./@mf-types/*"],
            ...
        },
        ...
    },
    ...
}
```

### Работа с вложенными директориями компонентов

В `craco.config.js` предусмотрена удобная функция `processModuleExportComponentsConfig`, принимающая конфигурацию директорий компонентов:

```javascript
[
    {
        dir: 'ExportModuleFederationComponentsDir',
        recursive: true,
        includeCurrentDir: false,
        excludePattern: /^local.*$/,
    }
]
```

Эта функция автоматически обрабатывает вложенные директории компонентов, избавляя от необходимости перечислять их вручную.

## Использование компонента

Компоненты могут быть использованы следующим образом:

```javascript
import React, { Suspense } from 'react';

const MfComponent = React.lazy(() => import('./ImportTestMFComponent'));

const LocalComponent = ({ title }) => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MfComponent title={title} />
        </Suspense>
    );
};
```

## Runtime способ подключения

Для динамического подключения компонентов используется компонент `ModuleFederationCMP`:

```javascript
<div>
    <ModuleFederationCMP 
        remoteModuleInfo={{
            remoteUrl: 'http://localhost:8080/remoteEntry.js',
            containerName: 'ModuleFederationComponents',
            module: './ExampleComponent',
        }} 
        remoteComponentProps={{title: 'title from front'}}
        loader={<div>loading micro-frontend...</div>}
    />
</div>
```

### Поля конфигурации `remoteModuleInfo`:

- **`remoteUrl`**: URL, откуда загружается модуль.
- **`containerName`**: имя контейнера ModuleFederation.
- **`module`**: имя модуля, который нужно импортировать.

### Поле `remoteComponentProps`:

Позволяет передавать пропсы в импортируемый компонент.

### Поле `loader`:

Элемент, отображающийся во время загрузки микрофронтенда.

---

Таким образом, модульная федерация предоставляет мощную инфраструктуру для интеграции и совместной работы фронтэнд-компонентов, облегчая построение микросервисной архитектуры фронтенда.
