const is = require('./is.js');
const _hop = is._hop;

const util = require('util');
function _inspect(any) {
    // JSON.stringify(model_settings_filter, null, 4)
    return util.inspect(any, false, null, false); // util.inspect(object[, showHidden[, depth[, colors]]])
}

const CFG = {
    EXPOSE_STACK: sreda.env?.FSCKCFG_EXPOSE_STACK ?? false, // выдавать на фронт стектрейс
};

// тип исключения, который позволяет добавлять своё описание к описанию FSCKLogEntry
class FSCKError extends Error {}

class FSCKLogEntry extends Error {
    constructor(message, opts = {}) {
        /*
                if (null != cause) {
                    if ("SequelizeDatabaseError" == cause.name) {
                        message += ` (${cause.message})`;
                    }
                    else {
                        message += ` (подробности только в системном логе; ctor is ${cause.name})`;
                    }
                }
        */
        const value = opts.value;
        if (value instanceof FSCKError) {
            message += `\n#${
                FSCKError.name === value.constructor.name ? '' : `${value.constructor.name}: `
            }${value.message}`;
            //opts.value = void 0; //`${value.constructor.name}: ${value.message}`
        }
        super(message);
        this.name = this.constructor.name;
        this.path = opts.path;
        this.value = opts.value;
        this.expect = opts.expect;
        this.compare = opts.compare;
        this.pass = opts.pass; // true, false, null
        this.strict = opts.strict;
        this.data = opts.data;

        this.type =
            opts.type ?? // может быть явно указано (напр. dump)
            (null == this.pass
                ? 'info' // нет контроля значения: информация
                : this.pass
                ? 'pass' // прошёл в любом случае
                : this.strict
                ? 'stop' // не прошёл критичную проверку
                : opts.failtype ?? 'warn'); // не прошёл некритичную проверку
    }

    /**
     * для включения значений в текст ошибки
     */
    static esc(any) {
        return JSON.stringify(any);
    }

    static mk(path, message, value, data = {}, opts = {}) {
        const strict = opts?.strict ? true : false; // если true, то бросать исключение, а не возвращать его при провале проверки
        const expect = opts?.expect; // ожидаемое значение value или ф-я, проверяющая соответствие value ожиданиям
        const compare =
            expect instanceof Function ? expect : _hop(opts, 'expect') ? is.eq(expect) : null;
        const pass = compare ? compare(value) : null;

        const e = new this(message, {
            ...opts,
            path,
            value,
            expect,
            compare,
            pass,
            strict,
            data,
        });

        Error.captureStackTrace(e, opts.trace ?? this.mk); // не мусорить в логах утилитарными вызовами

        if (strict) {
            if (false === e.pass) throw e;
            else if (null === e.pass)
                console.error(
                    'FSCKLogEntry.mk: opts.strict is true, but opts.expect is not configured',
                    e
                );
        }

        return e;
    }
}

function assert(path, message, value, expect, data = {}, opts = {}) {
    return FSCKLogEntry.mk(path, message, value, data, { ...opts, expect, strict: true });
}
function check(path, message, value, expect, data = {}, opts = {}) {
    return FSCKLogEntry.mk(path, message, value, data, { ...opts, expect, strict: false });
}
function info(path, message, value, data = {}, opts = {}) {
    return FSCKLogEntry.mk(path, message, value, data, opts);
}
function dump(path, message, value, data = {}, opts = {}) {
    return FSCKLogEntry.mk(path, message, value, data, { ...opts, type: 'dump' });
}
function tell(path, message, data = {}, opts = {}) {
    return FSCKLogEntry.mk(path, message, undefined, data, { type: 'info', ...opts });
}

function path_push(path, item) {
    return [...(path ?? []), item];
}
// "объект метаданных"
function path_meta(path, id, meta, name) {
    // { id: self.id, meta: this.constructor.name, name: self.name };
    // if (!("string" == typeof meta)) meta = meta.constructor.name;
    return path_push(path, { id, meta, name });
}
// "свойство или комбинация свойств"
function path_prop(path, prop, name) {
    return path_push(path, { prop, name });
}
function path_step(path, step, name) {
    return path_push(path, { step, name });
}

/**
 * @param {{ fsck_self?(self: object, opts?: object): AsyncIterable }} meta // экземпляр класса-оператора объекта ( = await Metadata.getParentInstance(id, { ... }) )
 * @param {object} self // объект ( = await Metadata.getItem(id, { ... }) )
 * @param {object} opts
 * @returns AsyncIterable
 */
async function* run(meta, self, opts) {
    const mkentry = (e, path, type, value, expect, message, stack = null) => {
        if (value instanceof FSCKError) {
            value = undefined; // описание будет в message, тут не спамим
        }

        return {
            path,
            type,
            value,
            expect,
            message,
            stack: CFG.EXPOSE_STACK ? stack : null,
        };
    };

    try {
        for await (const e of meta.fsck_self(self, opts)) {
            yield e instanceof FSCKLogEntry
                ? mkentry(e, e.path, e.type, e.value, e.expect, e.message, e.stack)
                : mkentry(
                      {},
                      null,
                      '----',
                      null,
                      null,
                      e.message ?? ('string' == typeof e ? e : _inspect(e)),
                      e.stack
                  );
        }
    } catch (e) {
        console.error(e);
        yield e instanceof FSCKLogEntry
            ? mkentry(e, e.path, e.type, e.value, e.expect, e.message, e.stack)
            : mkentry(
                  {},
                  null,
                  'fail',
                  null,
                  null,
                  e.message ?? ('string' == typeof e ? e : _inspect(e)),
                  e.stack
              );
    }

    // return {
    //     id,
    //     item,
    //     meta,
    //     //tree,
    //     parents,
    //     children
    // };

    // parent   надобъект (напр. справочник инфосервиса для поля)
    // subobj   подобъекты (поля, ключи итп)
    // dirdep   зависимости (напр. подключенный справочник для поля)
    // revdep   что зависит от этого объекта

    //const { parents, children } = await meta.getFamilyTree(id, { transaction });
}

module.exports = {
    CFG,
    _inspect,
    path_meta,
    path_prop,
    // path_step,
    Error: FSCKError,
    LogEntry: FSCKLogEntry,
    assert,
    check,
    info,
    dump,
    tell,
    is,
    run,
};
