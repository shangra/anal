## Задача SRDMDLTKLN-525: Прокидывание `server` во все API-вызовы `MetadataForms`

### 1. Контекст и архитектурная модель

`frontend-admin` (см. `.sdd/arh.md`) — хост Module Federation и одновременно самостоятельная SPA админ-панели SREDA. В дереве компонентов платформы `MetadataForms` играет роль **низкоуровневого рендера форм метаданных**: на его основе строятся формы редактирования, списки и табличные части, открываемые из `Inspector`, `MetadataHier` и `MetadataWindow`. Эти формы, в свою очередь, оборачиваются компонентом `FormMetadata`, который получает сверху **имя сервера** (через пропс `server`) и публикует его вниз через React-Context (`MetadataServerContext`) + явные пропсы.

**Сервер** в этой системе — это префикс URL backend'а, к которому идут запросы формы. Списки серверов приходят из `/systemsettings/servers/info` (`MetadataWindow/index.tsx`), каждый открывается в **отдельном окне** с собственным деревом и своими `MetadataHier` / `FormMetadata`. URL запросов формируется хелпером `buildUrl(server, path)` (`src/components/MetadataForms/DataManager/buildUrl.js`) по правилу:

```text
/<server>/<path>     если server непустой
/<path>              иначе
```

Сейчас `server` уже **частично** прокинут через дерево (см. §2 — baseline), но **не во всех** API-вызовах и **не во всех** компонентах `MetadataForms`. Цель этой задачи — закрыть этот пробел.

### 2. Текущее состояние (baseline на момент актуализации задачи)

Инвентаризация API-вызовов в `src/components/MetadataForms/` показала следующую картину.

#### 2.1. API-вызовы, которые УЖЕ передают `server`

| Файл | Метод / вызов | Источник `server` |
| --- | --- | --- |
| `DataManager/Api.js` | `Api.fetchFieldsByObject`, `Api.getFieldsByLinkGUID`, `Api.getFieldsByLinkName` | Параметр функции (с дефолтом `''`). |
| `DataManager/ApiManager.js` | `Load`, `LoadData`, `UpdateData`, `CreateData`, `DeleteData` | `this.server`, зафиксированный в конструкторе из `options.server`. |
| `DataManager/index.js` | (делегирует в ApiManager) | `props.server` + `MetadataServerContext` (читается **только** в `componentDidMount`). |
| `ElementsList/index.tsx` | `metadataAPI.getDataInRowsAndCols` (внутри `fetchData`) | `props.server`, зафиксированный в конструкторе в `this.metadataAPI = new MetadataAPI(props.server)`. |
| `Buttons/Filter/index.js` | `Api.fetchFieldsByObject` | `this.DataManager?.server` (читается в момент клика). |
| `Buttons/FilterButton/index.js` | `Api.fetchFieldsByObject` | `this.DataManager?.server`. |
| `Buttons/Add/index.js` | открывает `<FormMetadata server={this.DataManager?.server}>` | `this.DataManager?.server`. |
| `Buttons/Copy/index.js` | открывает `<FormMetadata server={this.DataManager?.server}>` | `this.DataManager?.server`. |
| `Buttons/Based/index.js` | открывает `<FormMetadata server={this.DataManager?.server}>` | `this.DataManager?.server`. |
| `Buttons/Edit/edit.helper.js` | открывает `<FormMetadata server={dataManager?.server}>` | `dataManager?.server`. |
| `Buttons/Delete/index.js` | `this.DataManager.Delete()` (транзитивно через ApiManager) | `DataManager.server`. |

**Сильная сторона baseline:** паттерн «кнопки читают `this.DataManager?.server` в момент клика» уже устоялся и работает корректно — если пользователь переключился на другой сервер в дереве, новая форма/кнопка прочитает свежий `DataManager.server`.

**Слабая сторона baseline:** `server` фиксируется **в конструкторе** в `ApiManager` и `MetadataAPI`. Это работает до тех пор, пока `DataManager` живёт столько же, сколько форма; но семантически `server` должен быть атрибутом запроса, а не атрибутом долгоживущего инстанса. Зафиксированное в конструкторе значение — это «запах», который и нужно устранить.

#### 2.2. API-вызовы, которые НЕ передают `server` (проблемы, которые решает задача)

