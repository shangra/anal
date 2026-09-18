# Сервис `pivot`

## Переменные окружения

### Файлы .env

```bash
.env
.env.${NODE_ENV}
.env.local
.env.${NODE_ENV}.local
```

### Переменные ядра
```bash
NODE_ENV=development

LOG_PREFIX=false
LOG_LEVEL=1

VAR=var # $(pwd)/var
DB_DIR=db # ${VAR}/db

DB_BEFORECREATESCHEMA=
DB_AFTERCREATESCHEMA=

DB_HOST=
DB_PORT=
DB_DATABASE=
DB_SCHEMA=
DB_USER=
DB_PASS=
DB_DIALECT=
DB_PATRONI=
DB_POOL={"max":100,"min":0,"idle":1000}
DB_SSL_CA=
DB_SSL_KEY=
DB_SSL_CERT=

CRYPTO_SALT=cwd()

# Человекопонятное имя сервиса
SERVICE_NAME=
# Имя сервиса в инструкциях шины
ESB_NAME=
# Адрес шины
ESB_HOST=
# Адрес сервиса
HOST=

REDIS_CLIENT=

# Включает монитор ресурсов
RESOURCES_MONITOR=false
# Частота логирования информации, мс
MONITOR_LOG_PERIOD=30000
# Частота проверки лага event loop, мс
MONITOR_EVENT_LOOP_LAG_PREIOD=${MONITOR_LOG_PERIOD}
```

### Переменные модулей
```bash
# compression
COMPRESSION_CONFIG={"level":1}

# error-stack-trace
STACK_TRACE_LIMIT=10

# logger-mis
WRITE_HTTP_LOG=false

# memorysave-ext-helpers
DISABLE_OVERRITE_CACHE=false
# memorysave-ext-metadata-tree
DISABLE_TREE_CACHE=false
# memorysave-metadata
DISABLE_DATA_CACHE=false

# memorysave-storage-redis
REDIS_MEMORYSAVE_CLIENT=${REDIS_CLIENT}
REDIS_RETRY_ATTEMPT=50
REDIS_RETRY_TIME=5000
REDIS_MIN_LO_SIZE=20000 # Начиная с какого размер массива он начнет складываться чанками
REDIS_LO_CHUNK_SIZE=500 # Размер чанка
REDIS_LO_BATCH_CONCURRENCY=10 # Количество одновременно обрабатываемых чанков

# meta-ddl-dump
DDLCFG_RELAX_CONNECTOR_DIALECTS=true
DDLCFG_RELAX_CONNECTOR_DIFFERENCE=true
DDLCFG_TRACK_LAYER_FIELDS=true
DDLCFG_TRACK_LAYER_COUNTS=false
DDLCFG_OUTPUT_COUNT_CHECK=true
DDLCFG_JK_NORM_TYPE=TEXT
DDLCFG_JK_TEST_NORM=true
DDLCFG_JK_TEST_HARD=true
DDLCFG_JK_TEST_SOFT=true
DDLCFG_JK_FORCECAST=DDLCFG_FLUSH_IDPID_TYPE=true
DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS=new
DDLCFG_TRACK_SEQUELIZE_TRANSFORM=false
DDLCFG_COMPLAIN_EMPTY_FN=false

# meta-dumpdb
CUBES_FORCE_DUMP=false

# meta-new-cube-page
OLAP_PARENT=
REPORTS_PARENT=

# metadata-cmp
FORCE_REWRITE_METADATA_ON_RESTORE=false

# metadata-connector
MAX_POOL_SIZE=3
CRED_PATH=
CONNECTOR_SALT=$(pwd)

# metadata-gp-timeout
SQL_REQUEST_TIMEOUT=

# metadata-xlsx-download
# reports-xlsx-download
MAXCOUNTXLSXREPORT=5000

# middleware-rest-upload-file
UPLOAD_DIR=uploads # ${VAR}/uploads
UPLOAD_TTL=600000
FILE_SIZE_LIMIT=52428800
REDIS_MULTER_CLIENT=${REDIS_CLIENT}

# pivot-table
PIVOT_WORKER_ON=false
PIVOT_ANSWER_TTL=300000

# redis-ext-itable-metadata
# Отключить itable-кеш (фоллбэк на прямые запросы в БД)
CFGMETAMODEL_ITABLE_DISABLE=false
# Интервал принудительного сброса кеша в мс (0 = отключить)
CFGMETAMODEL_REFRESH_INTERVAL=60000
# Имя шины событий (должно совпадать на всех репликах)
CFGMETAMODEL_BUS_NAME=md_dirtyq
# Включить подробное логирование
CFGMETAMODEL_LOG_DEBUG=false
CFGPIVOTCHAN_LOG_DEBUG=false

# redis-ext-session-secondary
REDIS_SESSIONS_CLIENT=${REDIS_CLIENT}

# json-body-ext-rest-express
# Максимальный размер json-тела входящего запроса
JSON_REQUEST_LIMIT=10

# cors-ext-rest-express
# От каких доменов принимаем запросы (CORS)
CORS_ORIGIN=

# system-settings
SHUTDOWN_TIMEOUT=4000
```

