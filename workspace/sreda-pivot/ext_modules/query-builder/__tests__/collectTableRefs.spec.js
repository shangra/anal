'use strict';

const b = require('../builder');
const { collectTableRefs } = require('../utils/collectTableRefs');

// ──────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции
// ──────────────────────────────────────────────────────────────────────────────

/** Строит простой SELECT ... FROM <table> */
function selectFrom(tableNode, { joins = [], where = null } = {}) {
    return b.query(
        b.select({
            projections: [b.star()],
            from: b.from(tableNode, joins),
            where,
        })
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Простые случаи
// ──────────────────────────────────────────────────────────────────────────────

describe('collectTableRefs — простые случаи', () => {
    test('не-Node возвращает пустой массив', () => {
        /* eslint-disable */
        // @ts-ignore — намеренная проверка поведения при некорректном вводе
        expect(collectTableRefs(null)).toEqual([]);
        // @ts-ignore
        expect(collectTableRefs({})).toEqual([]);
        // @ts-ignore
        expect(collectTableRefs('text')).toEqual([]);
        /* eslint-enable */
    });

    test('SELECT из одной таблицы без схемы -> schema = defaultSchema', () => {
        const ast = selectFrom(b.table('users'));
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([{ schema: 'public', name: 'users' }]);
    });

    test('SELECT из одной таблицы со схемой', () => {
        const ast = selectFrom(b.table('orders', { schema: 'sales' }));
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([{ schema: 'sales', name: 'orders' }]);
    });

    test('кастомный defaultSchema применяется при отсутствии схемы', () => {
        const ast = selectFrom(b.table('events'));
        const refs = collectTableRefs(ast, { defaultSchema: 'analytics' });
        expect(refs).toEqual([{ schema: 'analytics', name: 'events' }]);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. JOIN и дедупликация
// ──────────────────────────────────────────────────────────────────────────────

describe('collectTableRefs — JOIN и дедупликация', () => {
    test('JOIN двух разных таблиц -> 2 ref в порядке появления', () => {
        const ast = selectFrom(
            b.table('users', { schema: 'public', alias: 'u' }),
            {
                joins: [
                    b.join(
                        'inner',
                        b.table('orders', { schema: 'public', alias: 'o' }),
                        b.eq(b.col('id', 'u'), b.col('user_id', 'o'))
                    ),
                ],
            }
        );
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([
            { schema: 'public', name: 'users' },
            { schema: 'public', name: 'orders' },
        ]);
    });

    test('одна и та же таблица с разными алиасами -> 1 ref (дедупликация)', () => {
        const ast = selectFrom(
            b.table('items', { schema: 'public', alias: 'a' }),
            {
                joins: [
                    b.join(
                        'inner',
                        b.table('items', { schema: 'public', alias: 'b' }),
                        b.eq(b.col('parent_id', 'a'), b.col('id', 'b'))
                    ),
                ],
            }
        );
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([{ schema: 'public', name: 'items' }]);
    });

    test('таблица с одинаковым именем, но разными схемами -> 2 ref', () => {
        const ast = selectFrom(b.table('logs', { schema: 'app' }), {
            joins: [
                b.join(
                    'left',
                    b.table('logs', { schema: 'audit' }),
                    b.lit(true)
                ),
            ],
        });
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([
            { schema: 'app', name: 'logs' },
            { schema: 'audit', name: 'logs' },
        ]);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Подзапросы (SubquerySource)
// ──────────────────────────────────────────────────────────────────────────────

describe('collectTableRefs — SubquerySource', () => {
    test('подзапрос в FROM: таблицы внутри него собираются', () => {
        const inner = b.query(
            b.select({
                projections: [b.star()],
                from: b.from(b.table('payments', { schema: 'billing' })),
            })
        );
        const ast = selectFrom(b.subsrc(inner, 'p'));
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([{ schema: 'billing', name: 'payments' }]);
    });

    test('подзапрос в WHERE (EXISTS): таблица внутри собирается', () => {
        const subq = b.query(
            b.select({
                projections: [b.lit(1)],
                from: b.from(b.table('sessions', { schema: 'auth' })),
            })
        );
        const ast = selectFrom(b.table('users', { schema: 'public' }), {
            where: b.exists(subq),
        });
        const refs = collectTableRefs(ast);
        expect(refs).toEqual([
            { schema: 'public', name: 'users' },
            { schema: 'auth', name: 'sessions' },
        ]);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. CTE и temp-таблицы
// ──────────────────────────────────────────────────────────────────────────────

describe('collectTableRefs — CTE / Query.ctes', () => {
    test('CteRef как источник НЕ добавляется в результат', () => {
        // WITH cte AS (SELECT ... FROM users) SELECT ... FROM cte
        const cteBody = b.query(
            b.select({
                projections: [b.star()],
                from: b.from(b.table('users', { schema: 'public' })),
            })
        );
        const ast = b.query(
            b.select({
                projections: [b.star()],
                from: b.from(b.cteref('my_cte')),
            }),
            [b.cte('my_cte', cteBody)]
        );
        const refs = collectTableRefs(ast);
        // users — из тела CTE; my_cte (CteRef) — НЕ включается
        expect(refs).toEqual([{ schema: 'public', name: 'users' }]);
    });

    test('includeCteBodies=false — тела CTE не обходятся', () => {
        const cteBody = b.query(
            b.select({
                projections: [b.star()],
                from: b.from(b.table('users', { schema: 'public' })),
            })
        );
        const ast = b.query(
            b.select({
                projections: [b.star()],
                from: b.from(b.table('reports', { schema: 'public' })),
            }),
            [b.cte('my_cte', cteBody)]
        );
        const refs = collectTableRefs(ast, { includeCteBodies: false });
        // users (в CTE) — не собирается; reports (в body) — собирается
        expect(refs).toEqual([{ schema: 'public', name: 'reports' }]);
    });

    test('несколько CTE с разными таблицами', () => {
        const cte1 = b.cte(
            'c1',
            b.query(
                b.select({
                    projections: [b.star()],
                    from: b.from(b.table('t1', { schema: 'public' })),
                })
            )
        );
        const cte2 = b.cte(
            'c2',
            b.query(
                b.select({
                    projections: [b.star()],
                    from: b.from(b.table('t2', { schema: 'public' })),
                })
            )
        );
        const ast = b.query(
            b.select({ projections: [b.star()], from: b.from(b.cteref('c1')) }),
            [cte1, cte2]
        );
        const refs = collectTableRefs(ast);
        // t1, t2 из тел CTE; c1 (CteRef) — нет
        expect(refs).toEqual([
            { schema: 'public', name: 't1' },
            { schema: 'public', name: 't2' },
        ]);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. Совместимость ключа с BaseSqlStatsProvider._key
// ──────────────────────────────────────────────────────────────────────────────

describe('collectTableRefs — совместимость с BaseSqlStatsProvider._key', () => {
    test('нормализованный ключ schema.name совпадает с _key()', () => {
        const {
            BaseSqlStatsProvider,
        } = require('../../query-optimizer/stats/BaseSqlStatsProvider');

        const ast = selectFrom(b.table('accounts', { schema: 'fin' }));
        const refs = collectTableRefs(ast);

        expect(refs).toHaveLength(1);
        // _key принимает { schema, name } -> "fin.accounts"
        expect(BaseSqlStatsProvider._key(refs[0])).toBe('fin.accounts');
    });

    test('таблица без схемы: _key получает defaultSchema', () => {
        const {
            BaseSqlStatsProvider,
        } = require('../../query-optimizer/stats/BaseSqlStatsProvider');

        const ast = selectFrom(b.table('events'));
        const refs = collectTableRefs(ast, { defaultSchema: 'public' });

        expect(refs).toHaveLength(1);
        expect(BaseSqlStatsProvider._key(refs[0])).toBe('public.events');
    });
});
