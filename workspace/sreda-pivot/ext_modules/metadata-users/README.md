# metadata-users

Абстракция метаданных **«Пользователи»**. Управляет записями о пользователях системы: создание, чтение, обновление, удаление, валидация. Сервис наследует `DefaultMetaObject` из `metadata-cmp` и подключается к админ-панели через хуки `MetadataService.*`.

Категория: **абстракция метаданных** (`metadata-*`).

Версия: **1.5.3**.

## Назначение

Хранит и управляет информацией о пользователях NodeCMS-приложения. Каждый пользователь описывается идентификатором, логином, статусом аккаунта, именем и массивом дополнительных характеристик. Используется как основа для аутентификации и авторизации внутри сервиса.

## Установка

```bash
sbr i metadata-users
```

Или добавить в `dependenciesNodeCMS` своего сервиса и выполнить:

```bash
npm run core:collect
npm run db:up
npm start
```

Требования: ядро SREDA `core ^1.5.0`, модули `metadata-cmp`, `auth`, `metadata-forms`.

## Маршруты (REST API)

Корневой роут: **`/metadata/users`** (роутер `Users.router.js`).

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/metadata/users/metadata` | Получить форму создания пользователя. |
| POST | `/metadata/users/metadata` | Создать запись метаданных пользователя. |
| GET | `/metadata/users/metadata/:id` | Получить форму редактирования пользователя. |
| PUT | `/metadata/users/metadata/:id` | Обновить запись метаданных пользователя. |
| DELETE | `/metadata/users/metadata/:id` | Удалить запись метаданных пользователя. |
| GET | `/metadata/users/:id` | Прочитать данные пользователя по ID. |
| POST | `/metadata/users/:id` | Создать данные пользователя. |
| PUT | `/metadata/users/:id` | Обновить данные пользователя. |
| DELETE | `/metadata/users/:id` | Удалить данные пользователя. |

## Расширения (хуки)

| Хук | Класс | Функция |
| --- | --- | --- |
| `MetadataService.getClassesMetadata.after` | `services/Users.service.js` | `getClassesMetadata` |
| `MetadataService.getTreeChildrenV3.after` | `services/Users.service.js` | `getTreeChildrenV3` |

## Зависимости (`dependenciesNodeCMS`)

| Модуль | Версия | Назначение |
| --- | --- | --- |
| `metadata-cmp` | `^1.5.4` | Базовый класс `DefaultMetaObject`, сервис метаданных. |
| `auth` | `^1.5.0` | Аутентификация. |
| `metadata-forms` | `^1.5.0` | Связи на формы (`formelement`, `formlist`, `formchoice`). |

## Роли доступа

| Роль | Где проверяется | Доступ |
| --- | --- | --- |
| `Adminpanel`, `MetadataAdmin` | `Users.router.js` (блок `/metadata/*`) | Администрирование метаданных пользователей. |
| `MetadataRead`, `MetadataDataRead` | `Users.router.js` (блок `/:id`, `true` — пропуск если роль одна из) | Чтение данных пользователя. |
| `MetadataDataRead` | `GET /metadata/users/:id` | Чтение. |
| `MetadataDataWrite` | `POST/PUT/DELETE /metadata/users/:id` | Запись/удаление. |

## Сервис `UsersService`

Исходник: `services/Users.service.js`. Класс наследует `DefaultMetaObject`.

- `id`, `component` — берутся из `constants.js`.
- `form(id)` — форма с одной вкладкой «Основное», поля описаны в `getFormFields()`.
- `getFormFields()` — поля: `formelement` (форма документа, REF → `FormsService`), `formlist` (форма списка), `formchoice` (форма выбора).
- `createMetadata(body, transaction)`, `updateMetadata(body, transaction)` — переопределяют родительские методы для дополнительной логики.
- `_convertToNodeType(page)` — внутренний метод преобразования данных в формат `NodeType`.
- `getTreeChildrenV3(innerResult, functionParams)` — фильтрует дерево метаданных (скрывает определённые типы узлов).

## Источник истины

- `package.json` — `routes`, `extensions`, `dependenciesNodeCMS`.
- `services/Users.service.js`, `constants.js`.
- `metadata-cmp/README.md` — базовый класс `DefaultMetaObject`, соглашения по роутам/хукам.

## Тестирование

Юнит- и HTTP-тесты на Jest 27 + supertest. Реальная БД не поднимается — `Metadata.service` мокается.

```bash
# Только этот модуль
cd ext_modules/metadata-users && npm test

# Все модули (pretest поднимает тестовую БД)
npm test
```

Файлы:

- `__tests__/tests/Users.service.test.js` — `UsersService` (form, getFormFields, validate, createMetadata/updateMetadata, getAll/getChildren, _convertToNodeType, getTreeChildrenV3).
- `__tests__/tests/Users.controller.test.js` — `UsersController` с моком сервиса.
- `__tests__/tests/Users.router.test.js` — HTTP-роуты `/metadata/users/*` через локальный express + supertest, `checkAccess` замокан как no-op.

## Если нашёл ошибку / хочешь правку

Если в модуле `metadata-users` обнаружена ошибка, нехватка функциональности или нужно добавить новую кнопку в форму пользователей — **не правьте код модуля локально**. Оформите **change request** команде-владельцу:

```bash
sbr publish --cr
```

В описании укажите:

- **Что** — наблюдаемое поведение или желаемая фича (например: «кнопка „Клонировать“ не появляется при открытии формы пользователя с ролью `MetadataRead`»).
- **Зачем** — бизнес-контекст, почему это нужно.
- **Как воспроизвести** — шаги / пример запроса / скриншот; версия модуля; версия `core`.
- **Окружение** — версия `core`, версия Node, целевой сервис.

CR уходит команде-владельцу `metadata-users`. После принятия правка попадает в новый релиз и становится доступна всем через `sbr i metadata-users`. См. также раздел 8.0 задачи `SRDMDLTKLN-513`.
