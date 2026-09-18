# ui-kit compat (Sreda Analytics)

Временный drop-in вместо корпоративного `ui-kit` для внешней/локальной поставки админки.

- API-имена совпадают с импортами админки (`Button`, `ThemeProvider`, иконки, константы).
- Внешний вид — нейтральный enterprise (зелёный primary), без жёсткой привязки к Сбер UI.
- **Не перетирает** боевой пакет: коробка кладёт tgz в `frontend-adm/vendors/ui-kit/` только если файла ещё нет.

Замена на боевой:
1. Положить настоящий `ui-kit-1.6.17.tgz` в `workspace/frontend-adm/vendors/ui-kit/`
2. `rm -rf node_modules/ui-kit && npm install`
