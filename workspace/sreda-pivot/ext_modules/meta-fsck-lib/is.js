'use strict';

// обёртка hasOwnProperty для переменных, которые могут быть не объектами или объектами с неожиданным прототипом
const _hop = (obj, key) => obj != null && Object.prototype.hasOwnProperty.call(obj, key);

// порядок и значения в массивах совпадают (===)
const _arr_EQ = (a1, a2) => {
    if (a1 === a2) return true;
    if (a1 == null || a2 == null) return false;
    if (a1.length !== a2.length) return false;
    for (let i = 0, il = a1.length; i < il; ++i) if (a1[i] !== a2[i]) return false;
    return true;
};

const omitted = Symbol();
//const is1 = (op, fn) => Object.assign(fn, { op });
//const is2 = (op, fn) => Object.assign(fn, { op, expect });
const expect = omitted;
const is = (expect, op, fn) => Object.assign(fn, { op }, expect === omitted ? {} : { expect });

module.exports = Object.assign(is, {
    eq: (expect) => is(expect, 'eq', (value, arg = expect) => arg == value),
    EQ: (expect) => is(expect, 'EQ', (value, arg = expect) => arg === value),
    any: (expect) => is(expect, 'any', (value, arg = expect) => arg.includes(value)),
    something: is(expect, 'smth', (value) => null != value),
    true: is(expect, 'true', (value) => !!value),
    false: is(expect, 'false', (value) => !value),
    not_error: is(expect, 'not_error', (value) => !(value instanceof Error)),
    igt0: is(expect, 'igt0', (value) => Number.isInteger(value) && value > 0),
    _hop: _hop,
    hop: (expect) => is(expect, 'hop', (value, arg = expect) => _hop(value, arg)),
    arr_EQ: (expect) => is(expect, 'arr_EQ', (value, arg = expect) => _arr_EQ(value, arg)),
});