| Файл | Метод / вызов | Что не так |
| --- | --- | --- |
| `Inputs/BlobInput/index.tsx:64` | `$api.get('/files/get/${uuid}')` | Жёстко зашитый URL, без префикса. Если форма открыта на не-дефолтном сервере, файл пойдёт на основной backend. |
| `Inputs/BlobInput/index.tsx:78` | `window.open('/api/files/get/${uuid}/${name}${ext}')` | То же. |
| `Inputs/Ref/index.tsx:120` | `$api.get('/${meta.routes.toLowerCase()}/${meta.id}?options=${query}')` (внутри `getServiceData`) | Без префикса. |
| `Inputs/Ref/index.tsx:135` | `$api.get('metadata/object/${this.props.metaRef.value}')` (внутри `getMetadata`) | Без префикса. |
| `Inputs/Ref/index.tsx:177` | открывает `<FormMetadata ... />` в `editElement` | Без пропа `server` — открытая форма потеряет контекст сервера. |
| `Inputs/Ref/index.tsx:254` | `$api.get(url)` (внутри `loadMoreCallback`) | URL собирается без `buildUrl(server, ...)`. |
| `Buttons/Conducting/index.js:34` | `$api.get('/metadata/transfer/${id}?options=${options}')` | Без префикса. |
| `Buttons/Conducting/index.js:41` | `$api.post('/metadata/transfer/${link}', ...)` | Без префикса. |
| `Buttons/Conducting/index.js:48` | `$api.delete('/metadata/transfer/${link}', ...)` | Без префикса. |

> **Сценарий пользователя, который сейчас ломается.** Оператор открывает дерево сервера 1, в форме элемента у него есть BlobInput с прикреплённым файлом или RefInput, ссылающийся на элемент справочника. Затем оператор **переключается на сервер 2** в дереве, открывает форму с похожей структурой, нажимает «Открыть» у RefInput или делает «Провести» на документе. Без фикса: RefInput/BlobInput/Conducting делают запросы на **основной** backend (`/files/get/...`, `/metadata/transfer/...`), а не на сервер 2 — данные либо возвращаются с основного сервера, либо возвращают 404/403, и форма перестаёт работать. После фикса — все запросы корректно префиксуются `server=2`.

#### 2.3. Инфраструктура, которая уже есть и используется не полностью

- `src/components/MetadataForms/DataManager/serverContext.js` — `createContext('')` (`MetadataServerContext`).
- `src/components/FormMetadata/index.js:63` — `<MetadataServerContext.Provider value={this.props.server ?? ''}>`.
- `src/components/MetadataForms/DataManager/index.js:26` — `static contextType = MetadataServerContext`, чтение только в `componentDidMount`.
- Кнопки `Add`, `Copy`, `Based`, `Edit`, `Filter`, `FilterButton`, `Delete` — корректно прокидывают `server` через пропс `<FormMetadata server={this.DataManager?.server}>`.

То есть **канал передачи `server` существует, но в `BlobInput`, `Ref` и `Conducting` он не подключён**. Их нужно подключить к этому каналу.

### 3. Целевое состояние (что должно стать после выполнения задачи)

#### 3.1. Семантика

1. `server` становится **обязательным** (required) параметром у всех низкоуровневых API-хелперов: `Api.fetchFieldsByObject`, `Api.getFieldsByLinkGUID`, `Api.getFieldsByLinkName`, `ApiManager.constructor.server`, `MetadataAPI.constructor.server`, `TabularPartLoader.constructor.server`.
2. Тип параметра — `string` (без `?`). Значение `''` (пустая строка) допустимо и означает «основной сервер» (default backend). Это **не** «необязательность» — это валидное значение, явно передаваемое вызывающим кодом.
3. Все **компоненты** `MetadataForms`, которые инициируют HTTP-запросы (`BlobInput`, `Ref`, `Conducting`, любые будущие inputs/buttons), обязаны принимать `server` через пропсы (от родителя — `DataManager`/`MetaInput`) и **передавать его** в каждый запрос.
4. Кнопки, открывающие `<FormMetadata>` (`Add`, `Copy`, `Based`, `Edit`, `Ref.editElement`), обязаны передавать `server` в открываемое окно — иначе вложенная форма потеряет контекст.
5. Уже **открытые** окна (формы, таблицы, модалки) **не перерендериваются** при смене сервера в дереве — это требование UX. Новое окно, открытое после смены, получает свежий сервер естественным образом, потому что `DataManager` для него создаётся заново с актуальным `props.server` от родителя.

