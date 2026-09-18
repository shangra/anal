# query-builder

Библиотека для программного построения SQL-запросов через неизменяемое AST (Abstract Syntax Tree) с поддержкой нескольких диалектов СУБД.

---

## Содержание

- [query-builder](#query-builder)
  - [Содержание](#содержание)
  - [1. Назначение](#1-назначение)
  - [2. Архитектура](#2-архитектура)
    - [2.1 AST-слои](#21-ast-слои)
    - [2.2 Почему `Projection` ≠ `Column`](#22-почему-projection--column)
  - [3. Builder API (`b.*`)](#3-builder-api-b)
    - [Выражения](#выражения)
    - [Клаузы](#клаузы)
    - [Операторы (statements)](#операторы-statements)
  - [4. Диалекты и вывод SQL](#4-диалекты-и-вывод-sql)
  - [5. Сериализация](#5-сериализация)
  - [6. Примеры](#6-примеры)
    - [6.1 Простой SELECT](#61-простой-select)
    - [6.2 JOIN с несколькими условиями](#62-join-с-несколькими-условиями)
    - [6.3 GROUP BY + HAVING + агрегаты](#63-group-by--having--агрегаты)
    - [6.4 ORDER BY + LIMIT/OFFSET](#64-order-by--limitoffset)
    - [6.5 Оконная функция](#65-оконная-функция)
    - [6.6 CTE (WITH)](#66-cte-with)
    - [6.7 UNION ALL](#67-union-all)
    - [6.8 INSERT + ON CONFLICT DO UPDATE + RETURNING](#68-insert--on-conflict-do-update--returning)
    - [6.9 UPDATE](#69-update)
    - [6.10 DELETE](#610-delete)
    - [6.11 MERGE](#611-merge)
    - [6.12 Сериализация и восстановление AST](#612-сериализация-и-восстановление-ast)
    - [6.13 Один AST — несколько диалектов](#613-один-ast--несколько-диалектов)
  - [7. Заметки для оптимизатора](#7-заметки-для-оптимизатора)
    - [Hint-узлы](#hint-узлы)
    - [Semi / Anti JOIN](#semi--anti-join)
    - [Метаданные источника (catalog/stats-провайдер)](#метаданные-источника-catalogstats-провайдер)
    - [Узлы для constant-folding](#узлы-для-constant-folding)
  - [8. API Reference (краткий)](#8-api-reference-краткий)
    - [Главный экспорт](#главный-экспорт)
    - [`Node.with(patch)` — иммутабельное обновление](#nodewithpatch--иммутабельное-обновление)
    - [Сериализация — опции](#сериализация--опции)
    - [Envelope формат](#envelope-формат)

---

## 1. Назначение

`query-builder` — программный конструктор SQL-запросов, который:

- строит **неизменяемое дерево AST** вместо конкатенации строк;
- отделяет **построение запроса** от **генерации SQL** — один AST можно распечатать в нескольких диалектах (`PostgreSQL`, `GreenPlum`, `ClickHouse`, `Trino`);
- поддерживает **параметризованные запросы** (`$1`, `?`, именованные) — биндинги возвращаются отдельно;
- предоставляет **сериализацию** AST в JSON и обратно — для кэширования, передачи по сети, логирования;
- содержит хуки для **оптимизатора**: метаданные таблицы, hint-узлы, semi/anti-join, constant-folding узлы.

```js
const { b, print, PostgresDialect } = require('query-builder');

const q = b.query(
    b.select({
        projections: [b.proj(b.col('id')), b.proj(b.col('name'))],
        from: b.from(b.table('users', { schema: 'public', alias: 'u' })),
        where: b.eq(b.col('tenant', 'u'), b.param('t-1')),
    })
);

const { sql, bindings } = print(q, new PostgresDialect());
// sql:      SELECT "id", "name" FROM "public"."users" AS "u" WHERE "u"."tenant" = $1
// bindings: ['t-1']
```

---

## 2. Архитектура

### 2.1 AST-слои

```
ast/
├── Node.js       ← базовый неизменяемый узел (freeze, kind-дискриминатор)
├── expr/         ← ВЫРАЖЕНИЯ — скалярные значения в любом контексте
├── clause/       ← КЛАУЗЫ   — структурные элементы оператора
└── stmt/         ← ОПЕРАТОРЫ — целые SQL-операторы
```

**`ast/expr` — выражения (значения)**

Всё, что вычисляет скалярное значение или может стоять в позиции _expression_ по грамматике SQL:

| Класс | Описание |
|---|---|
| `Literal` | литерал (`42`, `'hello'`, `null`, `true`, `Date`, `BigInt`) |
| `Column` | ссылка на колонку (`qualifier.name [AS alias]`) |
| `Identifier` | произвольный неэкранированный идентификатор |
| `Param` | параметр-биндинг для prepared statement |
| `Raw` | сырой SQL-фрагмент (доверительный; минимальное использование) |
| `Null` | явный `NULL` (семантически прозрачен для принтера) |
| `BooleanConst` | явная константа `TRUE` / `FALSE` / `UNKNOWN` |
| `DataType` | тип данных (`numeric(38,6)`, `text[]`, …) |
| `BinaryOp` | двоичный оператор (`=`, `<>`, `+`, `AND`, `OR`, …) |
| `UnaryOp` | унарный оператор (`NOT`, `IS NULL`, `-`, …) |
| `InList` | `expr IN (list)` / `NOT IN` |
| `Between` | `expr BETWEEN low AND high` |
| `Like` | `LIKE` / `ILIKE` / `NOT LIKE` / `SIMILAR TO` |
| `Exists` | `EXISTS (subquery)` |
| `Quantified` | `expr = ANY (...)` / `ALL` / `SOME` |
| `FunctionCall` | функция / агрегат с опциональным `FILTER` и `WITHIN GROUP` |
| `WindowFunction` | `func() OVER (PARTITION BY … ORDER BY … FRAME)` |
| `Cast` | `CAST(expr AS type)` |
| `Case` | `CASE … WHEN … THEN … ELSE … END` |
| `CoalesceExpr` | `COALESCE(a, b, …)` — выделен для constant-folding |
| `NullIfExpr` | `NULLIF(a, b)` — выделен для constant-folding |
| `ArrayExpr` | `ARRAY[…]` |
| `SubqueryExpr` | подзапрос-выражение (`(SELECT …)`) |
| `Tuple` | `(a, b)` / `ROW(a, b)` |
| `FieldAccess` | `obj.field` / `doc->'key'` / `doc->>'key'` |
| `SubscriptExpr` | `arr[i]` / `arr[low:high]` |
| `Interval` | `INTERVAL '1 day'` |
| `Collate` | `expr COLLATE "C"` |
| `AtTimeZone` | `expr AT TIME ZONE 'UTC'` |
| `Lambda` | `x -> expr` (ClickHouse) |
| `NamedArg` | `name => value` (именованный аргумент) |
| `IsBooleanTest` | `expr IS [NOT] TRUE/FALSE/UNKNOWN` |
| `GroupingFunc` | `GROUPING(col, …)` |
| `Hint` | хинт оптимизатора (`/*+ SeqScan(u) */`) |
| `Star` | `*` или `tbl.*` (с опциональным `EXCEPT`) |

**`ast/clause` — клаузы (структурные части оператора)**

Узлы, которые описывают **позицию в структуре** оператора, а не значение:

| Класс | Описание |
|---|---|
| `TableSource` | `schema.table AS alias` + метаданные оптимизатора |
| `SubquerySource` | `(SELECT …) AS alias` в позиции FROM |
| `CteRef` | ссылка на CTE по имени (`WITH` блок) |
| `ValuesList` | `VALUES (…), (…) AS alias (cols)` |
| `From` | `FROM source [joins]` |
| `Join` | `[INNER/LEFT/RIGHT/FULL/CROSS/SEMI/ANTI] JOIN` |
| `Projection` | **один элемент SELECT-списка**: `expr [AS alias]` |
| `OrderItem` | один элемент `ORDER BY expr [ASC/DESC] [NULLS FIRST/LAST]` |
| `GroupBy` | `GROUP BY items` |
| `GroupingSets` | `GROUPING SETS ((a, b), (a), ())` |
| `Rollup` | `ROLLUP(a, b, …)` |
| `Cube` | `CUBE(a, b, …)` |
| `Limit` | `LIMIT n OFFSET m` |
| `FetchFirst` | `FETCH FIRST n ROWS ONLY/WITH TIES` (ANSI SQL) |
| `Frame` | спецификатор рамки окна (`ROWS BETWEEN …`) |
| `FrameBound` | граница рамки (`CURRENT ROW`, `UNBOUNDED PRECEDING`, …) |
| `Window` | именованное окно `WINDOW name AS (…)` |
| `ForClause` | `FOR UPDATE/SHARE/NO KEY UPDATE/KEY SHARE` |
| `OnConflict` | `ON CONFLICT … DO NOTHING/UPDATE` |
| `Assignment` | `col = expr` в UPDATE / ON CONFLICT DO UPDATE |
| `Returning` | `RETURNING items` |

**`ast/stmt` — SQL-операторы (statements)**

| Класс | Описание |
|---|---|
| `Select` | `SELECT …` |
| `SetOp` | `UNION [ALL]` / `INTERSECT [ALL]` / `EXCEPT [ALL]` |
| `Cte` | определение CTE (или temp-table, или inline) |
| `Query` | верхний конверт: `WITH ctes… body` + hints |
| `Insert` | `INSERT INTO … VALUES/SELECT … [ON CONFLICT] [RETURNING]` |
| `Update` | `UPDATE … SET … [FROM] [WHERE] [RETURNING]` |
| `Delete` | `DELETE FROM … [USING] [WHERE] [RETURNING]` |
| `Merge` | `MERGE INTO … USING … ON … WHEN …` |
| `MergeClause` | ветвь MERGE (`WHEN [NOT] MATCHED THEN …`) |
| `CreateTempTable` | `CREATE TEMP TABLE … AS SELECT …` |
| `DropTable` | `DROP TABLE [IF EXISTS] …` |
| `CreateView` | `CREATE [OR REPLACE] [TEMP] VIEW …` |
| `DropView` | `DROP VIEW [IF EXISTS] …` |
| `Truncate` | `TRUNCATE …` |

**`ast/Node`** — базовый класс всех узлов:
- создаётся и немедленно `Object.freeze()` — узлы неизменяемы;
- `kind: string` — строковый дискриминатор для pattern-matching / visitor;
- `node.with({ field: newValue })` — возвращает новый клон с изменёнными полями;
- `node.toJSON()` — plain-object с `kind` и всеми enumerable-полями;
- `Node.is(value)` — проверка принадлежности к AST.

---

### 2.2 Почему `Projection` ≠ `Column`

Это ключевое архитектурное разделение.

**`Column`** — это **выражение**, которое _ссылается_ на колонку: атом вычислимого выражения, наравне с `Literal`, `FunctionCall`, `BinaryOp`. Он может стоять в `WHERE`, в аргументах функции, в правой части `SET col = …`, в `ORDER BY`, в `ON`-условии join — везде, где SQL допускает _expression_.

**`Projection`** — это **структурная обёртка** над _любым_ выражением, которая придаёт ему **позицию и имя в выходном кортеже** результата. `Projection` не является выражением: его нельзя поставить в `WHERE`. Он существует только в `Select.projections[]` и в `Returning.items`.

```
SELECT  u.name AS user_name,        ← Projection { expr: Column{name:'name', qualifier:'u'}, alias:'user_name' }
        SUM(o.amount) AS total      ← Projection { expr: FunctionCall{name:'SUM',...},        alias:'total' }
FROM    users AS u                  ← TableSource
JOIN    orders AS o ON ...          ← Join / Column / BinaryOp ...
WHERE   u.tenant = $1               ← Column  (не Projection!)
GROUP BY u.name                     ← Column  (не Projection!)
```

| Критерий | `Column` | `Projection` |
|---|---|---|
| Что моделирует | «прочитать значение колонки» | «назвать и позиционировать результат» |
| Место в SQL | любой expression context | только SELECT / RETURNING |
| `alias` | псевдоним ссылки (редко) | публичное имя поля результата |
| Содержимое | примитив с полями `qualifier`/`name`/`type`/`ref` | обёртка: `expr` + `alias` |
| Может быть `expr` в `Projection`? | ✅ да | ❌ нет |

Благодаря такому разделению:
1. Типы AST точны — `projections: Projection[]` не смешивается с `where: Column | BinaryOp | …`.
2. `b.col('id')` одинаково работает в любом месте запроса без «разворачивания».
3. Алиасы в проекции и метаданные оптимизатора в `Column` развиваются независимо.
4. Принтер всегда знает: у `Projection` гарантированно есть `.expr` и `.alias`.

---

## 3. Builder API (`b.*`)

`builder/index.js` экспортирует объект `b` — фабричные методы для всех узлов AST.

### Выражения

```js
b.lit(value, type?)          // Literal
b.raw(sql, bindings?)        // Raw (доверительный SQL-фрагмент)
b.id(name, qualifier?)       // Identifier
b.col(name, qualifier?, alias?, opts?) // Column; opts: {type, nullable, ref}
b.param(value, type?)        // Param (binding-плейсхолдер)
b.null_()                    // Null
b.dataType(name, args?, arr?)// DataType

b.star(qualifier?, except?)  // * или tbl.* [EXCEPT (cols)]

b.bin(op, left, right)       // BinaryOp
b.not(arg)                   // NOT arg
b.isNull(arg)                // arg IS NULL
b.isNotNull(arg)             // arg IS NOT NULL
b.in(expr, list, negate?)    // IN / NOT IN
b.between(expr, lo, hi, neg?)// BETWEEN
b.like(expr, pat, opts?)     // LIKE / ILIKE / NOT LIKE / SIMILAR TO
b.exists(query, negate?)     // EXISTS / NOT EXISTS
b.quantified(op, expr, right, quantifier?) // ANY / ALL / SOME
b.tuple(items, explicit?)    // (a,b) / ROW(a,b)
b.field(expr, field, op?)    // FieldAccess: '.' | '->' | '->>' | '[]' | ...
b.subscript(expr, index, lo?, hi?) // arr[i] / arr[lo:hi]
b.interval(value, unit?)     // INTERVAL
b.collate(expr, collation)   // COLLATE
b.atTz(expr, tz)             // AT TIME ZONE
b.lambda(params, body)       // x -> expr  (ClickHouse)
b.namedArg(name, value, style?) // name => value

b.fn(name, args?, opts?)     // FunctionCall; opts: {distinct, filter, withinGroup}
b.win(fn, opts?)             // WindowFunction; opts: {partitionBy, orderBy, frame, windowName}
b.cast(expr, type)           // CAST
b.case_(branches, elseExpr?, subject?) // CASE
b.arr(items, elemType?)      // ARRAY[...]
b.sub(query)                 // (subquery) в позиции выражения

// Оптимизаторные узлы
b.coalesce(...args)          // COALESCE
b.nullIf(a, b)               // NULLIF
b.boolConst(value)           // TRUE / FALSE / UNKNOWN
b.isBoolTest(expr, value, negate?) // IS [NOT] TRUE/FALSE/UNKNOWN
b.groupingFn(...args)        // GROUPING(...)
b.hint(kind, args?)          // Hint для оптимизатора

// Частые сокращения для сравнений
b.eq(l, r)   b.ne(l, r)   b.lt(l, r)   b.le(l, r)   b.gt(l, r)   b.ge(l, r)
b.isDistinct(l, r)   b.isNotDistinct(l, r)

// Логические цепочки (фильтруют null-элементы)
b.and(...parts)   b.or(...parts)

// Частые агрегаты
b.count(expr?)   b.countDistinct(expr)
b.sum(expr)      b.avg(expr)   b.min(expr)   b.max(expr)
```

### Клаузы

```js
b.table(name, opts?)         // TableSource; opts: {schema, alias, catalog, storageKind, ...}
b.subsrc(query, alias, lat?) // SubquerySource
b.cteref(name, alias?)       // CteRef
b.values(rows, opts?)        // ValuesList; opts: {alias, columns}
b.from(source, joins?)       // From
b.join(type, src, on, using?, lat?) // Join (inner/left/right/full/cross)
b.semiJoin(src, on)          // SEMI JOIN (оптимизатор)
b.antiJoin(src, on)          // ANTI JOIN (оптимизатор)

b.proj(expr, alias?)         // Projection — элемент SELECT-списка
b.orderItem(expr, dir?, nulls?) // OrderItem
b.group(items)               // GROUP BY
b.groupingSets(sets)         // GROUPING SETS
b.rollup(items)              // ROLLUP
b.cube(items)                // CUBE
b.limit(n?, offset?)         // LIMIT / OFFSET
b.fetchFirst(count, opts?)   // FETCH FIRST n ROWS ONLY/WITH TIES

b.frameBound(boundKind, value?) // FrameBound
b.frame(units, start, end?, exclude?) // Frame
b.window_(name, opts?)       // именованное окно

b.forClause(strength, opts?) // FOR UPDATE / FOR SHARE
b.onConflict(action, opts?)  // ON CONFLICT
b.assign(column, value)      // Assignment (SET col = expr)
b.returning(items)           // RETURNING
```

### Операторы (statements)

```js
b.select(props)              // SELECT
b.union(l, r, all?)          // UNION [ALL]
b.intersect(l, r, all?)      // INTERSECT [ALL]
b.except(l, r, all?)         // EXCEPT [ALL]
b.cte(name, query, opts?)    // CTE
b.query(body, ctes?, hints?) // верхний конверт (WITH … SELECT/INSERT/…)

b.insert(props)              // INSERT
b.update(props)              // UPDATE
b.delete_(props)             // DELETE
b.merge(target, src, on, clauses) // MERGE
b.mergeClause(props)         // ветвь MERGE

b.tempTable(props)           // CREATE TEMP TABLE … AS
b.drop(props)                // DROP TABLE
b.createView(props)          // CREATE VIEW
b.dropView(props)            // DROP VIEW
b.truncate(tables, opts?)    // TRUNCATE
```

---

## 4. Диалекты и вывод SQL

```js
const {
    PostgresDialect
} = require('postgres-ext-query-builder');

// Вывод: { sql: string, bindings: any[] }
const { sql, bindings } = print(query, new PostgresDialect());
```

Функция `print(root, dialect, opts?)` автоматически оборачивает «голый» `Select` или `SetOp` в `Query`. `Dialect`-объекты реализуют visitor по `kind`-дискриминаторам узлов AST.

---

## 5. Сериализация

AST можно сохранить в JSON и восстановить без потерь (включая `Date`, `BigInt`, `Buffer`):

```js
const { b, serialize, deserialize, toJSONString, fromJSONString } = require('query-builder');

const ast = b.lit(new Date('2025-01-01'));

// AST -> envelope-объект
const envelope = serialize(ast);
// { $schema: 'mqb-ast/1', version: 1, root: { kind: 'Literal', ... } }

// envelope -> AST
const restored = deserialize(envelope);

// Строковый round-trip
const str = toJSONString(ast);               // JSON-строка
const ast2 = fromJSONString(str);            // восстановленный AST

// Raw-узлы по умолчанию запрещены при десериализации (безопасность)
const str3 = toJSONString(rawNode, { allowRaw: true });
const ast3 = fromJSONString(str3, { allowRaw: true });

// strict=false — пропускать неизвестные kind вместо исключения
const ast4 = fromJSONString(str, { strict: false });
```

---

## 6. Примеры

### 6.1 Простой SELECT

**Цель:** `SELECT "id", "name" FROM "public"."users" AS "u" WHERE "u"."status" = $1`

```js
const { b, print, PostgresDialect } = require('query-builder');

const q = b.query(
    b.select({
        projections: [
            b.proj(b.col('id')),
            b.proj(b.col('name')),
        ],
        from: b.from(
            b.table('users', { schema: 'public', alias: 'u' })
        ),
        where: b.eq(
            b.col('status', 'u'),
            b.param('active')
        ),
    })
);

const { sql, bindings } = print(q, new PostgresDialect());
// sql:      SELECT "id", "name" FROM "public"."users" AS "u" WHERE "u"."status" = $1
// bindings: ['active']
```

> **Обратите внимание:** `b.col('id')` в `projections` — это `Column` (выражение), обёрнутый в `b.proj(...)` (Projection). В `where` `b.col('status', 'u')` — просто `Column`, без обёртки `proj`.

---

### 6.2 JOIN с несколькими условиями

**Цель:** `SELECT u.id, o.total FROM users AS u LEFT JOIN orders AS o ON u.id = o.user_id WHERE u.active = true`

```js
const q = b.query(
    b.select({
        projections: [
            b.proj(b.col('id', 'u'),    'user_id'),
            b.proj(b.col('total', 'o'), 'order_total'),
        ],
        from: b.from(
            b.table('users', { alias: 'u' }),
            [
                b.join(
                    'left',
                    b.table('orders', { alias: 'o' }),
                    b.eq(b.col('id', 'u'), b.col('user_id', 'o'))
                ),
            ]
        ),
        where: b.and(
            b.eq(b.col('active', 'u'), b.lit(true)),
            b.isNotNull(b.col('total', 'o'))
        ),
    })
);

const { sql, bindings } = print(q, new PostgresDialect());
```

---

### 6.3 GROUP BY + HAVING + агрегаты

**Цель:** `SELECT dept, SUM(salary) AS total, COUNT(*) AS cnt FROM employees GROUP BY dept HAVING SUM(salary) > $1`

```js
const q = b.query(
    b.select({
        projections: [
            b.proj(b.col('dept')),
            b.proj(b.sum(b.col('salary')), 'total'),
            b.proj(b.count(),              'cnt'),
        ],
        from: b.from(b.table('employees')),
        groupBy: b.group([b.col('dept')]),
        having: b.gt(
            b.sum(b.col('salary')),
            b.param('min_total')
        ),
    })
);

const { sql, bindings } = print(q, new PostgresDialect());
// bindings: ['min_total']
```

---

### 6.4 ORDER BY + LIMIT/OFFSET

```js
const q = b.query(
    b.select({
        projections: [b.proj(b.col('name')), b.proj(b.col('score'))],
        from: b.from(b.table('results')),
        orderBy: [
            b.orderItem(b.col('score'), 'DESC', 'NULLS LAST'),
            b.orderItem(b.col('name'),  'ASC'),
        ],
        limit: b.limit(20, 40),   // LIMIT 20 OFFSET 40
    })
);

// Или по стандарту ANSI (Trino / PG):
const q2 = b.query(
    b.select({
        projections: [b.proj(b.star())],
        from: b.from(b.table('results')),
        limit: b.fetchFirst(10, { withTies: false }),
    })
);
```

---

### 6.5 Оконная функция

**Цель:** `SELECT name, dept, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn FROM employees`

```js
const rowNum = b.win(
    b.fn('ROW_NUMBER', []),
    {
        partitionBy: [b.col('dept')],
        orderBy:     [b.orderItem(b.col('salary'), 'DESC')],
    }
);

// С явной рамкой окна
const runningTotal = b.win(
    b.sum(b.col('amount')),
    {
        partitionBy: [b.col('dept')],
        orderBy:     [b.orderItem(b.col('date'), 'ASC')],
        frame: b.frame(
            'rows',
            b.frameBound('unboundedPreceding'),
            b.frameBound('currentRow')
        ),
    }
);

const q = b.query(
    b.select({
        projections: [
            b.proj(b.col('name')),
            b.proj(b.col('dept')),
            b.proj(rowNum,        'rn'),
            b.proj(runningTotal,  'running_total'),
        ],
        from: b.from(b.table('employees')),
    })
);
```

---

### 6.6 CTE (WITH)

**Цель:**
```sql
WITH ranked AS (
    SELECT id, name, ROW_NUMBER() OVER (ORDER BY score DESC) AS rn
    FROM players
)
SELECT * FROM ranked WHERE rn <= 10
```

```js
const rankedBody = b.select({
    projections: [
        b.proj(b.col('id')),
        b.proj(b.col('name')),
        b.proj(
            b.win(b.fn('ROW_NUMBER', []), {
                orderBy: [b.orderItem(b.col('score'), 'DESC')],
            }),
            'rn'
        ),
    ],
    from: b.from(b.table('players')),
});

const q = b.query(
    b.select({
        projections: [b.proj(b.star())],
        from: b.from(b.cteref('ranked')),
        where: b.le(b.col('rn'), b.lit(10)),
    }),
    [b.cte('ranked', rankedBody)]
);

const { sql } = print(q, new PostgresDialect());
```

---

### 6.7 UNION ALL

```js
const part1 = b.select({
    projections: [b.proj(b.col('id')), b.proj(b.col('name'))],
    from: b.from(b.table('customers')),
});

const part2 = b.select({
    projections: [b.proj(b.col('id')), b.proj(b.col('name'))],
    from: b.from(b.table('leads')),
    where: b.isNotNull(b.col('name')),
});

const q = b.query(b.union(part1, part2, true /* ALL */));

// INTERSECT / EXCEPT
const q2 = b.query(b.intersect(part1, part2));
const q3 = b.query(b.except(part1, part2));
```

---

### 6.8 INSERT + ON CONFLICT DO UPDATE + RETURNING

**Цель:**
```sql
INSERT INTO users (email, name) VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id, email
```

```js
const q = b.insert({
    table:   b.table('users'),
    columns: ['email', 'name'],
    rows:    [[b.param('user@example.com'), b.param('Alice')]],
    onConflict: b.onConflict('update', {
        target: { columns: ['email'], constraint: null, where: null },
        set: [
            b.assign('name', b.col('name', 'excluded')),
        ],
    }),
    returning: b.returning([
        b.proj(b.col('id')),
        b.proj(b.col('email')),
    ]),
});

// Для INSERT ... SELECT:
const q2 = b.insert({
    table:   b.table('archive'),
    columns: ['id', 'payload'],
    source:  b.select({
        projections: [b.proj(b.col('id')), b.proj(b.col('payload'))],
        from: b.from(b.table('events')),
        where: b.lt(b.col('created_at'), b.param('2020-01-01')),
    }),
});

const { sql, bindings } = print(b.query(q), new PostgresDialect());
```

---

### 6.9 UPDATE

**Цель:** `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`

```js
const q = b.update({
    table: b.table('users'),
    assignments: [
        b.assign('status',     b.param('active')),
        b.assign('updated_at', b.fn('NOW', [])),
    ],
    where: b.eq(b.col('id'), b.param(42)),
    returning: b.returning([b.proj(b.col('id'))]),
});

const { sql, bindings } = print(b.query(q), new PostgresDialect());
// bindings: ['active', 42]
```

---

### 6.10 DELETE

**Цель:** `DELETE FROM logs WHERE created_at < $1`

```js
const q = b.delete_({
    table: b.table('logs'),
    where: b.lt(
        b.col('created_at'),
        b.param('2020-01-01')
    ),
});

const { sql, bindings } = print(b.query(q), new PostgresDialect());
```

---

### 6.11 MERGE

**Цель:**
```sql
MERGE INTO target AS t
USING source AS s ON t.id = s.id
WHEN MATCHED THEN UPDATE SET name = s.name
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name)
```

```js
const q = b.merge(
    b.table('target', { alias: 't' }),
    b.table('source', { alias: 's' }),
    b.eq(b.col('id', 't'), b.col('id', 's')),
    [
        b.mergeClause({
            matched: true,
            action:  'update',
            set: [b.assign('name', b.col('name', 's'))],
        }),
        b.mergeClause({
            matched: false,
            action:  'insert',
            columns: ['id', 'name'],
            values:  [b.col('id', 's'), b.col('name', 's')],
        }),
    ]
);

const { sql } = print(b.query(q), new PostgresDialect());
```

---

### 6.12 Сериализация и восстановление AST

```js
const { b, toJSONString, fromJSONString } = require('query-builder');
const { ClickHouseDialect } = require('clickhouse-ext-query-builder');

// Строим AST
const ast = b.select({
    projections: [b.proj(b.col('id')), b.proj(b.sum(b.col('amount')), 'total')],
    from: b.from(b.table('orders')),
    groupBy: b.group([b.col('id')]),
});

// Сериализуем в JSON-строку
const json = toJSONString(ast);

// Передаём по сети / кэшируем / логируем...

// Восстанавливаем
const restored = fromJSONString(json);

// Распечатываем на целевой СУБД
const { sql } = print(b.query(restored), new ClickHouseDialect());
```

---

### 6.13 Один AST — несколько диалектов

```js
const { PostgresDialect } = require('postgres-ext-query-builder');
const { GreenPlumDialect } = require('greenplum-ext-query-builder');
const { ClickHouseDialect } = require('clickhouse-ext-query-builder');
const { TrinoDialect } = require('trino-ext-query-builder');
const { b, print } = require('query-builder');

const q = b.query(
    b.select({
        projections: [
            b.proj(b.col('region')),
            b.proj(b.sum(b.col('revenue')), 'total'),
        ],
        from: b.from(b.table('sales')),
        groupBy: b.group([b.col('region')]),
        orderBy: [b.orderItem(b.col('total'), 'DESC')],
        limit: b.limit(10),
    })
);

console.log(print(q, new PostgresDialect()).sql);
console.log(print(q, new GreenPlumDialect()).sql);
console.log(print(q, new ClickHouseDialect()).sql);
console.log(print(q, new TrinoDialect()).sql);
// Один AST, разный SQL-синтаксис для каждой СУБД
```

---

## 7. Заметки для оптимизатора

### Hint-узлы

```js
const q = b.query(
    b.select({ … }),
    [],                         // ctes
    [
        b.hint('SeqScan',  'users'),
        b.hint('HashJoin', ['users', 'orders']),
        b.hint('Leading',  ['u', 'o', 'p']),
    ]
);
// При supportsHintComments=true диалект эмиттирует: /*+ SeqScan(users) HashJoin(users orders) */
```

### Semi / Anti JOIN

```js
// Оптимизатор: EXISTS (subquery) -> SEMI JOIN
b.semiJoin(b.table('orders', { alias: 'o' }), b.eq(b.col('id', 'u'), b.col('user_id', 'o')))

// Оптимизатор: NOT EXISTS (subquery) -> ANTI JOIN
b.antiJoin(b.table('banned'), b.eq(b.col('id', 'u'), b.col('user_id', 'banned')))
// Диалект по умолчанию эмулирует через EXISTS / NOT EXISTS при печати
```

### Метаданные источника (catalog/stats-провайдер)

```js
b.table('fact_sales', {
    schema:      'dw',
    alias:       'fs',
    storageKind: 'appendOnly',        // 'heap'|'appendOnly'|'columnstore'|'external'
    distribution: { by: ['tenant_id'] }, // GP: ключ дистрибуции -> motion-elimination
    partitioning: {
        kind: 'range',
        keys: ['report_dt'],
        partitions: [],               // -> partition-pruning
    },
    indexes: [
        { columns: ['tenant_id', 'id'], unique: true, kind: 'btree' },
    ],
    stats: { rows: 1_000_000, widthBytes: 512, distinctKeys: {}, nullFrac: {}, mcvs: {} },
})
```

### Узлы для constant-folding

```js
b.coalesce(b.col('x'), b.lit(0))     // COALESCE(x, 0) -> оптимизатор: COALESCE(NULL, x) -> x
b.nullIf(b.col('x'), b.col('x'))     // NULLIF(x, x)   -> оптимизатор: -> NULL
b.boolConst(true)                    // TRUE           -> x AND TRUE -> x
b.isBoolTest(b.col('flag'), 'true')  // flag IS TRUE   (три-значная логика)
```

---

## 8. API Reference (краткий)

### Главный экспорт

```js
const {
    b,                    // builder — фабрика всех узлов
    ast,                  // прямой доступ к классам AST
    print,                // print(query, dialect, opts?) -> {sql, bindings}
    normalizeWhere,       // утилита нормализации WHERE
    hoistCtes,            // утилита выноса CTE на верхний уровень
    serialize,            // AST -> envelope object
    deserialize,          // envelope object -> AST
    toJSONString,         // AST -> JSON-string
    fromJSONString,       // JSON-string -> AST
    PostgresDialect,
    GreenPlumDialect,
    ClickHouseDialect,
    TrinoDialect,
    Dialect,              // базовый класс диалекта
    Kind,                 // enum материализаций
    Strategy,             // enum стратегий
} = require('query-builder');
```

### `Node.with(patch)` — иммутабельное обновление

```js
const col = b.col('name', 'u');
// col заморожен; создаём новый узел с изменённым qualifier:
const col2 = col.with({ qualifier: 'users' });
```

### Сериализация — опции

| Опция | По умолчанию | Описание |
|---|---|---|
| `allowRaw` | `false` | разрешить/запретить `Raw`-узлы (безопасность) |
| `strict` | `true` | бросать исключение на неизвестный `kind` |

### Envelope формат

```json
{
  "$schema": "mqb-ast/1",
  "version": 1,
  "allowRaw": false,
  "root": { "kind": "...", ... }
}
```
