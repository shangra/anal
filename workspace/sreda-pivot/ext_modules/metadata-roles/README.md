# metadata-roles

Абстракция метаданных **«Роли»**. Управляет ролями пользователей: создание, чтение, обновление, удаление. Сервис наследует `DefaultMetaObject` из `metadata-cmp` и подключается к админ-панели через хуки `MetadataService.*`.

Категория: **абстракция метаданных** (`metadata-*`).

Версия: **1.5.4**.

## Назначение

Управление ролями пользователей в системе NodeCMS. Через эту абстракцию администратор создаёт роли, назначает им набор прав (`Adminpanel`, `MetadataAdmin`, `MetadataRead`, `MetadataDataRead`, `MetadataDataWrite` и т.п.), которые в дальнейшем проверяются middleware `checkAccess` других модулей.

## Установка

```bash
sbr i metadata-roles
```

Или добавить в `dependenciesNodeCMS` своего сервиса:

```bash
npm run core:collect
npm run db:up
npm start
```

Требования: ядро SREDA `core ^1.5.0`, модули `metadata-cmp`, `auth`, `metadata-forms`.

## Маршруты (REST API)

Корневой роут: **`/metadata/roles`** (роутер `Roles.router.js`).

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/metadata/roles/metadata` | Получить форму создания роли. |
| POST | `/metadata/roles/metadata` | Создать запись метаданных роли. |
| GET | `/metadata/roles/metadata/:id` | Получить форму редактирования роли. |
| PUT | `/metadata/roles/metadata/:id` | Обновить запись метаданных роли. |
| DELETE | `/metadata/roles/metadata/:id` | Удалить запись метаданных роли. |
| GET | `/metadata/roles/:id` | Прочитать данные роли по ID. |
| POST | `/metadata/roles/:id` | Создать данные роли. |
| PUT | `/metadata/roles/:id` | Обновить данные роли. |
| DELETE | `/metadata/roles/:id` | Удалить данные роли. |

В отличие от большинства абстракций, **все** маршруты `/metadata/*` и `/:id` требуют роль `Adminpanel` или `MetadataAdmin` — управление ролями всегда под администраторским контролем.

## Расширения (хуки)

| Хук | Класс | Функция |
| --- | --- | --- |
| `MetadataService.getClassesMetadata.after` | `services/Roles.service.js` | `getClassesMetadata` |
| `MetadataService.getTreeChildrenV3.after` | `services/Roles.service.js` | `getTreeChildrenV3` |

## Зависимости (`dependenciesNodeCMS`)

| Модуль | Версия | Назначение |
| --- | --- | --- |
| `metadata-cmp` | `^1.5.4` | Базовый класс, сервис метаданных. |
| `auth` | `^1.5.0` | Аутентификация. |
| `metadata-forms` | `^1.5.0` | Связи на формы. |

## Роли доступа

| Роль | Где проверяется | Доступ |
| --- | --- | --- |
| `Adminpanel`, `MetadataAdmin` | все методы `Roles.router.js` | Полный доступ к ролям. |
| `MetadataDataRead` | `GET /metadata/roles/:id` | Чтение данных роли. |
| `MetadataDataWrite` | `POST/PUT/DELETE /metadata/roles/:id` | Создание/изменение/удаление данных роли. |

## Сервис `RolesService`

Исходник: `services/Roles.service.js`. Класс наследует `DefaultMetaObject`.

- `id`, `component` — из `constants.js`.
- `form()` — форма с одной вкладкой «Основное», поля описаны в `getFormFields()`.
- `getFormFields()` — поля: `formelement`, `formlist`, `formchoice` (REF → `FormsService`).

## Источник истины

- `package.json`, `services/Roles.service.js`, `constants.js`.
- `metadata-cmp/README.md` — базовый класс `DefaultMetaObject`.
- `middleware-rest-check-access/services/checkAccess.js` — middleware проверки ролей.

## Если нашёл ошибку / хочешь правку

Если в модуле `metadata-roles` обнаружена ошибка или нужна новая функциональность (например, новое поле в форме роли, новый тип роли, интеграция с внешним IdP) — **не правьте код модуля локально**. Оформите **change request**:

```bash
sbr publish --cr
```

В описании укажите **Что / Зачем / Как воспроизвести / Окружение** (версия модуля, версия `core`). CR уходит команде-владельцу `metadata-roles`; после принятия правка попадает в новый релиз. См. также раздел 8.0 задачи `SRDMDLTKLN-513`.