#### 3.2. Граф потоков `server` после фикса

```text
InspectorWindow / MetadataWindow
        │
        │  server (пропс)
        ▼
   FormMetadata                  ◀── server пробрасывается в props.server,
        │                             оборачивает детей в MetadataServerContext.Provider
        │  server (пропс + context)
        ▼
   DataManager                   ◀── читает server из props/context,
        │                             this.#ApiManager.server синхронизируется в cDMount.
        │  this.server (поле)
        ├──────────────────────────► Buttons (Add/Copy/Based/Edit/Filter/FilterButton/Delete/Save…)
        │                              │
        │                              │  читают this.DataManager?.server в момент клика
        │                              ▼
        │                          Api.fetchFieldsByObject(server)
        │                          <FormMetadata server={this.DataManager?.server} />
        │
        │  server (пропс)
        ▼
   MetaInput                     ◀── читает server из this.DataManager.server,
        │                             передаёт в inputs как пропс server.
        │  server (пропс)
        ├──────────────────────────► BlobInput   ──► $api.get(buildUrl(server, 'files/get/...'))
        ├──────────────────────────► Ref        ──► $api.get(buildUrl(server, '...'))
        │                                          ► <FormMetadata server={...} />
        ├──────────────────────────► (другие inputs без HTTP — без изменений)
        │
        │  server (пропс)
        ▼
   ElementsList                  ◀── читает server из props/server,
        │                             this.metadataAPI = new MetadataAPI(server).
        │  server (в metadataAPI)
        └──────────────────────────► metadataAPI.getDataInRowsAndCols(...)
                                    (внутренний buildUrl)
```

#### 3.3. Изменяемые файлы и точки правки

| # | Файл | Что меняется |
| --- | --- | --- |
| 1 | `src/components/MetadataForms/DataManager/Api.js` | `server` — required (`server: string`), без дефолта `''`. |
| 2 | `src/components/MetadataForms/DataManager/ApiManager.js` | В конструкторе `server` — required: `this.server = options.server;`. |
| 3 | `src/components/Metadata/MetadataAPI/index.ts` | В конструкторе `server: string` — required. |
| 4 | `src/components/Metadata/TabularPartLoader/index.ts` | В конструкторе `server: string` — required, `metadataAPI = new MetadataAPI(server)`. |
| 5 | `src/components/MetadataForms/Inputs/BlobInput/index.tsx` | Принимает `server` в `IBlobInputOptionalProps`; использует в `fetchFileInfo` (`buildUrl(server, 'files/get/${uuid}')`) и `onClick` (`/api${buildUrl(server, `files/get/${uuid}/${name}${ext}`)}`). |
| 6 | `src/components/MetadataForms/Inputs/Ref/index.tsx` | Принимает `server` в `IRefInputOptionalProps`; использует в `getServiceData`, `getMetadata`, `loadMoreCallback` (через `buildUrl`); передаёт `server` в `<FormMetadata>` в `editElement`. |
| 7 | `src/components/MetadataForms/Buttons/Conducting/index.js` | Использует `this.DataManager?.server` в трёх API-вызовах (`getConductingRequest`, `sendConductingAcceptRequest`, `sendConductingRejectRequest`). |
| 8 | `src/components/MetadataForms/MetaInput/index.jsx` | В `renderInputByType` прокидывает `server={this.DataManager?.server}` во все inputs, которые делают HTTP-запросы (`BlobInput`, `Ref`). |
| 9 | `src/components/MetadataForms/DataManager/index.d.ts` | `DataManagerProps.server: string` (без `?`); `ApiManager.constructor.server: string` (без `?`). |

Изменения в TS-типах отражают **новый контракт**: `server` — обязательный параметр. Это даст TypeScript-ошибку там, где `DataManager` или `ApiManager` создаются без `server`. Поскольку в реальном коде `DataManager` создаётся через `SberDynamicComponent` (динамически по схеме с сервера), а сам `DataManager` создаётся через инжект пропсов из `FormMetadata` — дополнительной ручной правки мест создания не требуется; все существующие конструкторы уже получают `server` через `props` или `context`.

### 4. Аудитория и результаты

