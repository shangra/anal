# metadata-rules

Абстракция метаданных **«Правила»**. Управляет правилами доступа/маршрутизации: создание, чтение, обновление, удаление. Сервис наследует `DefaultMetaObject` из `metadata-cmp` и подключается к админ-панели через хуки `MetadataService.*`.

Категория: **абстракция метаданных** (`metadata-*`).

Версия: **1.5.3**.

## Назначение

Управление метаданными правил в приложении NodeCMS. Модуль предоставляет REST API для CRUD-операций над правилами и обеспечивает проверку прав доступа к ресурсам и обработку ошибок при работе с данными.

## Установка

```bash
sbr i metadata-rules
```

Или добавить в `dependenciesNodeCMS` своего сервиса:

```bash
npm run core:collect
npm run db:up
npm start
```

Требования: ядро SREDA `core ^1.5.0`, модули `metadata-cmp`, `auth`, `metadata-forms`.

## Маршруты (REST API)

Корневой роут: **`/metadata/rules`** (роутер `Rules.router.js`).

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/metadata/rules/metadata` | Получить форму создания правила. |
| POST | `/metadata/rules/metadata` | Создать запись метаданных правила. |
| GET | `/metadata/rules/metadata/:id` | Получить форму редактирования правила. |
| PUT | `/metadata/rules/metadata/:id` | Обновить запись метаданных правила. |
| DELETE | `/metadata/rules/metadata/:id` | Удалить запись метаданных правила. |
| GET | `/metadata/rules/:id` | Прочитать данные правила по ID. |
| POST | `/metadata/rules/:id` | Создать данные правила. |
| PUT | `/metadata/rules/:id` | Обновить данные правила. |
| DELETE | `/metadata/rules/:id` | Удалить данные правила. |

## Расширения (хуки)

| Хук | Класс | Функция |
| --- | --- | --- |
| `MetadataService.getClassesMetadata.after` | `services/Rules.service.js` | `getClassesMetadata` |
| `MetadataService.getTreeChildrenV3.after` | `services/Rules.service.js` | `getTreeChildrenV3` |

## Зависимости (`dependenciesNodeCMS`)

| Модуль | Версия | Назначение |
| --- | --- | --- |
| `metadata-cmp` | `^1.5.4` | Базовый класс, сервис метаданных. |
| `auth` | `^1.5.0` | Аутентификация. |
| `metadata-forms` | `^1.5.0` | Связи на формы. |

## Роли доступа

| Роль | Где проверяется | Доступ |
| --- | --- | --- |
| `Adminpanel`, `MetadataAdmin` | `Rules.router.js` (блок `/metadata/*`) | Администрирование метаданных правил. |
| `MetadataRead`, `MetadataDataRead` | `Rules.router.js` (блок `/:id`, `true` — пропуск если одна из) | Чтение данных правила. |
| `MetadataDataRead` | `GET /metadata/rules/:id` | Чтение. |
| `MetadataDataWrite` | `POST/PUT/DELETE /metadata/rules/:id` | Запись/удаление. |

## Сервис `RulesService`

Исходник: `services/Rules.service.js`. Класс наследует `DefaultMetaObject`.

- `id`, `component` — из `constants.js`.
- `form()` — форма с одной вкладкой «Основное», поля описаны в `getFormFields()`.
- `getFormFields()` — поля: `formelement`, `formlist`, `formchoice` (REF → `FormsService`).

## Источник истины

- `package.json`, `services/Rules.service.js`, `constants.js`.
- `metadata-cmp/README.md` — базовый класс `DefaultMetaObject`.

## Если нашёл ошибку / хочешь правку

Если в модуле `metadata-rules` обнаружена ошибка или нужна новая функциональность — **не правьте код модуля локально**. Оформите **change request**:

```bash
sbr publish --cr
```

В описании укажите **Что / Зачем / Как воспроизвести / Окружение** (версия модуля, версия `core`). CR уходит команде-владельцу `metadata-rules`. См. также раздел 8.0 задачи `SRDMDLTKLN-513`.