## Описание команд npm run

```bash
npm run core:collect # собирает индексные файлы ядра
npm run db:collect # собирает файлы миграций, дампов и сидов
npm run db:drop # полностью очищает БД
npm run db:migrate:up # устанавливает все новые миграции
npm run db:migrate:down # заготовка для отката миграций (не работает)
npm run db:migrate:down:all # откатывает ВСЕ миграции
npm run db:seed:up # устанавливает все сиды
npm run db:dumps:restore # востанавливает все дампы
npm run db:dumps:backup # создает дампы всех данных БД
npm run db:renew # пересоздает БД с установкой всего с нуля (бывшая db)
npm run db:up # устанавливает обновления (миграции, дампы, сиды) (бывшая updatedb)
```

## Тестирование

В модуле должна быть директория `__tests__`.
Содержимое директории:
- `setup.js` - установка выполняющаяся перед всеми тестами модуля.
- `tests` - директория с тестами.
- `fixtures` - фикстуры для тестов

Для запуска всех тестов, находясь в корне проекта выполнить `npm test`.
Для запеска тестов модуля, необходимо перейти в директорию модуля и вызвать `npm test`.

## Локальный запуск

```bash
npm ci
npm run core:collect
npm run db:up
```


## Запуск в docker

```bash
vi ~/.npmrc
```
```
//sberosc.sigma.sbrf.ru/repo/npm/:_auth=<BASE64_SBEROSC_TOKEN>
//nexus-ci.delta.sbrf.ru/repository/npm-dev/:_auth=<BASE64_NEXUS_TOKEN>
@sber-navi-ui:registry=https://nexus-ci.delta.sbrf.ru/repository/npm-dev/
@sber-dr-mis:registry=https://nexus-ci.delta.sbrf.ru/repository/npm-dev/
registry=https://sberosc.sigma.sbrf.ru/repo/npm/
disturl=https://token:<SBER_OSC_TOKEN>@sberosc.sigma.sbrf.ru/repo/extras/nodejs/
lockfile-include-tarball-url=true
auto-install-peers=true
strict-peer-dependencies=false
audit=false
always-auth=true
fetch-retries=5
```

```bash
docker build -f Dockerfile.development --secret id=npmrc,src=<PATH_TO_NPMRC>/.npmrc --build-arg PORT=3081 -t misp-pivot:latest .
docker run -d --env-file .env -v ./:/app -p 3081:3081 --add-host host.docker.internal:host-gateway --name misp-pivot misp-pivot:latest
```

Перезапуск с ребилдом контейнера запущенного в docker compose
```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build pivot
```

## Содержание

