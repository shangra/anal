'use strict';

/**
 * serializer/index.js - сериализация / десериализация AST в JSON.
 *
 * API:
 *   serialize(root, opts?)   -> plain JSON-safe object (envelope)
 *   deserialize(json, opts?) -> Node (экземпляр одного из ast-классов)
 *   toJSONString(root, opts?)   -> string
 *   fromJSONString(str, opts?)  -> Node
 *
 * Формат envelope:
 *   {
 *     $schema: 'mqb-ast/1',
 *     version: 1,
 *     allowRaw: boolean,
 *     root: <serialized node tree>
 *   }
 *
 * Каждый узел AST -> { kind: <string>, ...остальные поля с кодированными значениями }.
 * Поля-значения (Literal.value, Param.value и т.п.) кодируются через codec.encode,
 * чтобы сохранить Date, BigInt, Buffer и другие не-JSON типы.
 *
 * Безопасность:
 *   deserialize({ allowRaw: false } по умолчанию) - выбрасывает ошибку при встрече
 *   узлов с kind='Raw', предотвращая SQL-инъекции из недоверенного источника.
 */

const Node = require('../ast/Node');
const registry = require('./registry');
const codec = require('./codec');

const SCHEMA = 'mqb-ast/1';
const VERSION = 1;

// Поля, чьи значения нужно прогонять через codec (листовые JS-значения)
const VALUE_FIELDS = new Set(['value', 'bindings']);

// ──────────────────────────────────────────────────────────────────────────────
// serialize
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Рекурсивно превращает узел/значение в JSON-safe представление.
 * @param {any} node
 * @param {{ allowRaw: boolean }} opts
 * @returns {any}
 */
function serializeNode(node, opts) {
    if (node === null || node === undefined) return node;

    // Узел AST
    if (Node.is(node)) {
        const obj = { kind: node.kind };
        for (const k of Object.keys(node)) {
            if (k === 'kind') continue;
            obj[k] = serializeField(k, node[k], opts);
        }
        return obj;
    }

    // Массив
    if (Array.isArray(node))
        return node.map((item) => serializeNode(item, opts));

    // Примитив / plain-object (напр. hints, distribute, target в OnConflict)
    if (typeof node === 'object') {
        const out = {};
        for (const k of Object.keys(node))
            out[k] = serializeField(k, node[k], opts);
        return out;
    }

    return node;
}

function serializeField(key, value, opts) {
    // Поля-листовые значения (не узлы AST)
    if (VALUE_FIELDS.has(key)) return codec.encode(value);
    return serializeNode(value, opts);
}

/**
 * @param {import('../ast/Node')} root - узел AST (любого вида)
 * @param {{ allowRaw?: boolean }} [opts]
 * @returns {{ $schema: string, version: number, allowRaw: boolean, root: object }}
 */
function serialize(root, { allowRaw = true } = {}) {
    return {
        $schema: SCHEMA,
        version: VERSION,
        allowRaw,
        root: serializeNode(root, { allowRaw }),
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// deserialize
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @param {any} value - plain-объект с полем kind (узел) или массив/примитив
 * @param {{ allowRaw: boolean, strict: boolean }} opts
 * @returns {any}
 */
function deserializeNode(value, opts) {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value))
        return value.map((item) => deserializeNode(item, opts));
    if (typeof value !== 'object') return value;

    // Узел AST - имеет поле kind и kind совпадает с именем класса в реестре
    if (typeof value.kind === 'string' && value.kind in registry) {
        if (value.kind === 'Raw' && !opts.allowRaw) {
            throw new Error(
                'mqb serializer: deserialize нашёл узел kind=Raw, но allowRaw=false. ' +
                    'Передача Raw-узлов из недоверенного источника запрещена.'
            );
        }

        const Ctor = registry[value.kind];
        const props = {};
        for (const k of Object.keys(value)) {
            if (k === 'kind') continue;
            props[k] = deserializeField(k, value[k], opts);
        }
        return new Ctor(props);
    }

    // Неизвестный kind
    if (typeof value.kind === 'string') {
        if (opts.strict) {
            throw new Error(
                `mqb serializer: неизвестный kind="${value.kind}". Используйте strict=false для пропуска.`
            );
        }
        // forward-compat: возвращаем как plain object
        return value;
    }

    // plain-объект без kind (hints, distribute, target и т.п.)
    const out = {};
    for (const k of Object.keys(value))
        out[k] = deserializeField(k, value[k], opts);
    return out;
}

function deserializeField(key, value, opts) {
    if (VALUE_FIELDS.has(key)) return codec.decode(value);
    return deserializeNode(value, opts);
}

/**
 * @param {{ $schema: string, version: number, allowRaw?: boolean, root: object }} envelope
 * @param {{ allowRaw?: boolean, strict?: boolean }} [opts]
 * @returns {import('../ast/Node')}
 */
function deserialize(envelope, { allowRaw = false, strict = true } = {}) {
    if (!envelope || envelope.$schema !== SCHEMA) {
        throw new Error(
            `mqb serializer: неверная схема. Ожидается $schema="${SCHEMA}".`
        );
    }
    if (envelope.version > VERSION) {
        throw new Error(
            `mqb serializer: версия ${envelope.version} новее поддерживаемой ${VERSION}. Обновите библиотеку.`
        );
    }

    // allowRaw в envelope - это то, с чем сохраняли; опция вызова - «доверяю ли я источнику»
    const effectiveAllowRaw = allowRaw && envelope.allowRaw !== false;

    return deserializeNode(envelope.root, {
        allowRaw: effectiveAllowRaw,
        strict,
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Строковые хелперы
// ──────────────────────────────────────────────────────────────────────────────

function toJSONString(root, opts = {}) {
    return JSON.stringify(serialize(root, opts));
}

function fromJSONString(str, opts = {}) {
    return deserialize(JSON.parse(str), opts);
}

module.exports = { serialize, deserialize, toJSONString, fromJSONString };
