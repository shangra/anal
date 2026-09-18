const { EventEmitter } = require("stream");

function shuffle(arr) {
    //DEBUG
    const { floor, random } = Math;
    for (let il = arr.length, i = il - 1; i > 0; --i) {
        const j = floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

//#FORSREDA этим флагом помечены детали, отличающие мою базовую реализацию от специализации под аналитику и/или атмосферу и/или ... в общем, сюда притащено с этими изменениями:
//#FORSREDA в основном, изменения связаны с удалением неоттестированной функциональности или того, в необходимости чего я не уверен -- чтобы не раздувать код
//#FORSREDA в исходной реализации есть ещё достаточное количество автотестов, но они должны в итоге приехать, когда saf2dim/ITABLE итп будет подключено внешним модулем
//#FORSREDA и ещё в базовой реализации все каменты на английском, и в итоге при интеграции вернётся английский

class ITABLE {
    /**
     * @param {{ pk: string, aux?: object, fks?: object }} opts
     * @param {Iterable<object>} [rows]
     */
    constructor(opts, rows = null) {
        // this.ee = new EventEmitter(); //#FORSREDA обрезано, мб верну; мало юзкейсов

        this.pki = new Map(); // primary index and dataset { [row[pk]]: row }
        this.ars = new Map(); // ("aux rows") auxilary row data (weights, compound indices, etc)
        this.afs = new Map(); // ("aux fns") functions to generate aux data
        this.fki = new Map(); // other indices { [fk]: { field, fn, data: { [row[fk]]: [row, row, ...] } } }

        //#FORSREDA можем, конечно, опылить код автоматическими первичными индексами,
        //#FORSREDA но в реальном мире нам это не нужно, т.к. все юзкейсы подразумевают наличие уникального поля в строках
        //#FORSREDA в оригинале pk не обязательны
        if (null == opts.pk) throw new Error("ITABLE FATAL: (ctor) primary key definition (opts.pk) is required");
        this._pk = opts.pk; // primary index field

        if (null != rows) {
            const { pki, _pk } = this;
            let n = 0;
            for (const row_new of rows) {
                // this.mod(null, row); // лучше использовать частный случай, раз точно знаем, что ещё не создали вторичные индексы
                const { [_pk]: pkv } = row_new; // само упадёт при row_new == null
                if (null == pkv) throw new Error("ITABLE FATAL: (ctor add) primary key value cannot be null/undefined"); // pkv не может быть null
                pki.set(pkv, row_new); // добавляем-обновляем ссылку на новую запись
            }
            if (pki.size != n) throw new Error("ITABLE FATAL: (ctor add) values for new primary key are not unique");
        }

        for (const [k, fn] of Object.entries(opts.aux ?? {})) {
            this.af_mod(k, fn);
        }

        for (const fk of opts.fks ?? []) {
            this.fk_mod(fk, "");
        }
    }

    /**
     * получить имя поля первичного ключа
     */
    get pk() {
        return this._pk;
    }

    /**
     * установить имя поля первичного ключа (пересоберёт первичный индекс, даже если имя то же)
     * @deprecated
     * @param {string} pk
     */
    set pk(pk) {
        throw new Error("ITABLE FATAL: .[set pk] is deprecated");
        if (null == pk) throw new Error("ITABLE FATAL: primary key definition is required");
        const pki = new Map();
        for (const row of this.pki.values()) {
            const { [pk]: pkv } = row; // само упадёт при row_new == null
            if (null == pkv) throw new Error("ITABLE FATAL: (pk reindex) primary key value cannot be null/undefined"); // pkv не может быть null
            pki.set(row[pk], row);
        }
        if (pki.size !== this.pki.size) throw new Error("ITABLE FATAL: values for new primary key are not unique");
        this._pk = pk;
        this.pki = pki;
    }

    /**
     * создать или обновить aux-поле; fn = null удалит поле
     * @param {string} k
     * @param {(function(object): any)|null} fn
     */
    af_mod(k, fn) {
        if (null == fn) {
            this.ars.delete(k);
            this.afs.delete(k);
            return this;
        }
        const aux = new WeakMap();
        this.ars.set(k, aux);
        this.afs.set(k, fn);
        for (const row of this.pki.values()) {
            aux.set(row, fn(row));
        }
        return this;
    }

    /**
     * индексировать указанное поле (создаст или пересоберёт вторичный индекс; opts = null удалит индекс)
     * @param {string} fk
     * @param {object|null} opts //#FORSREDA DO NOT USE
     */
    fk_mod(fk, opts = {}) {
        //#FORSREDA обрезано, приедет при интеграции:
        // opts.via: имя поля данных или функция, вычисляющее значение для индекса
        // opts.cmp: функция для сортировки
        // все особые типы индексов и их логика сейчас отрезаны для ускорения интеграции, в базовой реализации существует всякое:
        // - индексация для фильтрации (по умолчанию, автоматическая); записи в индексе хранятся в "неизвестном" порядке (так же как в Set -- в порядке вставки)
        // - индексация для фильтрации (в т.ч. диапазонами) и сортировки; записи в индексе хранятся в порядке, определённым opts.cmp
        // - простой, но волшебный полнотекстовый индекс, можно наблюдать некоторые куски в MetaSearch
        // есть ещё мультииндексы (по нескольким полям) и многомерные/пространственные, но сюда это точно не надо тащить

        if (null == opts) {
            this.fki.delete(fk);
            return this;
        }

        const idx = new Map();
        for (const row of this.pki.values()) {
            // здесь частный случай #fks_mod для добавления значения в один из индексов
            const val_new = row[fk];
            const idx_new = idx.get(val_new);
            if (idx_new) {
                // значение известно -- добавляем в список записей с этим значением
                idx_new.add(row);
            }
            else {
                // значение неизвестно -- создаём новый список про это значение с единственной записью
                idx.set(val_new, new Set([row]));
            }
        }
        // ...и просто устанавливаем новый индекс
        this.fki.set(fk, idx);

        return this;
    }

    /**
     * зачистить все данные
     */
    clear() {
        this.pki.clear();
        for (const [fk, idx] of this.fki.entries()) idx.clear();
        return this;
    }

    /**
     * в первичном индексе idx добавить/обновить/удалить соответствие row[pk] => row
     * @param {string|any} pkv_old
     * @param {null|object} row_new
     */
    #pki_upd(pkv_old, row_new) {
        throw new Error("ITABLE FATAL: .#pki_upd is considered not needed and therefore is deprecated");
        if (!row_new) {
            // нового нет, удаляем старый (проверять !!pkv_old не нужно, в индексе не может содержаться null)
            this.pki.delete(pkv_old);
            return;
        }
        const row_old = pkv_old && this.pki.get(pkv_old);
        if (row_old === row_new) return; // нечего делать
        const pkv_new = row_new[this._pk];
        if (null == pkv_new) throw new Error("ITABLE FATAL: primary key field cannot be null/undefined");
        this.pki.set(pkv_new, row_new); // добавляем или обновляем ссылку на новую запись
    }

    /**
     * обновить aux
     * @param {null|object} row_old
     * @param {null|object} row_new
     */
    #aux_mod(row_old, row_new) {
        for (const [k, fn] of this.afs.entries()) {
            const aux = this.ars.get(k);
            // row_old && aux.delete(row_old);
            if (row_new) {
                aux.set(row_new, fn(row_new));
            }
            if (row_old && (row_old !== row_new)) {
                aux.delete(row_old);
            }
        }
    }

    /**
     * добавить/изменить/удалить связи с записью во вторичных индексах
     * @param {null|object} row_old
     * @param {null|object} row_new
     */
    #fks_mod(row_old, row_new) {
        for (const [fk, idx] of this.fki.entries()) {
            const val_old = row_old?.[fk];
            const val_new = row_new?.[fk];
            const idx_old = row_old && idx.get(val_old);
            if (idx_old) {
                // есть старый список записей по старому значению
                // if (idx_old === idx_new) return; // значение не изменилось -- нечего делать //FYI НЕЛЬЗЯ ТАК, теряем ссылку! проверяем-то не запись, а значение в записи
                idx_old.delete(row_old); // удаляем ссылку на старую запись
                if (!idx_old.size) idx.delete(val_old); // если записей больше не осталось, подчищаем хвосты в индексе
            }
            if (row_new) {
                const idx_new = idx.get(val_new);
                // есть новая запись
                if (idx_new) {
                    // значение известно -- добавляем в список записей с этим значением
                    idx_new.add(row_new);
                }
                else {
                    // значение неизвестно -- создаём новый список про это значение с единственной записью
                    idx.set(val_new, new Set([row_new]));
                }
            }
        }
    }

    /**
     * модифицировать запись (вставить, обновить, удалить)
     * таблица операций:
     *          call                старая отсутствует      старая существует       sql
     * add      mod(null, row_new)  добавить, return null   throw                   insert
     * set      mod(pkv,  row_new)  добавить, return null   заменить, return old    insert on dup key update //NOTE для set pkv не может отличаться от row_new[pk], будет исключение
     * del      mod(pkv,  null)     return null             удалить, return old     delete
     * (throw)  mod(null, null)
     * (throw)  mod(null, { [pk]: null })
     *
     * @param {string} pkv
     * @param {object} row_new
     */
    mod(pkv, row_new) {
        const { pki, _pk } = this;
        const do_ups = (null != row_new); // вставляем или обновляем
        const do_add = (null == pkv) && do_ups; // вставляем
        const do_del = (null != pkv) && (null == row_new); // удаляем

        if (do_ups) {
            if ("object" != typeof row_new) throw new Error("ITABLE FATAL: (add/set) row must be a non-null object");
            if (null == pkv) pkv = row_new[_pk]; // в этой ветке row_new не может быть null (определение do_ups)
            else if (pkv !== row_new[_pk]) throw new Error("ITABLE FATAL: (add/set) both pkv and row_new are present, but pkv doesnt match row_new[pk]!"); // предотвращаем неоднозначное поведение (обновление строки при разном значении первичного ключа)
        }

        const row_old = pki.get(pkv);
        if (row_old) {
            if (do_del) {
                // нашли старое, удаляем
                pki.delete(pkv); // удалили старое
                this.#aux_mod(row_old, null);
                this.#fks_mod(row_old, null); // сокращаем вторичные индексы
                return row_old; // "вот удалённая запись"
            }
            if (do_add) {
                // есть старое и мы в режиме вставки
                throw new Error("ITABLE FATAL: (add) duplicate primary key");
            }
            // сюда попали только если set (иначе быть не может, потому что это был бы вызов mod(null, null), а в этом случае row_old не мог бы быть найден)
            if (row_old !== row_new) {
                // есть, что делать, только если это не одна и та же ссылка
                pki.set(pkv, row_new); // добавляем-обновляем ссылку на новую запись
                this.#aux_mod(row_old, row_new);
                this.#fks_mod(row_old, row_new); // обновляем вторичные индексы
            }
            return row_old; // "вот старая запись"
        }
        // нет старого
        if (do_del) {
            // хотели удалить, но раз старой записи нет, то и не делали ничего
            return null; // "нет удалённой записи"
        }
        // сюда попали только если add/set и нет старого; в этом случае операции не отличаются
        if (null == pkv) {
            // pkv должен быть в наличии для любой операции; либо это вызов mod(null, null)
            // эта проверка почти в конце, потому что это редкий случай, а row_old по ключу null не будет найден
            // т.к. мы, собственно, не сохраняем такие записи благодаря этой проверке
            throw new Error("ITABLE FATAL: (mod) primary key value cannot be null/undefined");
        }
        pki.set(pkv, row_new); // добавляем ссылку на новую запись
        this.#aux_mod(null, row_new);
        this.#fks_mod(null, row_new); // добавляем вторичные индексы
        return null; // "не было старого, вставили успешно"
    }

    /**
     * shorthand to mod(null, row_new)
     * @param {object} row_new
     */
    add(row_new) {
        return this.mod(null, row_new);
    }

    /**
     * shorthand to mod(pkv, row_new)
     * @param {object} row_new
     */
    set(row_new) {
        // т.к. здесь у нас "внешнее" апи и несмотря на наличие проверки pkv в mod,
        // её на всякий случай надо сделать и здесь тоже, чтобы mod не перепутал операцию с add в случае косяка с программированием
        const pkv = row_new?.[this._pk];
        if (null == pkv) throw new Error("ITABLE FATAL: (mod) primary key value cannot be null/undefined");
        return this.mod(pkv, row_new);
    }

    /**
     * shorthand to mod(pkv, null)
     * @param {string} pkv
     */
    del(pkv) {
        return this.mod(pkv, null);
    }

    /**
     * общая условная прогулка по записям, используем индексы, когда можем
     * //#FORSREDA
     *
     * @param {any} value
     * @param {"eq"} op
     * @param {string} field
     * @returns {[boolean, iterable]}
     */
    #scan(value, op, field) {
        if ("eq" != op) throw new Error(`ITABLE FATAL: (#scan) unsupported op = ${JSON.stringify(op)}`);
        let iterable;
        if (this._pk == field) {
            return [true, [this.pki.get(value)]];
        }
        const idx = this.fki.get(field);
        if (idx) {
            // indexed field
            // console.log(`> ITABLE.#scan(value = ${JSON.stringify(value)}, field = ${JSON.stringify(field)}): indexed field`);
            return [false, idx.get(value) ?? new Set()];
        }
        // generic field
        // console.warn(`> ITABLE.#scan(value = ${JSON.stringify(value)}, field = ${JSON.stringify(field)}): no index, running full scan`);
        const pki = this.pki;
        return [true, {
            [Symbol.iterator]: function* () {
                for (const [pkv, row] of pki) {
                    if (value === row[field]) yield row;
                }
            }
        }];
    }

    get(pkv) {
        return this.pki.get(pkv);
    }

    scan(value, field) {
        const [safe, iterable] = this.#scan(value, "eq", field);
        if (safe) return iterable;
        //#FORSREDA если нам вернули Set от нутрянки вторичных индексов, то выдаём вместо него итератор, чтобы внутреннюю структуру снаружи никто не мог поломать
        //#FORSREDA возможно, это стоит сделать отключаемым поведением
        return { [Symbol.iterator]: function* () { yield* iterable } };
    }

    aux_compareFn(k, compareFn) {
        //#FORSREDA
        const aux = this.ars.get(k);
        if (!aux) throw new Error(`ITABLE FATAL: (sort_aux) unknown aux field = ${JSON.stringify(k)}`);
        return (row_a, row_b) => compareFn(aux.get(row_a), aux.get(row_b));
    }

    /*
        //#FORSREDA не думаю, что это стоит делать
        static record2row_sequelize(record, attributes) {
            if (!attributes) return structuredClone(record);
            if (!Array.isArray(attributes)) throw new Error("Non-array sequelize attributes are not supported"); // includes: ..., excludes ... and stuff; там вообще полудокументированное странное безумие
            const row = {};
            for (const attr of attributes) {
                if (Array.isArray(attr)) {
                    const [field, as] = attr;
                    row[as] = structuredClone(record[field]);
                }
                else {
                    row[attr] = structuredClone(record[attr]);
                }
            }
            return row;
        }
    */

    _dump() {
        //DEBUG DO NOT EVER USE ON PRODUCTION OR COMMIT CODE WITH CALLS TO THIS FUNCTION!
        Object.assign(require("util").inspect.defaultOptions, {
            depth: Infinity, // null is fine too .)
        });

        // console.table(this.pki.values());
        let info = {
            _pk: this._pk,
            pki: {},
            fki: [],
        };
        //for (let i = 0, il = this.raw.length; i < il; ++i) {
        for (const [pkv, row] of this.pki) {
            const rec = structuredClone(row);
            // const rec = { pk: row[this._pk] };
            for (const [k, aux] of this.ars.entries()) {
                rec[`#${k}`] = aux.get(row);
            }
            info.pki[pkv] = rec;
        }
        for (const [fk, idx] of this.fki.entries()) {
            info.fki.push(fk);
            const t_idx = info[`fki_${fk}`] = {};
            for (const [fkv, rows] of idx.entries()) {
                t_idx[fkv] = rows;
            }
        }
        console.table(info.pki);
        // console.log(info);
    }
};

