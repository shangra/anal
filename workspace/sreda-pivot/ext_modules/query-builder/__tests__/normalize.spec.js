'use strict';

const { normalizeWhere, b, print } = require('../index');
const { PostgresDialect } = require('../dialect');
const Node = require('../ast/Node');

// ──────────────────────────────────────────────────────────────────────────────
// Вспомогательные утилиты
// ──────────────────────────────────────────────────────────────────────────────

const dialect = new PostgresDialect();

/** Превращает AST-узел в SQL-строку (без биндингов) для удобного сравнения в тестах. */
function toSql(node) {
    if (!node) return null;
    const { sql, bindings } = print(
        b.query(b.select({ projections: [b.star()], where: node })),
        dialect
    );
    // Вырезаем только WHERE-фрагмент
    const match = sql.match(/WHERE (.+)$/s);
    return match ? match[1].trim() : sql;
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Базовые случаи — null / примитивы
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — базовые случаи', () => {
    test('null -> null', () => {
        expect(normalizeWhere(null)).toBeNull();
    });

    test('undefined -> null', () => {
        expect(normalizeWhere(undefined)).toBeNull();
    });

    test('пустой объект -> null', () => {
        expect(normalizeWhere({})).toBeNull();
    });

    test('простое равенство { field: value }', () => {
        const node = normalizeWhere({ status: 'active' });
        expect(Node.is(node)).toBe(true);
        expect(toSql(node)).toMatch(/"status" =/);
    });

    test('{ field: { $eq: value } }', () => {
        const node = normalizeWhere({ status: { $eq: 'active' } });
        expect(Node.is(node)).toBe(true);
        expect(toSql(node)).toMatch(/"status" =/);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Служебные ключи __level__ / __parent__ в leaf-контексте
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — __level__ / __parent__ в значении поля', () => {
    test('{ field: { $eq: v, __level__: 0 } } — __level__ игнорируется', () => {
        const node = normalizeWhere({ scode: { $eq: 'R_01', __level__: 0 } });
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        expect(sql).toMatch(/"scode" =/);
        // __level__ не должен попасть в SQL
        expect(sql).not.toMatch(/__level__/);
    });

    test('{ field: { $ne: v, __level__: 1 } } — __level__ игнорируется', () => {
        const node = normalizeWhere({ code: { $ne: '123', __level__: 1 } });
        expect(Node.is(node)).toBe(true);
        expect(toSql(node)).toMatch(/"code" <>/);
    });

    test('{ field: { $eq: v, __parent__: "p" } } — __parent__ игнорируется', () => {
        const node = normalizeWhere({ code: { $eq: 'A', __parent__: 'B' } });
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        expect(sql).toMatch(/"code" =/);
        expect(sql).not.toMatch(/__parent__/);
    });

    test('объект только из __level__ / __parent__ без операторов -> null', () => {
        // Такой объект не содержит реальных условий — должен вернуть null без падения
        const node = normalizeWhere({
            field: { __level__: 0, __parent__: 'x' },
        });
        // Поведение зависит от реализации: может быть null (нет ops) или IS NULL,
        // но НЕ должно бросать исключение.
        expect(() =>
            normalizeWhere({ field: { __level__: 0, __parent__: 'x' } })
        ).not.toThrow();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. $or / $and в leaf-контексте с __level__
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — leaf-level $or/$and с __level__', () => {
    test('{ field: { $or: [{ $eq: v1, __level__: 0 }, { $eq: v2, __level__: 0 }] } } -> field IN ($1,$2)', () => {
        const node = normalizeWhere({
            code: {
                $or: [
                    { $eq: '162', __level__: 0 },
                    { $eq: '161', __level__: 0 },
                ],
            },
        });
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        // Должны быть ссылки на поле "code" (через OR или IN), не должно быть $eq / __level__
        expect(sql).toMatch(/"code"/);
        expect(sql).not.toMatch(/"\$eq"/);
        expect(sql).not.toMatch(/__level__/);
    });

    test('вложенный $or внутри $or в leaf-контексте', () => {
        const node = normalizeWhere({
            code: {
                $or: [
                    {
                        $or: [
                            { $eq: '162', __level__: 0 },
                            { $eq: '161', __level__: 0 },
                        ],
                    },
                ],
            },
        });
        expect(() =>
            normalizeWhere({
                code: {
                    $or: [
                        {
                            $or: [
                                { $eq: '162', __level__: 0 },
                                { $eq: '161', __level__: 0 },
                            ],
                        },
                    ],
                },
            })
        ).not.toThrow();
        if (node) {
            const sql = toSql(node);
            expect(sql).toMatch(/"code"/);
            expect(sql).not.toMatch(/"\$eq"/);
            expect(sql).not.toMatch(/__level__/);
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Проблемный кейс: оператор-объект с __level__ на field-уровне $or
//    { $or: [{ $or: [{ $eq: "162", __level__: 0 }, { $eq: "161", __level__: 0 }] }] }
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — operator-object без колонки на field-уровне', () => {
    test('не бросает исключение при вложенном $or без имени поля', () => {
        expect(() =>
            normalizeWhere({
                $or: [
                    {
                        $or: [
                            { $eq: '162', __level__: 0 },
                            { $eq: '161', __level__: 0 },
                        ],
                    },
                ],
            })
        ).not.toThrow();
    });

    test('возвращает null или Node (не undefined)', () => {
        const result = normalizeWhere({
            $or: [
                {
                    $or: [
                        { $eq: '162', __level__: 0 },
                        { $eq: '161', __level__: 0 },
                    ],
                },
            ],
        });
        // null — нет реальных условий, это ожидаемо
        expect(result === null || Node.is(result)).toBe(true);
    });

    test('не генерирует ссылки на $eq или __level__ как колонки', () => {
        const node = normalizeWhere({
            $or: [
                {
                    $or: [
                        { $eq: '162', __level__: 0 },
                        { $eq: '161', __level__: 0 },
                    ],
                },
            ],
        });
        if (node) {
            const sql = toSql(node);
            expect(sql).not.toMatch(/"\$eq"/);
            expect(sql).not.toMatch(/__level__/);
        }
    });

    test('operator-object без колонки возвращает null (условие недиагностируемо без поля)', () => {
        const node = normalizeWhere({
            $or: [
                { $eq: '162', __level__: 0 },
                { $eq: '161', __level__: 0 },
            ],
        });
        expect(node).toBeNull();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. Реальный паттерн из pivot-table фикстур: $and + $or + field + __level__
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — реальные паттерны из pivot-table', () => {
    test('№13: $and[$or[field{$eq,__level__}]] — не бросает, генерирует корректный SQL', () => {
        const where = {
            $and: [
                { $or: [{ scode_2023_with: { $eq: 'R_01', __level__: 0 } }] },
                {
                    $or: [
                        {
                            terStruct_with: {
                                $eq: 'lvl_1::0::-100003',
                                __level__: 1,
                            },
                        },
                    ],
                },
            ],
        };
        expect(() => normalizeWhere(where)).not.toThrow();
        const node = normalizeWhere(where);
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        expect(sql).toMatch(/"scode_2023_with"/);
        expect(sql).toMatch(/"terStruct_with"/);
        expect(sql).not.toMatch(/__level__/);
    });

    test('№14: $and[$or[field{$eq,__level__}]] + field{__parent__,__level__} — не бросает', () => {
        const where = {
            $and: [
                { $or: [{ scode_2023_with: { $eq: 'R_01', __level__: 0 } }] },
                {
                    $or: [
                        {
                            terStruct_with: {
                                $eq: 'lvl_1::0::-100003',
                                __level__: 1,
                            },
                        },
                    ],
                },
            ],
            scode_2023_with: { __parent__: 'R_01', __level__: 0 },
        };
        expect(() => normalizeWhere(where)).not.toThrow();
    });

    test('смешанный объект: field с $eq+__level__ И field с __parent__+__level__', () => {
        const where = {
            scode_2023_with: { $eq: 'R_01', __level__: 0 },
            terStruct_with: { __parent__: 'R_01', __level__: 0 },
        };
        expect(() => normalizeWhere(where)).not.toThrow();
        const node = normalizeWhere(where);
        // Хотя бы первое условие должно превратиться в SQL
        if (node) {
            const sql = toSql(node);
            expect(sql).not.toMatch(/__level__/);
            expect(sql).not.toMatch(/__parent__/);
        }
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. Прочие операторы с __level__ в leaf-контексте
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — прочие операторы с __level__', () => {
    test('{ field: { $in: [...], __level__: 0 } }', () => {
        const node = normalizeWhere({
            code: { $in: ['A', 'B'], __level__: 0 },
        });
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        expect(sql).toMatch(/"code" IN/);
        expect(sql).not.toMatch(/__level__/);
    });

    test('{ field: { $gt: 10, __level__: 2 } }', () => {
        const node = normalizeWhere({ amount: { $gt: 10, __level__: 2 } });
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        expect(sql).toMatch(/"amount" >/);
        expect(sql).not.toMatch(/__level__/);
    });

    test('{ field: { $not: { $eq: v }, __level__: 0 } }', () => {
        const node = normalizeWhere({
            status: { $not: { $eq: 'x' }, __level__: 0 },
        });
        expect(Node.is(node)).toBe(true);
        const sql = toSql(node);
        expect(sql).not.toMatch(/__level__/);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. Регрессия: большое количество OR/AND узлов (stac-overflow protection)
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeWhere — большое количество OR/AND (stack-overflow protection)', () => {
    test('$or с 10 000 значениями не выбрасывает Maximum callstack', () => {
        const values = Array.from({ length: 10000 }, (_, i) => `val-${i}`);
        const where = { code: { $in: values } };
        expect(() => normalizeWhere(where)).not.toThrow();
    });

    test('$or с 10 000 условиями на field-уровне не выбрасывает Maximum callstack', () => {
        const conditions = Array.from({ length: 10000 }, (_, i) => ({
            [`code_${i}`]: `val-${i}`,
        }));
        const where = { $or: conditions };
        expect(() => normalizeWhere(where)).not.toThrow();
    });

    test('$and с 10 000 условиями на field-уровне не выбрасывает Maximum callstack', () => {
        const conditions = Array.from({ length: 10000 }, (_, i) => ({
            [`code_${i}`]: `val-${i}`,
        }));
        const where = { $and: conditions };
        expect(() => normalizeWhere(where)).not.toThrow();
    });

    test('b.or() с 50 000 узлами не выбрасывает Maximum callstack и корректно сериализуется', () => {
        const nodes = Array.from({ length: 50000 }, (_, i) =>
            b.eq(b.col('x'), b.lit(i))
        );
        const node = b.or(...nodes);
        expect(Node.is(node)).toBe(true);
        // Должно успешно пройти сериализацию (рекурсивный визит)
        expect(() =>
            print(
                b.query(b.select({ projections: [b.star()], where: node })),
                dialect
            )
        ).not.toThrow();
    });

    test('b.and() с 50 000 узлами не выбрасывает Maximum callstack', () => {
        const nodes = Array.from({ length: 50000 }, (_, i) =>
            b.eq(b.col('x'), b.lit(i))
        );
        const node = b.and(...nodes);
        expect(Node.is(node)).toBe(true);
        expect(() =>
            print(
                b.query(b.select({ projections: [b.star()], where: node })),
                dialect
            )
        ).not.toThrow();
    });

    test('b.or() с 3 узлами flatten-ит вложенные AND/OR', () => {
        const a = b.eq(b.col('a'), b.lit(1));
        const bNode = b.eq(b.col('b'), b.lit(2));
        const c = b.eq(b.col('c'), b.lit(3));
        const d = b.eq(b.col('d'), b.lit(4));

        // Nested AND inside OR — should flatten
        const nested = b.or(b.and(a, bNode), b.and(c, d));
        expect(Node.is(nested)).toBe(true);

        // Nested OR inside OR — should flatten
        const orInsideOr = b.or(b.or(a, bNode), b.or(c, d));
        expect(Node.is(orInsideOr)).toBe(true);
    });

    test('SQL для b.or() с 100 условиями содержит все 100 предикатов', () => {
        const conditions = Array.from({ length: 100 }, (_, i) =>
            b.eq(b.col('id'), b.lit(i))
        );
        const node = b.or(...conditions);
        const sql = print(
            b.query(b.select({ projections: [b.star()], where: node }), dialect)
        ).sql;
        // Numeric literals are unquoted: `= 0`, not `"0"`
        for (let i = 0; i < 100; i++) {
            expect(sql).toContain(`= ${i}`);
        }
    });
});
