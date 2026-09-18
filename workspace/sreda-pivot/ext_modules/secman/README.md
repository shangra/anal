# Secman

- В коннектор добавлена вкладка Secman
- Если включить `use_vault_password`, пароль к БД берется из Vault, а не из поля `password`.
- Для AppRole/Kubernetes поддержан логин в Vault через `secman`.
- Для Postgres включена передача SSL-настроек из коннектора.

## Вкладка Secman

Обязательные поля:

- `vault_endpoint`
- `vault_auth` (`approle` или `k8s`)
- `vault_tenant` (путь к секрету)
- `vault_secret_key` (обычно `password`)
- `vault_role_id`

Дополнительно:

- `vault_secret_id` — для `approle` (или через `APPSEC_SECRET` в env)
- `vault_k8s_jwt` — для `k8s`
- `vault_namespace` — если используется namespace

### Вкладка Основное

Остаются обычные параметры БД: `host`, `port`, `database`, `schema`, `user`.
Поле `password` при включенном Secman не используется.