1. [Архитектура сервиса](#service-architecture)
2. [Установка модулей](#modules-install)
- 2.1. [Установка модуля/обновление уже существующего](#install-or-upgrade)
- 2.2. [Обновление всех модулей сервиса](#all-modules-upgrade)
- 2.3. [Публикация пакетов](#modules-publish)
3. [Настройка env](#setup-envs)
4. [Запуск сервиса](#service-launch)
5. [Модули](#modules)

## 1. Архитектура сервиса <a id="service-architecture" name="service-architecture"></a>

Сервис построен на модульной архитектуре. Его простейшей единицей является модуль - <br />
пакет с полноценным версионированием, зависимостями, описанием и другой информацией, зафиксированным в package.json модуля. <br />
Существуют межмодульные зависимости - для работы одного модуля может быть необходим другой модуль. <br />
Информация о межмодульных зависимостях также отображена в package.json файле. <br />
Некоторые модули должны запускаться в определенном порядке - это регулирует файл [connectionPriority.json](./ext_modules/connectionPriority.json). <br />
В сервисе есть функционал, позволяющий переносить данные, например, с одного стенда на другой - загрузка дампов.<br />
Это определенный json-формат данных, который загружается в базу данных командой

```
npm run updatedb
```

Эта команда пробегается по всем модулям, находит лежащие в них дампы и производит анализ дампа по timestamp. <br />
Если такой дамп уже загружался - повторно он загружен не будет. Выгрузка дампов доступна прямо из админского интерфейса. <br />
После этого происходит скачивание файла дампа, который необходимо перенести в соответствующий модуль в папку `db/dumps/`. <br />
Таким образом могут быть склонированы различные сущности такие как шаблоны, страницы, виджеты, подпрограммы, процессы. <br />

Также сервис имеет удобное решение для разработки модулей - перегрузки - механизм, который в случае надобности позволяет зарегистрировать хук(before/inner/after), <br />
который или преобразует входные данные и прокинет их в перегружаемую функцию (хук <span style="color: green">before</span>),
или отработает вместо перегружаемой функции сервиса (хук <span style="color: green">inner</span>), <br />
или отработает после перегружаемой функции, получив внутрь результаты работы перегружаемой функции (хук <span style="color: green">after</span>). <br />
Зарегистрировать хук перегрузки можно в секции `extensions` в package.json модуля. 
Синтаксис регистрации имеет следующий вид в package.json модуля:
```
"extensions": {
        "<Перегружаемый сервис>.<Перегружаемая функция сервиса>.<before|inner|after>": {
            "class": "<Путь до класса, в котором прописана функция, которая перегрузит исходную>",
            "function": "название функции, которая перегрузит исходную"
        },
}
```
Например, для перегрузки функции <br />
`startIndexing` в `AdminSearchService` и регистрации `after`-хука `startIndexingAuthAfter` package.json примет такой вид:
```
"extensions": {
        "AdminSearchService.startIndexing.after": {
            "class": "/services/AdminSearchExtAuth.service.js",
            "function": "startIndexingAuthAfter"
        },
}
```

## 2. Установка и работа с модулями <a id="modules-install" name="modules-install"></a>

Работа с модулями происходит через утилиту sbr. Данная утилита позволяет устанавливать и распаковывать пакеты, публиковать и обновлять пакеты. <br />
<br />

### 2.1. <u>Установка модуля/обновление уже существующего</u> <a id="install-or-upgrade" name="install-or-upgrade"></a>

Доступны через команду

```
sbr install <название модуля>
```

выполняемую в корневой директории сервиса. При ее исполнении стягиваются и распаковываются архивы модуля и его зависимостей <br />
в папку `ext_modules` относительно корня сервиса. <br />

<br />

### 2.2. <u>Обновление всех модулей сервиса</u> <a id="all-modules-upgrade" name="all-modules-upgrade"></a>

Доступно с помощью локального скрипта через команду

```
./upd.sh
```

выполняемую в корневой директории сервиса. При ее исполнении анализируются все зависимости и обновляются до последней версии. <br />
В случае наличия неопубликованных изменений при выполнении этой скрипта они будут затерты. <br />

<br />

<div style="border-left: 2px solid white; padding-left: 10px;">
    <span style="color: red">Важно!</span> <br />
    После установки для применения миграций и других изменений необходимо выполнить команду <br />
    <pre><code class="language-javascript">npm run updatedb</code></pre>
</div>

<br />

### 2.3. <u>Публикация пакетов</u> <a id="modules-publish" name="modules-publish"></a>

Доступна через команду

```
sbr publish
```

выполняемую в директории публикуемого модуля <br />

<div style="border-left: 2px solid white; padding-left: 10px;">
    <span style="color: red">Важно!</span> <br />
    Перед публикацией важно обновить версию в package.json модуля. В случае конфликта версий публикация модуля будет отменена. <br />
    Перед внесением изменений в пакеты и их публикацией необходимо удостовериться, что используется последняя версия пакета. <br />
</div>

<br />

## 3. <u>Настройка env</u> <a id="setup-envs" name="setup-envs"></a>

Сервис имеет несколько обязательных env-переменных, а именно: <br />

1. **DB_DIALECT** - диалект базы данных (postgres|mysql|...)
2. **DB_HOST** - хост базы данных
3. **DB_PORT** - порт базы данных
4. **DB_DATABASE** - название базы данных
5. **DB_SCHEMA** - схема, с которой будет работать backend **DB_PASS** - пароль пользователя БД
6. **DB_USER** - пользователь для входа в БД
7. **DB_USER** - пароль пользователя базы данных
8. **ESB_HOST** - хост шины данных - сервиса для обмена данными между микросервисами
9. **ANALYTIC_HOST** - хост сервиса по аналитике

Также есть несколько необязательных параметров:

1. **ESB_HOST** - хост шины данных - необходим для интеграции с другими сервисами (default value: <span style="color: red">нет</span>)
2. **ANALYTIC_HOST** - хост сервиса по аналитике - необходим для отправки логов в сервис аналитики (default value: <span style="color: red">нет</span>)
3. **CORS_ORIGIN** - настройки CORS-взаимодействия - массив урлов, строка-урл или '\*' (default value: <span style="color: red">нет</span>)
4. **DB_TEST_DATABASE** - название тестовой базы данных (база находится на **DB_HOST**) (default value: <span style="color: red">нет</span>)
5. **DB_POOL** - настройки пулла коннектов (макс. кол-во коннектов, минимальное кол-ко коннектов, время простоя до уничтожения коннекта) (default value: <span style="color: green">{ max: 100, min: 0, idle: 1000 }</span>)
6. **AD_CONFIG** - добавление групп AD в сессию пользователя (default value: <span style="color: red">нет</span>)
7. **SALT** - соль для кодировки пароля
8. **ESB_NAME** - для интеграции с шиной - оповещение шины о включении (default value: <span style="color: red">нет</span>)
10. **SUDIR_HOST** - хост службы авторизации SUDIR (default value: <span style="color: red">нет</span>)
11. **HOST** - хост бекенда для взаимодействия с шиной (default value: <span style="color: red">нет</span>)
12. **PORT** - порт, на котором слушает сервер (default value: <span style="color: green">3080</span>)
13. **EXT_ENABLED** - массив подключенных модулей, в случае пустого массива все включены (default value: <span style="color: green">[]</span>)
14. **JWK_OPEN_ID_HOST** - переменная необходимая дял получения JWKeys от SUDIR (default value: <span style="color: red">нет</span>)
15. **EN_FINPORTAL** - переменная отвечающая за интеграцию с Fin Порталом (default value: <span style="color: red">нет</span>)

### 4. <u>Запуск сервиса</u> <a id="service-launch" name="service-launch"></a>

Запуск сервиса включает в себя следующий порядок действий:

1. установка модулей
2. создание базы данных и первичное заполнение с помощью команды
<div style="border-left: 2px solid white; padding-left: 10px;">
    <span style="color: red">Важно!</span> <br />
    Данная команда делается только один раз при инициализации сервиса! <br />
    Выполнение данной команды вторично приведет к потере всех данных в БД и инциализации и заполнению новой дефолтными данными <br/>
</div>
```
npm run db
```

3. применение миграций с помощью команды

```
npm run updatedb
```

4. выполнение команды npm i
5. настройка env-переменных
6. запуск dev-сервера (сервер будет отслеживать изменения в файлах сервиса и автоматически производить применение изменений и перезагрузку) с помощью команды

```
npm run dev
```

<br />

## 5. Модули <a id="modules" name="modules"></a>

1. **[auth](ext_modules/auth/README.md)** - Модуль, отвечающий за авторизацию, регистрацию, ограничение по правам на работу с пользователем и его доступами
2. **[dump-cms](ext_modules/dump-cms/README.md)** - Создание и восстановление бекапов таблиц через файлы json-формата (дампы)
3. **[middleware-rest-check-auth](ext_modules/middleware-rest-check-auth/README.md)** - Модуль `middleware-rest-check-auth` является промежуточным слоем (middleware), предназначенным для защиты REST API от несанкционированного доступа. При каждом запросе он проверяет наличие валидного идентификатора пользователя (`user.id`) в хранилище сессий через сервис `sessionStorage`. В случае отсутствия авторизации генерируется ошибка `UnathorizedError`, если же пользователь авторизован, обработка запроса продолжается далее.
4. **[middleware-rest-upload-file](ext_modules/middleware-rest-upload-file/README.md)** - Модуль `middleware-rest-upload-file` предоставляет REST API для обработки файлов через HTTP-запросы. Он поддерживает как простую загрузку одиночных файлов, так и разделение больших файлов на фрагменты (чанкинг), обеспечивая их сборку после завершения передачи всех частей. Для хранения используется либо локальная файловая система (`DiskStorage`), либо распределённое хранилище Redis (`RedisStorage`), при этом выбор зависит от конфигурации окружения.
5. **[middleware-rest-validate](ext_modules/middleware-rest-validate/README.md)** - Модуль `middleware-rest-validate` представляет собой промежуточное ПО (middleware), предназначенное для проверки данных запросов в REST API. Он использует библиотеку `express-validator`, чтобы проверять корректность переданных пользователем данных. Если обнаружены ошибки валидации, то генерируется ошибка типа `BadRequest` с указанием конкретных ошибок, иначе запрос передается дальше по цепочке обработчиков.
6. **[rls-core](ext_modules/rls-core/README.md)** - Корневой модуль для работы с РЛС (row-level security) - получение ограничений по доступу, назначение и удаление доступов
7. **[system-settings-dumps](ext_modules/system-settings-dumps/README.md)** - Настройки прав для пользователей