/**
 * интерфейс между itable и персистентным хранилищем
 */
class ITABLE_CACHE {
    SIG_REREAD = Symbol("ITABLE_CACHE.SIG_REREAD"); //#FORSREDA было отдельной ненаследуемой деталью

    /**
     * @param {ITABLE} itable
     * @param {{ pull_diffs?: (function(any) : Promise), reliable_signaling?: boolean }} opts
     */
    constructor(itable, opts = {}) {
        this.ee = new EventEmitter(); //#FORSREDA в основном обрезано, стоит возвращать, когда будет понятно, что с шиной обсигналов об обновлениях

        this.itable = itable;
        this.known_point = null;
        this.dirty_queue = [this.SIG_REREAD]; // dirty signal queue, always not empty on construction to mark cold cache state

        this.reliable_signaling = opts.reliable_signaling ?? true; //#FORSREDA гарантировано ли нам, что ЛИБО извне нашего экземпляра базу никто не меняет, ЛИБО наш экземпляр об этом уведомляется (каким бы то ни было образом)

        if (opts.pull_diffs) this.pull_diffs = opts.pull_diffs;
    }

    /**
     * вызвать эту функцию после обновления данных
     * метка может быть абсолютно какой угодно; специальным значением является SIG_REREAD -- это полный сброс кеша для перечитывания источника данных
     * @param {any} mark
     */
    emit_dirty(mark) {
        this.dirty_queue.push(mark);
        this.ee.emit("dirty", mark);
    }

