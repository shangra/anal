'use strict';

const { hop } = require('../../utils/services');

const b = require('../builder');
const Node = require('../ast/Node');

/**
 * Парсит where-объект в AST-выражение для последующей печати.
 *
 * Поддерживаемые операторы (leaf-уровень):
 *   $eq, $ne, $is, $lt, $lte, $gt, $gte, $in, $nin, $iLike, $like, $not, $and, $or
 *
 * Поддерживаемые операторы (field-уровень):
 *   $and, $or, $not
 *
 * Leaf-уровневые $and / $or работают умно: если элемент - operator-объект,
 * он остаётся в leaf-контексте с тем же col; если хотя бы один ключ элемента
 * - это не оператор (т.е. имя поля), элемент делегируется в walkWhere как
 * самостоятельный where-объект.
 *
 * Возвращает корневой узел AST или null (если условие отсутствует или полностью пустое).
 *
 * @param {any} where
 * @param {{ resolveColumn?: (name: string) => import('../ast').Node }} [opts]
 * @returns {import('../ast').Node | null}
 */
function normalizeWhere(where, opts = {}) {
    const resolve = opts.resolveColumn || ((name, value) => b.col(name));

    /**
     * Служебные мета-ключи, добавляемые клиентским кодом (meta-where-formatter и др.).
     * Они не являются SQL-операторами и должны игнорироваться при построении AST.
     */
    const META_KEYS = new Set(['__level__', '__parent__']);
    const isMetaKey = (k) => META_KEYS.has(k);

    // ---------- field-level ----------
    function walkWhere(w) {
        if (w == null) return null;
        if (Node.is(w)) return w;
        if (Array.isArray(w)) return b.and(...w.map(walkWhere));
        if (typeof w !== 'object') return null;

        const conjuncts = [];
        for (const [k, v] of Object.entries(w)) {
            switch (k) {
                case '$and':
                    conjuncts.push(b.and(...normalizeList(v, walkWhere)));
                    continue;
                case '$or':
                    conjuncts.push(b.or(...normalizeList(v, walkWhere)));
                    continue;
                case '$not':
                    conjuncts.push(b.not(walkWhere(v)));
                    continue;
            }

            // Служебный мета-ключ (__level__, __parent__) — игнорируем.
            if (isMetaKey(k)) continue;
            // Ключ, начинающийся с '$', без column-контекста (operator-object без поля):
            // в field-level обходе нет текущей колонки — условие не может быть построено, пропускаем.
            if (k.startsWith('$')) continue;
            conjuncts.push(walkLeaf(resolve(k), v));
        }
        return unwrap(conjuncts, 'AND');
    }

    // ---------- leaf-level ----------
    function walkLeaf(col, v) {
        if (v === undefined) return null;
        if (v === null) return b.isNull(col);
        if (Node.is(v)) return v;
        if (Array.isArray(v)) return arrayToIn(col, v, false);
        if (typeof v !== 'object') return b.eq(col, b.param(v));

        const parts = [];
        for (const [op, val] of Object.entries(v)) {
            const node = handleOp(col, op, val);
            if (node) parts.push(node);
        }
        return unwrap(parts, 'AND');
    }

    function handleOp(col, op, val) {
        switch (op) {
            // TODO костыль
            case '$eq':
                return val === null
                    ? b.isNull(col)
                    : hop(val, '$is')
                    ? b.isNull(col)
                    : b.eq(col, b.param(val));
            case '$ne':
                return val === null
                    ? b.not(b.isNull(col))
                    : !(typeof val != 'object' && Array.isArray(val))
                    ? b.ne(col, b.param(val))
                    : b.ne(col, walkLeaf(col, val));

            case '$is':
                return val === null ? b.isNull(col) : b.eq(col, b.param(val));

            case '$any':
                return b.bin('ARRAY_CONTAINS', col, b.param(val));

            case '$between':
            case '$btw':
                return b.and(
                    b.gt(col, b.param(val[0])),
                    b.lt(col, b.param(val[1]))
                );

            case '$notBetween':
                return b.not(
                    b.and(
                        b.gt(col, b.param(val[0])),
                        b.lt(col, b.param(val[1]))
                    )
                );

            case '$lt':
                return b.lt(col, b.param(val));
            case '$lte':
                return b.le(col, b.param(val));
            case '$gt':
                return b.gt(col, b.param(val));
            case '$gte':
                return b.ge(col, b.param(val));

            case '$in':
                return arrayToIn(col, val, false);
            case '$notIn':
            case '$nin':
                return arrayToIn(col, val, true);

            case '$iLike':
                return b.bin('ILIKE', col, b.param(val));
            case '$notILike':
                return b.not(b.bin('ILIKE', col, b.param(val)));
            case '$like':
                return b.bin('LIKE', col, b.param(val));
            case '$substring':
                return b.bin('LIKE', col, b.param(`%${val}%`));

            case '$not':
                return val == null ? null : b.not(walkLeaf(col, val));

            // Служебный мета-ключ (__level__, __parent__) в operator-контексте — игнорируем.
            default:
                if (isMetaKey(op)) return null;
                // fall through намеренно не используется — break ниже недостижим.
                throw new Error(
                    `normalizeWhere: неизвестный оператор "${op}"` +
                        (col?.name ? ` для колонки "${col.name}"` : '') +
                        '.'
                );

            case '$and':
            case '$or': {
                const list = normalizeList(val, (x) => walkLeafOrField(col, x));
                if (!list.length)
                    return op === '$or' ? b.eq(b.lit(1), b.lit(2)) : null;
                return op === '$and' ? b.and(...list) : b.or(...list);
            }

            /* default: обработан выше (перед '$and') */
        }
    }

    /**
     * Определяет, как интерпретировать элемент внутри leaf-уровневых $or/$and:
     *  - примитив / массив / null          -> leaf (equals / IN / IS NULL);
     *  - объект только с $-ключами         -> leaf (operator-объект для того же col);
     *  - объект с ≥1 не-$-ключом           -> where (самостоятельный field-level).
     */
    function walkLeafOrField(col, elem) {
        if (
            elem == null ||
            typeof elem !== 'object' ||
            Array.isArray(elem) ||
            Node.is(elem)
        ) {
            return walkLeaf(col, elem);
        }
        const keys = Object.keys(elem);
        if (!keys.length) return null;
        // Мета-ключи (__level__, __parent__) не являются ни операторами, ни именами полей;
        // исключаем их из детектирования, чтобы { $eq: "162", __level__: 0 } определялся
        // как operator-object для текущего col, а не делегировался в walkWhere как самостоятельный where.
        const allOperators = keys.every(
            (k) => k.startsWith('$') || isMetaKey(k)
        );
        return allOperators ? walkLeaf(col, elem) : walkWhere(elem);
    }

    /**
     * Приводит операнд $and/$or к массиву и прогоняет через переданный обход.
     * Позволяет быть толерантным к single-value записям типа `{ $or: { $eq: 1 } }`.
     */
    function normalizeList(val, fn) {
        const arr = Array.isArray(val) ? val : val == null ? [] : [val];
        return arr.map(fn).filter((x) => x != null);
    }

    /** Формирует IN / NOT IN из массива; безопасно обрабатывает пустой список. */
    function arrayToIn(col, val, negate) {
        const arr = Array.isArray(val) ? val : val == null ? [] : [val];
        if (!arr.length)
            return negate ? b.eq(b.lit(1), b.lit(1)) : b.eq(b.lit(1), b.lit(2));
        return b.in(
            col,
            arr.map((x) => b.param(x)),
            negate
        );
    }

    /** Свернуть список узлов: [] -> null, [x] -> x, [x,y,...] -> AND/OR. */
    function unwrap(list, kind) {
        const clean = list.filter((x) => x != null);
        if (!clean.length) return null;
        if (clean.length === 1) return clean[0];
        return kind === 'AND' ? b.and(...clean) : b.or(...clean);
    }

    return walkWhere(where);
}

module.exports = { normalizeWhere };
