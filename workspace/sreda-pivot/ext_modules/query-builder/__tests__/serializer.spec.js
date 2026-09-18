'use strict';

const {
    b,
    serialize,
    deserialize,
    toJSONString,
    fromJSONString,
} = require('../index');
const Node = require('../ast/Node');

// ──────────────────────────────────────────────────────────────────────────────
// Вспомогательные утилиты
// ──────────────────────────────────────────────────────────────────────────────

/** Полный round-trip: AST -> JSON-string -> AST, затем сравнение toJSON() */
function roundTrip(node, opts = {}) {
    const str = toJSONString(node, { allowRaw: true, ...opts });
    const restored = fromJSONString(str, {
        allowRaw: true,
        strict: true,
        ...opts,
    });
    return { restored, json: JSON.parse(str) };
}

function expectRoundTrip(node) {
    const { restored } = roundTrip(node);
    expect(Node.is(restored)).toBe(true);
    expect(restored.kind).toBe(node.kind);
    expect(restored.toJSON()).toEqual(node.toJSON());
    // NOTE: не возвращаем значение - Jest требует void | Promise
}

// ──────────────────────────────────────────────────────────────────────────────
// Базовые узлы (expr)
// ──────────────────────────────────────────────────────────────────────────────

describe('serializer - expr nodes', () => {
    test('Literal (string)', () => expectRoundTrip(b.lit('hello')));
    test('Literal (number)', () => expectRoundTrip(b.lit(42)));
    test('Literal (null)', () => expectRoundTrip(b.lit(null)));
    test('Literal (boolean)', () => expectRoundTrip(b.lit(true)));
    test('Literal (Date)', () => {
        const d = new Date('2025-01-15T12:00:00.000Z');
        const node = b.lit(d);
        const { restored } = roundTrip(node);
        expect(restored.value instanceof Date).toBe(true);
        expect(restored.value.toISOString()).toBe(d.toISOString());
    });
    test('Literal (BigInt)', () => {
        const node = b.lit(BigInt('123456789012345678901234567890'));
        const { restored } = roundTrip(node);
        expect(typeof restored.value).toBe('bigint');
        expect(restored.value).toBe(BigInt('123456789012345678901234567890'));
    });
    test('Raw', () => expectRoundTrip(b.raw('NOW()', [1, 2])));
    test('Identifier', () => expectRoundTrip(b.id('col', 'tbl')));
    test('Column', () => expectRoundTrip(b.col('name', 'u', 'user_name')));
    test('Param', () => expectRoundTrip(b.param('t-1')));
    test('Star', () => expectRoundTrip(b.star('t', ['col1'])));
    test('Null', () => expectRoundTrip(b.null_()));
    test('DataType', () =>
        expectRoundTrip(b.dataType('numeric', [38, 6], false)));
    test('BinaryOp', () => expectRoundTrip(b.eq(b.col('a'), b.lit(1))));
    test('UnaryOp NOT', () => expectRoundTrip(b.not(b.col('flag'))));
    test('UnaryOp IS NULL', () => expectRoundTrip(b.isNull(b.col('x'))));
    test('InList', () =>
        expectRoundTrip(b.in(b.col('x'), [b.lit(1), b.lit(2)])));
    test('Between', () =>
        expectRoundTrip(b.between(b.col('n'), b.lit(1), b.lit(10))));
    test('Like', () =>
        expectRoundTrip(
            b.like(b.col('name'), b.lit('%foo%'), { caseInsensitive: true })
        ));
    test('Exists', () => {
        const sub = b.select({ projections: [b.proj(b.lit(1))] });
        expectRoundTrip(b.exists(sub));
    });
    test('Quantified', () => {
        const arr = b.arr([b.lit(1), b.lit(2)]);
        expectRoundTrip(b.quantified('=', b.col('x'), arr));
    });
    test('Tuple', () => expectRoundTrip(b.tuple([b.col('a'), b.col('b')])));
    test('FieldAccess (.)', () =>
        expectRoundTrip(b.field(b.col('obj'), 'prop', '.')));
    test('FieldAccess (->)', () =>
        expectRoundTrip(b.field(b.col('doc'), 'key', '->')));
    test('Interval', () => expectRoundTrip(b.interval('1 day', null)));
    test('Collate', () => expectRoundTrip(b.collate(b.col('name'), 'C')));
    test('AtTimeZone', () => expectRoundTrip(b.atTz(b.col('ts'), 'UTC')));
    test('Lambda', () =>
        expectRoundTrip(b.lambda('x', b.bin('+', b.col('x'), b.lit(1)))));
    test('NamedArg', () => expectRoundTrip(b.namedArg('key', b.lit('val'))));
    test('FunctionCall', () => expectRoundTrip(b.fn('count', [b.star()])));
    test('FunctionCall with filter', () => {
        const node = b.fn('sum', [b.col('val')], {
            filter: b.gt(b.col('x'), b.lit(0)),
        });
        expectRoundTrip(node);
    });
    test('WindowFunction', () => {
        const fn = b.fn('row_number', []);
        const frame = b.frame('rows', b.frameBound('unboundedPreceding'));
        expectRoundTrip(
            b.win(fn, {
                partitionBy: [b.col('dept')],
                orderBy: [b.orderItem(b.col('sal'), 'DESC')],
                frame,
            })
        );
    });
    test('Cast', () => expectRoundTrip(b.cast(b.col('n'), 'TEXT')));
    test('Case', () => {
        const node = b.case_(
            [{ when: b.gt(b.col('x'), b.lit(0)), then: b.lit('pos') }],
            b.lit('neg')
        );
        expectRoundTrip(node);
    });
    test('ArrayExpr', () =>
        expectRoundTrip(b.arr([b.lit(1), b.lit(2), b.lit(3)])));
    test('SubqueryExpr', () => {
        const q = b.select({ projections: [b.proj(b.col('id'))] });
        expectRoundTrip(b.sub(q));
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// Clause nodes
// ──────────────────────────────────────────────────────────────────────────────

describe('serializer - clause nodes', () => {
    test('TableSource', () =>
        expectRoundTrip(b.table('users', { schema: 'public', alias: 'u' })));
    test('SubquerySource', () => {
        const q = b.select({ projections: [b.proj(b.star())] });
        expectRoundTrip(b.subsrc(q, 'sub'));
    });
    test('CteRef', () => expectRoundTrip(b.cteref('my_cte', 'mc')));
    test('ValuesList', () => {
        const rows = [
            [b.lit(1), b.lit('a')],
            [b.lit(2), b.lit('b')],
        ];
        expectRoundTrip(
            b.values(rows, { alias: 'v', columns: ['id', 'name'] })
        );
    });
    test('From', () => {
        const src = b.table('orders');
        const j = b.join(
            'left',
            b.table('items'),
            b.eq(b.col('id', 'orders'), b.col('order_id', 'items'))
        );
        expectRoundTrip(b.from(src, [j]));
    });
    test('Join', () => {
        const j = b.join('inner', b.table('t'), null, ['id']);
        expectRoundTrip(j);
    });
    test('Projection', () => expectRoundTrip(b.proj(b.col('id'), 'user_id')));
    test('OrderItem', () =>
        expectRoundTrip(b.orderItem(b.col('name'), 'DESC', 'LAST')));
    test('GroupBy', () =>
        expectRoundTrip(b.group([b.col('dept'), b.col('month')])));
    test('GroupingSets', () => {
        const sets = [[b.col('a'), b.col('b')], [b.col('a')], []];
        expectRoundTrip(b.groupingSets(sets));
    });
    test('Rollup', () =>
        expectRoundTrip(b.rollup([b.col('year'), b.col('month')])));
    test('Cube', () => expectRoundTrip(b.cube([b.col('a'), b.col('b')])));
    test('Limit', () => expectRoundTrip(b.limit(10, 20)));
    test('FetchFirst', () =>
        expectRoundTrip(b.fetchFirst(5, { withTies: true })));
    test('Frame + FrameBound', () => {
        const frame = b.frame(
            'rows',
            b.frameBound('unboundedPreceding'),
            b.frameBound('currentRow')
        );
        expectRoundTrip(frame);
    });
    test('Window', () => {
        const w = b.window_('w1', {
            partitionBy: [b.col('dept')],
            orderBy: [b.orderItem(b.col('sal'))],
        });
        expectRoundTrip(w);
    });
    test('ForClause', () =>
        expectRoundTrip(
            b.forClause('update', { of: ['users'], wait: 'nowait' })
        ));
    test('OnConflict nothing', () => expectRoundTrip(b.onConflict('nothing')));
    test('OnConflict update', () => {
        const oc = b.onConflict('update', {
            target: { columns: ['email'], constraint: null, where: null },
            set: [b.assign('name', b.col('excluded_name'))],
        });
        expectRoundTrip(oc);
    });
    test('Assignment', () =>
        expectRoundTrip(b.assign('status', b.lit('active'))));
    test('Returning', () =>
        expectRoundTrip(b.returning([b.proj(b.col('id'))])));
});

// ──────────────────────────────────────────────────────────────────────────────
// Statement nodes
// ──────────────────────────────────────────────────────────────────────────────

describe('serializer - stmt nodes', () => {
    test('Select simple', () => {
        const q = b.select({
            projections: [b.proj(b.col('id')), b.proj(b.col('name'))],
            from: b.from(b.table('users', { schema: 'public', alias: 'u' })),
            where: b.eq(b.col('tenant', 'u'), b.param('t-1')),
        });
        expectRoundTrip(q);
    });
    test('Select with windows + forClause', () => {
        const fn = b.fn('row_number', []);
        const win = b.win(fn, { partitionBy: [b.col('dept')] });
        const q = b.select({
            projections: [b.proj(win, 'rn')],
            from: b.from(b.table('emp')),
            windows: [b.window_('w1', { partitionBy: [b.col('dept')] })],
            forClause: b.forClause('update', { wait: 'skipLocked' }),
        });
        expectRoundTrip(q);
    });
    test('SetOp (UNION ALL)', () => {
        const left = b.select({ projections: [b.proj(b.lit(1))] });
        const right = b.select({ projections: [b.proj(b.lit(2))] });
        expectRoundTrip(b.union(left, right));
    });
    test('SetOp (INTERSECT)', () => {
        const left = b.select({ projections: [b.proj(b.col('id'))] });
        const right = b.select({ projections: [b.proj(b.col('id'))] });
        expectRoundTrip(b.intersect(left, right));
    });
    test('Cte', () => {
        const body = b.select({ projections: [b.proj(b.star())] });
        expectRoundTrip(b.cte('my_cte', body, { materialization: 'cte' }));
    });
    test('Query with CTEs', () => {
        const cteBody = b.select({ projections: [b.proj(b.col('id'))] });
        const body = b.select({
            projections: [b.proj(b.star())],
            from: b.from(b.cteref('my_cte')),
        });
        expectRoundTrip(b.query(body, [b.cte('my_cte', cteBody)]));
    });
    test('Insert VALUES', () => {
        const q = b.insert({
            table: b.table('users'),
            columns: ['id', 'name'],
            rows: [[b.param(1), b.param('alice')]],
        });
        expectRoundTrip(q);
    });
    test('Insert SELECT', () => {
        const q = b.insert({
            table: b.table('archive'),
            columns: ['id'],
            source: b.select({
                projections: [b.proj(b.col('id'))],
                from: b.from(b.table('users')),
            }),
        });
        expectRoundTrip(q);
    });
    test('Update', () => {
        const q = b.update({
            table: b.table('users'),
            assignments: [b.assign('status', b.lit('active'))],
            where: b.eq(b.col('id'), b.param(42)),
            returning: b.returning([b.proj(b.col('id'))]),
        });
        expectRoundTrip(q);
    });
    test('Delete', () => {
        const q = b.delete_({
            table: b.table('logs'),
            where: b.lt(b.col('created_at'), b.param('2020-01-01')),
        });
        expectRoundTrip(q);
    });
    test('Merge', () => {
        const q = b.merge(
            b.table('target', { alias: 't' }),
            b.table('source', { alias: 's' }),
            b.eq(b.col('id', 't'), b.col('id', 's')),
            [
                b.mergeClause({
                    matched: true,
                    action: 'update',
                    set: [b.assign('name', b.col('name', 's'))],
                }),
                b.mergeClause({
                    matched: false,
                    action: 'insert',
                    columns: ['id', 'name'],
                    values: [b.col('id', 's'), b.col('name', 's')],
                }),
            ]
        );
        expectRoundTrip(q);
    });
    test('CreateTempTable', () => {
        const q = b.tempTable({
            name: 'tmp_users',
            query: b.select({ projections: [b.proj(b.star())] }),
        });
        expectRoundTrip(q);
    });
    test('DropTable', () =>
        expectRoundTrip(b.drop({ name: b.table('tmp_users') })));
    test('CreateView', () => {
        const q = b.createView({
            name: 'v_users',
            query: b.select({
                projections: [b.proj(b.star())],
                from: b.from(b.table('users')),
            }),
            orReplace: true,
        });
        expectRoundTrip(q);
    });
    test('DropView', () => expectRoundTrip(b.dropView({ name: 'v_users' })));
    test('Truncate', () =>
        expectRoundTrip(
            b.truncate([b.table('t1'), b.table('t2')], { cascade: true })
        ));
});

// ──────────────────────────────────────────────────────────────────────────────
// Envelope и безопасность
// ──────────────────────────────────────────────────────────────────────────────

describe('serializer - envelope & security', () => {
    test('envelope содержит $schema и version', () => {
        const node = b.lit(1);
        const env = serialize(node);
        expect(env.$schema).toBe('mqb-ast/1');
        expect(env.version).toBe(1);
        expect(env.root).toBeDefined();
    });

    test('deserialize отказывается при неверной $schema', () => {
        expect(() =>
            deserialize({ $schema: 'wrong', version: 1, root: {} })
        ).toThrow(/неверная схема/);
    });

    test('deserialize отказывается при версии выше поддерживаемой', () => {
        expect(() =>
            deserialize({ $schema: 'mqb-ast/1', version: 999, root: {} })
        ).toThrow(/новее поддерживаемой/);
    });

    test('Raw-узел запрещён при allowRaw=false (по умолчанию)', () => {
        const node = b.raw('SELECT 1');
        const str = toJSONString(node, { allowRaw: true });
        expect(() => fromJSONString(str, { allowRaw: false })).toThrow(
            /Raw.*allowRaw=false/
        );
    });

    test('Raw-узел разрешён при allowRaw=true', () => {
        const node = b.raw('SELECT 1', [1]);
        const restored = fromJSONString(
            toJSONString(node, { allowRaw: true }),
            { allowRaw: true }
        );
        expect(restored.kind).toBe('Raw');
        expect(restored.sql).toBe('SELECT 1');
    });

    test('strict=false пропускает неизвестный kind', () => {
        const env = {
            $schema: 'mqb-ast/1',
            version: 1,
            allowRaw: false,
            root: { kind: 'FutureNode', someField: 42 },
        };
        const result = deserialize(env, { strict: false });
        expect(result.kind).toBe('FutureNode');
    });

    test('strict=true выбрасывает на неизвестный kind', () => {
        const env = {
            $schema: 'mqb-ast/1',
            version: 1,
            allowRaw: false,
            root: { kind: 'FutureNode', someField: 42 },
        };
        expect(() => deserialize(env, { strict: true })).toThrow(
            /неизвестный kind/
        );
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// codec отдельно
// ──────────────────────────────────────────────────────────────────────────────

describe('codec - encode/decode', () => {
    const { encode, decode } = require('../serializer/codec');

    test('Date round-trip', () => {
        const d = new Date('2025-06-01T00:00:00.000Z');
        const enc = encode(d);
        expect(enc.$t).toBe('date');
        const dec = decode(enc);
        expect(dec instanceof Date).toBe(true);
        expect(dec.toISOString()).toBe(d.toISOString());
    });

    test('BigInt round-trip', () => {
        const v = BigInt('9999999999999999999999');
        const enc = encode(v);
        expect(enc.$t).toBe('bigint');
        expect(decode(enc)).toBe(v);
    });

    test('Buffer round-trip', () => {
        const buf = Buffer.from('hello world');
        const enc = encode(buf);
        expect(enc.$t).toBe('bytes');
        const dec = decode(enc);
        expect(dec.toString()).toBe('hello world');
    });

    test('undefined round-trip', () => {
        const enc = encode(undefined);
        expect(enc.$t).toBe('undef');
        expect(decode(enc)).toBeUndefined();
    });

    test('plain primitives pass-through', () => {
        expect(encode('hello')).toBe('hello');
        expect(encode(42)).toBe(42);
        expect(encode(true)).toBe(true);
        expect(encode(null)).toBe(null);
        expect(decode('hello')).toBe('hello');
    });

    test('nested array', () => {
        const d = new Date('2025-01-01T00:00:00.000Z');
        const enc = encode([1, d, 'str']);
        expect(Array.isArray(enc)).toBe(true);
        const dec = decode(enc);
        expect(dec[0]).toBe(1);
        expect(dec[1] instanceof Date).toBe(true);
        expect(dec[2]).toBe('str');
    });
});