| Аудитория | Что получает |
| --- | --- |
| Разработчик `frontend-admin` | Чёткий контракт: «`server` — обязательный параметр всех API-вызовов внутри `MetadataForms`». Линтер / TypeScript ловит отсутствие `server` до рантайма. |
| Разработчик host-приложения (MF-потребитель) | Гарантия: форма, открытая из любого места, всегда ходит на правильный сервер. Не нужно патчить `MetadataForms` локально ради бага «файл не открывается на втором сервере». |
| Тех-лид / владелец `frontend-admin` | Архитектурный инвариант «сервер всегда с запросом» зафиксирован в коде, типах и `.sdd`. |
| Оператор админ-панели | Формы, открытые на сервере 2, корректно открывают файлы, проводят документы и резолвят RefInput'ы **через сервер 2**, а не через основной backend. |

### 5. Что осталось сделать

#### 5.1. Изменения в коде (по разделам §3.3)

1. **API-хелперы (4 файла).**
   - В `Api.js` убрать `server = ''` дефолт → `server: string` (сигнатура `async (..., server: string)`).
   - В `ApiManager.js` заменить `this.server = options.server ?? '';` на `this.server = options.server;`. Валидация: если `options.server === undefined` — бросать `new Error('ApiManager: options.server is required')`.
   - В `MetadataAPI/index.ts` — `server: string` без дефолта `''`, валидация в конструкторе.
   - В `TabularPartLoader/index.ts` — `server: string` без дефолта.

2. **`BlobInput/index.tsx`.**
   - Расширить `IBlobInputOptionalProps` — добавить поле `server?: string` (на уровне компонента остаётся опциональным, чтобы не ломать существующие тесты/использования; но если передан — используется).
   - В `fetchFileInfo` использовать `buildUrl(this.props.server ?? '', \`files/get/${uuid}\`)`.
   - В `onClick` — `/api${buildUrl(this.props.server ?? '', \`files/get/${uuid}/${name}${ext}\`)}`.

3. **`Ref/index.tsx`.**
   - Добавить `server?: string` в `IRefInputOptionalProps`.
   - В `getServiceData`: `$api.get(buildUrl(this.props.server ?? '', \`${meta.routes.toLowerCase()}/${meta.id}?options=${query}\`), ...)`.
   - В `getMetadata`: `$api.get(buildUrl(this.props.server ?? '', \`metadata/object/${this.props.metaRef.value}\`), ...)`.
   - В `loadMoreCallback`: переписать сборку URL через `buildUrl(this.props.server ?? '', \`${metadata.routes}/${metadata.id}?options=${query}\`)`.
   - В `editElement`: `<FormMetadata ... server={this.props.server ?? ''} />`.

4. **`Conducting/index.js`.**
   - В `getConductingRequest`: `$api.get(buildUrl(this.DataManager?.server ?? '', \`metadata/transfer/${id}?options=${options}\`), ...)`.
   - В `sendConductingAcceptRequest`: то же.
   - В `sendConductingRejectRequest`: то же.

5. **`MetaInput/index.jsx`.**
   - В `renderInputByType` для `BlobInput` и `Ref` добавить пропс `server={this.DataManager?.server ?? ''}`.

6. **`DataManager/index.d.ts`.**
   - `DataManagerProps.server: string` (убрать `?`).
   - В декларации конструктора `ApiManager` — `server: string` (убрать `?`).

#### 5.2. Тесты

Существующий тест `BlobInput.test.tsx` не передаёт `server` — поведение остаётся обратно совместимым (`server` опционален на уровне пропсов компонента, дефолт `''`). Прогнать:

```bash
npx craco test --watchAll=false src/components/MetadataForms/Inputs/BlobInput/__test__/BlobInput.test.tsx
```

#### 5.3. Проверки

```bash
npm run ts-check               # типы зелёные (после правок .d.ts)
npm run test:all               # тесты зелёные
npm run eslint -- src/components/MetadataForms src/components/Metadata src/components/FormMetadata
npm run build:local            # прод-сборка
```

### 6. Чек-листы

#### 6.1. Чек-лист baseline'а

- [x] Инвентаризация API-вызовов `MetadataForms` проведена.
- [x] Список файлов, не передающих `server`, зафиксирован (3 файла: `BlobInput`, `Ref`, `Conducting`).
- [x] Список файлов, фиксирующих `server` в конструкторе, зафиксирован (`ApiManager`, `MetadataAPI`).

#### 6.2. Чек-лист изменений