    /**
     * низкоуровневая функция получения обновлений, начиная с указанного момента
     * (времени или порядкового номера или чего бы то ни было: возрастающего или хотя бы неубывающего, в последнем случае придётся получать лишние записи)
     * обязательна к переопределению
     * @param {any} known_point
     * @returns {Promise<{ final_point: any, rows: Iterable }>}
     */
    async pull_diffs(known_point) {
        throw new Error("ITABLE_CACHE FATAL: pull_diffs should be overloaded either via constructor opts or inheritance");

        //#FORSREDA +- экземпляр для понимания происходящего здесь
        // см. камент в описании функции
        // здесь фильтр по >=, а не >, чтобы не потерять обновления, доехавшие в тот же момент времени
        // (потому что опираемся на updatedAt)
        // из-за этого индекс всегда будет немного передёргиваться как минимум одной записью
        // чтобы этого финально избежать, нужно неповторяющееся и возрастающее при любом обновлении поле,
        // какой-нибудь id транзакции, напр. системное поле xmin или отдельное поле, в которое пишется pg_current_xact_id
        // можно ввести защитный интервал... ощутимого размера, чтобы по его прошествию запрашивать не с '>=', а с '>', но это всё фантазии

        const sql = `
            SELECT ...
            FROM ...
            WHERE ${known_point ? `"updatedAt" >= ${/* sql_escape( */known_point/*)*/}` : `TRUE`}
            ORDER BY "updatedAt"
        `;

        const rows = [/* ...await sql_query(sql) */];
        const final_point = rows[rows.length - 1]?.updatedAt ?? null; // OK to be undefined for empty resultset
        console.log({ sql, nrows: rows.length });

        return { final_point, rows };
    }

