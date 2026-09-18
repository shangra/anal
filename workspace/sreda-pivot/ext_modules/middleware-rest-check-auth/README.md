# middleware-rest-check-auth

Middleware NodeCMS для проверки аутентификации в REST API.

## Описание

Этот middleware проверяет, аутентифицирован ли пользователь, прежде чем разрешить доступ к защищённым API-эндпоинтам. Он проверяет наличие валидной пользовательской сессии, обращаясь к ID пользователя в хранилище сессий.

## Использование

Middleware должен использоваться как Express-мидлвар в определениях маршрутов REST API:

```javascript
const checkAuth = require('middleware-rest-check-auth');

// Защита маршрутов, требующих аутентификации
app.get('/api/protected-resource', checkAuth, (req, res) => {
    // Код обработчика — пользователь аутентифицирован
});

// Или с Express Router
router.use('/api', checkAuth);
```

## Поведение

- **Аутентифицированные пользователи**: Если в `sessionStorage.user.id` есть ID пользователя, middleware вызывает `next()` и позволяет запросу продолжиться.
- **Неавторизованные пользователи**: Если сессия или ID пользователя отсутствует, выбрасывается `ApiError.UnathorizedError()` (HTTP 401).

## Зависимости

- `sessionStorage` — Сервис хранилища сессий (предоставляется ядром NodeCMS)
- `http-context` — Сервис HTTP-контекста (предоставляется ядром NodeCMS)
- `ApiError` — Утилиты обработки ошибок (предоставляются ядром NodeCMS)

## Установка

```bash
npm install
```

## Сборка

```bash
npm run build
```

## Тестирование

```bash
npm test
```

## Версия

1.5.0
