'use strict';

/**
 * codec.js - кодирование/декодирование «нестандартных» JS-значений
 * в JSON-safe представление вида { $t: <tag>, v: <encoded> }.
 *
 * Поддерживаемые теги:
 *   date    - Date -> ISO-строка
 *   bigint  - BigInt -> десятичная строка
 *   bytes   - Buffer/Uint8Array -> base64-строка
 *   decimal - объект { d: string } (напр. из decimal.js/big.js) -> строка
 *   regexp  - RegExp -> { src, flags }
 *   undef   - undefined
 *
 * Примитивы string/number/boolean/null и plain-array/plain-object
 * кодируются рекурсивно «как есть» (без тега).
 */

/** @param {any} v @returns {boolean} */
function isTagged(v) {
    return (
        v !== null &&
        typeof v === 'object' &&
        typeof v.$t === 'string' &&
        Object.prototype.hasOwnProperty.call(v, 'v')
    );
}

/** Рекурсивно кодирует значение. */
function encode(value) {
    if (value === undefined) return { $t: 'undef', v: null };
    if (value === null) return null;
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    )
        return value;
    if (typeof value === 'bigint') return { $t: 'bigint', v: value.toString() };
    if (value instanceof Date) return { $t: 'date', v: value.toISOString() };
    if (value instanceof RegExp)
        return { $t: 'regexp', v: { src: value.source, flags: value.flags } };
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return { $t: 'bytes', v: value.toString('base64') };
    }
    if (value instanceof Uint8Array) {
        return {
            $t: 'bytes',
            v: Buffer
                ? Buffer.from(value).toString('base64')
                : btoa(String.fromCharCode(...value)),
        };
    }
    // объект с методом .toJSON/toString для decimal-библиотек (decimal.js, big.js)
    if (
        typeof value === 'object' &&
        typeof value.toFixed === 'function' &&
        typeof value.toString === 'function'
    ) {
        return { $t: 'decimal', v: value.toString() };
    }
    if (Array.isArray(value)) return value.map(encode);
    if (typeof value === 'object') {
        const out = {};
        for (const k of Object.keys(value)) out[k] = encode(value[k]);
        return out;
    }
    // fallthrough: отдаём как есть (может потеряться, но не взорвётся)
    return value;
}

/** Рекурсивно декодирует значение, произведённое encode(). */
function decode(value) {
    if (value === null || typeof value !== 'object') return value;
    if (isTagged(value)) {
        switch (value.$t) {
            case 'undef':
                return undefined;
            case 'bigint':
                return BigInt(value.v);
            case 'date':
                return new Date(value.v);
            case 'regexp':
                return new RegExp(value.v.src, value.v.flags);
            case 'bytes': {
                const raw =
                    typeof Buffer !== 'undefined'
                        ? Buffer.from(value.v, 'base64')
                        : Uint8Array.from(atob(value.v), (c) =>
                              c.charCodeAt(0)
                          );
                return raw;
            }
            case 'decimal':
                return value.v; // возвращаем строку; потребитель сам обернёт в Decimal
            default:
                return value; // неизвестный тег - пропускаем
        }
    }
    if (Array.isArray(value)) return value.map(decode);
    const out = {};
    for (const k of Object.keys(value)) out[k] = decode(value[k]);
    return out;
}

module.exports = { encode, decode, isTagged };