    #ready = Promise.resolve();

    /**
     * вызвать эту функцию для актуализации локального кеша (перед любым синхронным чтением кеша)
     */
    async fast_forward() {
        const log_marker = `> ITABLE_CACHE.fast_forward:`;

        //TODO revisit race condition avoidance logic (promise chain may be compactified, forced_fetch may be used to throw, utilize reliable_signaling)

        return this.#ready = this.#ready
            .then(async () => {
                //#FORSREDA возможно было бы полезно схлопнуть подряд идущие дубликаты маркеров в dirty_queue,
                //#FORSREDA но здесь это случай суперредкий (и надо подумать над тем, надо ли поддержать "что угодно" в очереди), отрезано и пока ладно

                let forced_fetch = (!this.dirty_queue.length && !this.reliable_signaling);

                while (this.dirty_queue.length || forced_fetch) {
                    // console.log(`${log_marker} forced_fetch`, forced_fetch, "dirty_queue", this.dirty_queue);
                    forced_fetch = false;
                    const mark = this.dirty_queue.shift();
                    // ^^^ к моменту завершения работы по обновлению мог появиться новый сигнал, так что работаем, пока очередь не опустела
                    // ^^^ а если она изначально пуста, то и делать нечего
                    const needFullRebuild = (mark === this.SIG_REREAD) || (null == this.known_point);
                    if (needFullRebuild) {
                        console.log(`${log_marker} requires full rebuild`);
                        this.known_point = null;
                        this.itable.clear();
                    }
                    let pulled;
                    try {
                        pulled = await this.pull_diffs(this.known_point);
                    } catch (error) {
                        console.error(`${log_marker} pull_diffs failed, re-queuing dirty signal:`, error?.message);
                        // Возвращаем сигнал в начало очереди для следующего fast_forward
                        this.dirty_queue.unshift(needFullRebuild ? this.SIG_REREAD : (mark ?? this.SIG_REREAD));
                        throw error;
                    }
                    const { final_point, rows } = pulled;
                    for (const row of rows) this.itable.set(row);
                    if (null != final_point) this.known_point = final_point;
                }
            })
            .catch((error) => {
                console.error(`${log_marker} FATAL: upstream fetch problem!`, error?.message);
                // dirty_queue не тронут — следующий fast_forward повторит попытку
            });
    }
};

module.exports = {
    ITABLE,
    ITABLE_CACHE,
};