- [ ] `Api.js` — `server` без дефолта `''` в трёх статических методах.
- [ ] `ApiManager.js` — `server: string` required в конструкторе, валидация.
- [ ] `MetadataAPI/index.ts` — `server: string` required в конструкторе, валидация.
- [ ] `TabularPartLoader/index.ts` — `server: string` required.
- [ ] `BlobInput/index.tsx` — принимает `server`, использует в `fetchFileInfo` и `onClick`.
- [ ] `Ref/index.tsx` — принимает `server`, использует в трёх API-вызовах и в `editElement`.
- [ ] `Conducting/index.js` — использует `this.DataManager?.server` в трёх API-вызовах.
- [ ] `MetaInput/index.jsx` — прокидывает `server` в `BlobInput` и `Ref`.
- [ ] `DataManager/index.d.ts` — `server: string` без `?` в `DataManagerProps` и конструкторе `ApiManager`.

#### 6.3. Чек-лист проверок

- [ ] `npm run ts-check` зелёный.
- [ ] `npm run test:all` зелёный.
- [ ] `npm run eslint` для затронутых файлов зелёный.
- [ ] `npm run build:local` собирается без ошибок.
- [ ] Существующий `BlobInput.test.tsx` не сломан.

### 7. Критерии приёмки

- Все API-вызовы внутри `src/components/MetadataForms/` и `src/components/Metadata/` (`MetadataAPI`, `TabularPartLoader`, `Api`, `ApiManager`, `BlobInput`, `Ref`, `Conducting`) передают `server` явно через параметр функции / конструктора.
- Тип `server: string` (без `?`) зафиксирован в TS-декларациях `DataManager` и `ApiManager`.
- Поведение для обратной совместимости сохранено: `''` (пустая строка) — валидное значение, эквивалентное «основной сервер» (default backend).
- `BlobInput`, `Ref`, `Conducting` используют `this.props.server ?? ''` (или `this.DataManager?.server ?? ''`), чтобы не ломать существующие unit-тесты и внешние использования компонентов без пропса `server`.
- `MetaInput` прокидывает `server={this.DataManager?.server}` в `BlobInput` и `Ref`.
- `npm run ts-check`, `npm run test:all`, `npm run build:local` зелёные.
- Документация в `.sdd/tasks/SRDMDLTKLN-525-metadataforms-server-required.md` (этот файл) синхронизирована с фактическими изменениями.

### 8. Связанные источники

- `.sdd/arh.md` — разделы «Module Federation», «Структура директории `src/components`».
- `GIGACODE.md` — разделы «Module Federation usage», «Component organization».
- `README 2.md` — описание static/runtime MF-подключения.
- `craco.config.js` — `MODULE_FEDERATION_EXPORT_COMPONENTS`, `resolve.alias`, `shared`, `FederatedTypesPlugin`.
- `tsconfig.json` (корневой) — `compilerOptions.paths` для алиасов.
- `src/components/MetadataForms/DataManager/buildUrl.js` — единственный хелпер префиксации URL сервером.
- `src/components/MetadataForms/DataManager/Api.js`, `ApiManager.js`, `index.js`, `serverContext.js`, `index.d.ts` — основные файлы `DataManager`.
- `src/components/Metadata/MetadataAPI/index.ts` — `MetadataAPI` (используется `FormMetadata` и `ElementsList`).
- `src/components/Metadata/TabularPartLoader/index.ts` — `TabularPartLoader` (используется через `MetadataAPI.getTabularPartsByMetadataIdOnly`).
- `src/components/FormMetadata/index.js` — входная точка `MetadataForms`, провайдер `MetadataServerContext`.
- `src/components/MetadataForms/Inputs/BlobInput/index.tsx` — компонент BlobInput.
- `src/components/MetadataForms/Inputs/Ref/index.tsx` — компонент Ref.
- `src/components/MetadataForms/Buttons/Conducting/index.js` — компонент Conducting.
- `src/components/MetadataForms/MetaInput/index.jsx` — диспетчер inputs, прокидывает пропсы.
- `src/components/MetadataForms/Buttons/{Add,Copy,Based,Edit,Filter,FilterButton,Delete}/...` — примеры корректного прокидывания `server` через `DataManager`.
- SRDMDLTKLN-504 — связанная задача по удалению legacy.
- SRDMDLTKLN-513 — задача по документации (developer/integration guide).
- SRDMDLTKLN-522 — задача по импортам MF-экспортируемых модулей.
