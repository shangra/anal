const Extensions = require('../../../core/class/Extensions.class');
const ApiError = require('../../../core/exceptions/ApiError');

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();
const MetadataModel = Metadata.MetadataModel; // грязный хак

const { Parser } = require('node-sql-parser');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');

//const FieldsServiceClass = require('../services/Fields.service');
//const FieldsService = new FieldsServiceClass();

const DDLCFG_RELAX_CONNECTOR_DIALECTS = sreda.env?.DDLCFG_RELAX_CONNECTOR_DIALECTS ?? true; // не материться на незнакомые диалекты коннектора
const DDLCFG_RELAX_CONNECTOR_DIFFERENCE = sreda.env?.DDLCFG_RELAX_CONNECTOR_DIFFERENCE ?? true; // не материться при разных коннекторах у объекта и подключаемого справочника
const DDLCFG_TRACK_LAYER_FIELDS = sreda.env?.DDLCFG_TRACK_LAYER_FIELDS ?? true; // отслеживать список столбцов каждого формируемого слоя
const DDLCFG_TRACK_LAYER_COUNTS = sreda.env?.DDLCFG_TRACK_LAYER_COUNTS ?? false; // отслеживать количество записей каждого слоя при формировании запроса
const DDLCFG_OUTPUT_COUNT_CHECK = sreda.env?.DDLCFG_OUTPUT_COUNT_CHECK ?? true; // включить в выдачу запрос отслеживания уникальности после материализации

const DDLCFG_JK_NORM_TYPE = sreda.env?.DDLCFG_JK_NORM_TYPE ?? 'TEXT'; // при несовместимости типов при сравнении или джоине кастовать оба операнда в этот тип
const DDLCFG_JK_TEST_NORM = sreda.env?.DDLCFG_JK_TEST_NORM ?? true; // проводить тест совместимости типов с нормализацией (должен быть всегда успешен)
const DDLCFG_JK_TEST_HARD = sreda.env?.DDLCFG_JK_TEST_HARD ?? true; // проводить тест совместимости типов без приведения
const DDLCFG_JK_TEST_SOFT = sreda.env?.DDLCFG_JK_TEST_SOFT ?? true; // проводить тест совместимости типов на основе данных о типе из базы
const DDLCFG_JK_FORCECAST =
    sreda.env?.DDLCFG_JK_FORCECAST ?? /* legacy env*/ sreda.env?.DDLCFG_FLUSH_IDPID_TYPE ?? true; // не использовать обходные манёвры при возможной несовместимости типов и жёстко нормализовывать

// WARN in case of any gbpltw related to "sequelize-filter"-processing: switch this config to "legacy"
const DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS = sreda.env?.DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS ?? 'new'; // использовать rebuild_sequelize_xxx при необходимости для "фильтра" (см. REBUILD_SEQUELIZE)
const DDLCFG_TRACK_SEQUELIZE_TRANSFORM = sreda.env?.DDLCFG_TRACK_SEQUELIZE_TRANSFORM ?? false; // выводить в отладочных каментах проведённые преобразования для sequelize

const DDLCFG_COMPLAIN_EMPTY_FN = sreda.env?.DDLCFG_COMPLAIN_EMPTY_FN ?? false; // материться о том, что виртуальное/вычисляемое поле не содержит тела своей функции

//const { identifier: sql.identifier } = require("@sequelize/core");
//const { Utils } = require("sequelize");

// обёртка hasOwnProperty для переменных, которые могут быть не объектами или объектами с неожиданным прототипом
const _hop = (obj, key) => obj != null && Object.prototype.hasOwnProperty.call(obj, key);

// на скорую руку; можно лучше, конечно же
function _dedent(str) {
    str = String(str).replaceAll(/\r\n|\n|\r/gm, '\n'); // normalize line endings
    const pad = str.match(/\n*([\t ]*)/)[1]; // the very first indentation
    //str = str.replace(/^[\s\t]*(\r\n|\n|\r)/gm, ""); // remove blank lines
    str = str.replaceAll(/^[\s\t]*\n/gm, ''); // remove blank lines
    str = str.trimEnd(); // remove trailing blanks
    str = str.trimStart().replaceAll('\n' + pad, '\n'); // remove first indend across all lines
    return str;
}

// на скорую руку; можно лучше, конечно же
function _indent(pad = '', str) {
    str = String(str).replaceAll(/\r\n|\n|\r/gm, '\n'); // normalize line endings
    str = str.replace(/^[\s\t]*\n/gm, ''); // remove blank lines
    str = str.trimEnd(); // remove trailing blanks
    str = pad + str.replaceAll('\n', '\n' + pad); // prepend pad to all lines
    return str;
}

// строка не меньше, чем указанной ширины с добиванием пробелами справа
function _padr(len, str) {
    return String(str).padEnd(len);
}

// убрать лишние пробелы
// TODO не учитывать текст внутри кавычек и экранированные кавычки!!!
function _sql_remove_whitespace(sql_src) {
    let sql_res = String(sql_src).trim().replaceAll(/\s+/gm, ' ');
    return sql_res;
}

function _inspect(any) {
    // JSON.stringify(model_settings_filter, null, 4)
    return require('util').inspect(any, false, null, false); // util.inspect(object[, showHidden[, depth[, colors]]])
}

// просто вырезатор инлайн-каментов в `${...}`
function _void(...dummy) {
    return '';
}

const Sequelize = require('sequelize');
const {
    Op: SequelizeOp,
    Utils: { Literal: SequelizeLiteral, SequelizeMethod },
} = Sequelize;

const REBUILD_SEQUELIZE = {
    legacy: async function rebuild_sequelize_legacy(arg, connector) {
        return /* await */ connector.transformOperations(arg);
    },
    new: async function rebuild_sequelize_new(arg, connector) {
        if (null == arg) {
            // null or undefined => same
            // null should be retained (has meaning for sequelize)
            // undefined means "deleted or non-existent entry" and should be excluded from parent container
            return arg;
        }
        do {
            if ('object' != typeof arg) {
                // какой-то примитив, видимо -- нечего его трогать (null тоже object, но его уже проверили выше)
                break;
            }
            if (arg instanceof SequelizeLiteral) {
                // уже имеем внутренний объект Sequelize
                // тем временем в AbstractConnector.transformOperations() чуянье происходит по имени конструктора
                // на самом деле здесь, скорее, if (arg instanceof SequelizeMethod) break;
                break;
            }

            // массивы и объекты: т.к. функция асинхронная, лучше делать всё через Promise.all,
            // чтобы не тупить последовательно неопределённое количество циклов
            // тогда "затупливание" будет зависить только от глубины рекурсии
            // обрабатываем depth-first, как в оригинале

            if (Array.isArray(arg)) {
                // массивы копируем, сохраняя только индексы, элементы обрабатываем рекурсивно;
                // эта ветка -- просто "быстрый" частный случай, вообще можно объединить с блоком ниже про обработку объекта
                // FYI по идее, у массивов могут быть не только обычные, но и строковые, и даже символьные ключи,
                // FYI но такие извращения поддержим только при необходимости
                return Promise.all(
                    Array.prototype.map.call(arg, (v) => rebuild_sequelize_new(v, connector))
                ); // depth-first
            }

            // нужно собирать новый контейнер (может получиться массив, а не объект)
            // в случае объекта при обработке обычные ключи затрут символьные, если по итогам обработки строковый ключ превратится в символ

            let entries = await Promise.all(
                [
                    ...Object.getOwnPropertySymbols(arg).map((k) => [k, arg[k]]), // await rebuild_sequelize_new(arg[k], connector)
                    ...Object.entries(arg),
                ].map(async ([k, v]) => {
                    v = await rebuild_sequelize_new(v, connector); // depth-first
                    return [k, v];
                })
            );

            let obj_l = 0;
            const obj = {},
                push_obj = (k, v) => void (++obj_l, (obj[k] = v)); // obj_l may not match [...Object.entries(obj)].length in case of duplicate key encountered, but does not matter
            const arr = [],
                push_arr = (v) => void arr.push(v);

            for (let [k, v] of entries) {
                if ('string' != typeof k || !k.startsWith('$')) {
                    // неизвестный нам зверь (или уже символьный ключ), пусть sequelize разбирается
                    push_obj(k, v);
                    continue;
                }

                const op = k.slice(1);
                const symbol = SequelizeOp[op];
                if (symbol != null) {
                    // оператор sequelize
                    push_obj(symbol, v);
                    continue;
                }

                const [, m_op, m_arg] = op.match(/^([^(]*)(?:\((.*)\))?$/) || []; // m_op(m_arg)

                let sql = op; // если не определим "оператор", то всё, что после "$" просто вставляем, как SQL (логика оригинала transormOperations)
                if ('sql' == m_op && null != m_arg) {
                    // k == $sql(...)
                    sql = m_arg;
                }

                // sequelize добавляет ";" к сгенерированному запросу
                // напр. v6/src/dialects/abstract/query-generator.js:1553
                // однако он сам иногда от этого страдает и решает проблему с помощью .replace(/;$/, '')})
                // напр. v6/src/dialects/abstract/query-generator.js:1434
                // т.е. отрезается только один символ ";", если он есть
                // тут немного более жадно + отрезаем пробелы
                sql = sql.replace(/[;\s]+$/, '');

                v = Sequelize.where(Sequelize.literal(sql), {
                    [Array.isArray(v) ? SequelizeOp.in : SequelizeOp.eq]: v,
                });
                push_arr(v);
            }

            if (!arr.length) {
                // в результате обработки нет элементов массива, так что возвращаем объект (возможно, пустой)
                return obj;
            }
            if (obj_l) {
                // есть непустой объект
                push_arr(obj);
            }
            return arr;
        } while (false);
        return structuredClone(arg);
    },
    noop: async function rebuild_sequelize_noop(arg, connector) {
        return arg;
    },
};

async function rebuild_sequelize(arg, connector, CFG = DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS) {
    let fn = REBUILD_SEQUELIZE[CFG];
    if (!fn) {
        fn = REBUILD_SEQUELIZE.noop;
        if (CFG)
            console.error(
                'DDLCFG: неизвестное значение для DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS:',
                DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS,
                '; допустимые:',
                [...Object.keys(REBUILD_SEQUELIZE)]
            );
    }
    const out = structuredClone(arg);
    if (_hop(out, 'where')) out.where = await fn(out.where, connector);
    if (_hop(out, 'having')) out.having = await fn(out.having, connector);
    return out;
}

function db_type_meta2real(db_type_meta) {
    // в кодовой базе нет центрального списка типов полей для метаданных,
    // везде разрозненные списки такого толка:
    // list: {
    //     uuid: 'UUID',
    //     text: 'TEXT',
    //     string: 'STRING',
    //     integer: 'INTEGER',
    //     float: 'FLOAT',
    //     date: 'DATE',
    //     datetime: 'DATETIME',
    //     boolean: 'BOOLEAN',
    //     ref: 'REF',
    // },
    // в основном эти типы соответствуют типам в бд, за некоторым исключением
    // неизвестные типы кастуем в TEXT
    const map = {
        uuid: 'UUID',
        text: 'TEXT',
        string: 'VARCHAR', // VARCHAR[]
        integer: 'INTEGER',
        float: 'FLOAT',
        date: 'DATE',
        datetime: 'DATETIME',
        boolean: 'BOOLEAN',
        ref: 'UUID',
    };
    return map[db_type_meta] ?? 'TEXT';
}

class DDLStop extends Error {
    constructor(message, forensics = {}) {
        const { error } = forensics;
        if (null != error) {
            if ('SequelizeDatabaseError' == error.name) {
                message += ` (${error.message})`;
            } else {
                message += ` (подробности только в системном логе; ctor is ${error.name})`;
            }
        }
        super(message);
        this.forensics = forensics;
    }

    /**
     * для включения значений в текст ошибки
     */
    static esc(any) {
        return JSON.stringify(any);
    }
}

const mklog = {
    STOP: (err) => {
        // фатальная ошибка (не можем продолжить)
        let txt = String(err);
        if (err instanceof DDLStop) {
            txt = err.message;
            // if (err.forensics) txt += ` (${JSON.stringify(err.forensics)})`;
        } else if (err instanceof Error) txt = `(Exception) ${err.message}`;
        return _indent('--#0/STOP ', txt);
    },
    ERRR: (txt) => _indent('--#1/ERRR ', txt), // серьёзная ошибка (продолжаем, если превозмогается; результат СКОРЕЕ ВСЕГО окажется некорректным)
    WARN: (txt) => _indent('--#2/WARN ', txt), // проблема корректности (работать можем, но результат ВОЗМОЖНО окажется некорректным, постараемся объяснить)
    PERF: (txt) => _indent('--#2/PERF ', txt), // проблема производительности (работать можем, но ожидаются проблемы с производительностью)
    NOTE: (txt) => _indent('--#3/NOTE ', txt), // обратить внимание (что-то странное; стоит рассмотреть причину)
    INFO: (txt) => _indent('--#4/INFO ', txt), // описания объектов ("пригодится": имена, описания и т.п.)
    VERB: (txt) => _indent('--#5/VERB ', txt), // описания действий ("пригодится": информация о происходящем, что сделали/делаем/будем делать)
    TECH: (txt) => _indent('--#6/TECH ', txt), // техническая информация (дампы объектов т.п.)
};

// добыча link и value из следующих данных:
// manifest.settings.connector (Infoservice (и другие) -> Connector)
// manifest.settings.ref (InfoserviceGuide.Keys[] -> Fields)
// manifest.settings.keyId (InfoserviceFlatGuide.Hierarchy[].Level[] -> Keys)
// manifest.settings.ref (InfoserviceGuide.Keys[].FieldsList[] -> Fields)
// manifest.settings.fieldhierarchy (InfoserviceGuide -> Fields)
// UNKNOWN структура этого значения везде одинаковая или это просто совпадение для перечисленных случаев?
function _ref_extract(ref) {
    // ref
    // ref.link -- видимо, корневой объект дерева матаданных (напр. справочники инфосервисов или справочники инфосервисов (flat))
    //      вообще неясно что это, может быть, напр. 6c48c552-ef7c-460d-87ad-ebf820f26f42,
    //      но этого id нет в базе (это pk из УК_Календарь_flat, на котором я отлаживался)
    // ref.value -- id целевого объекта метаданных
    // иногда ref == "0", я не понимаю, что это
    // так что if (....ref?.link) не работает из-за type mangling
    // иногда нужный id это не ref.value, а просто ref (проверить, что это так)

    const typeof_ref = typeof ref;
    return 'object' == typeof_ref
        ? { link: ref.link, value: ref.value } // не тащим из ref что-то, что там ещё может быть!
        : { link: null, value: 'string' == typeof_ref ? ref : null }; // если не нашли там строку, то лучше взорвёмся с ошибкой, чем будем гадать
}

async function _connector_extract(connector_ref) {
    // const connector_ref = model.manifest.settings.connector;
    const { value: connector_id } = _ref_extract(connector_ref);
    const Connector = new ConnectorClass();

    let connector_result;
    try {
        connector_result = await Connector.getConnector(connector_id);
    } catch (error) {
        throw new DDLStop(`Коннектор отсутствует или настроен некорректно`, {
            connector_ref,
            error,
        });
    }

    const { connector, connectorData: connector_data } = connector_result;

    // ф-ии для формирования sql, зависящие от коннектора:
    const esc = (val) => connector.AbstractSequelize.escape(val); // экранирование значений
    const escid = (id) => connector.AbstractSequelize.dialect.queryGenerator.quoteIdentifier(id); // экранирование идентификаторов

    // TODO / FYI
    // escid теряет двойные кавычки в именах -- надо проверить, почему так, и мб так и надо
    // обнаружено на диалекте postgres, остальные нет возможности проверить на локальном стенде
    // там вообще в sequelize странная работа с экранированием идентификаторов, точки (разделители) тоже могут чудить

    const dialect = connector_data.manifest.settings.dialect; // "postgres", "greenplum", "clickhouse", "trino" // dialect для sequelize; нам в целом не нужен

    switch (dialect) {
        case 'postgres':
            break;
        case 'greenplum':
        case 'clickhouse':
        case 'trino':
        default:
            if (!DDLCFG_RELAX_CONNECTOR_DIALECTS) {
                throw new DDLStop(`Диалект ${DDLStop.esc(dialect)} коннектора не поддерживается`, {
                    dialect,
                    connector_id,
                });
            }
    }

    // в целевом подключении:
    const database = connector_data.manifest.settings.database; // имя бд, куда смотрим
    const schema = connector_data.manifest.settings.schema; // имя схемы, куда смотрим
    const mksql_table = (table) => {
        // сформировать полный спецификатор таблицы
        return `${escid(database)}` + (schema ? `.${escid(schema)}` : '') + `.${escid(table)}`;
    };

    // злодейский selectQuery от sequelize зачем-то добавляет ";" к сгенерированному запросу
    // см. sequelize/src/dialects/abstract/query-generator.js:1553 (sequelize v6)
    const mksql_select = (table, options) => {
        const sql = connector.AbstractSequelize.dialect.queryGenerator.selectQuery(
            table,
            options /* , model */
        );
        return sql.replace(/[;\s]*$/g, '');
    };

    const querySql = (sql) => connector.querySql(sql);

    // возвращаем только нужное, не мусорим
    return {
        connector,
        connector_id, // aka connector_data.id, connector_data.manifest.settings.id
        // dialect,

        esc,
        escid,

        database,
        schema,
        mksql_table,
        mksql_select,

        querySql,
    };
}

const mksql_cast = (sql_type, sql_value) => {
    return null == sql_type ? `(${sql_value})` : `CAST((${sql_value}) as ${sql_type})`;
};

function _tree2items_by_class(tree, ...classes) {
    let map = {};
    for (const c of classes) map[c] = null; // classes.reduce((acc, cur) => ((acc[cur] = null), acc));
    for (const item of tree) {
        const c = item.class;
        if (null != map[c]) {
            throw new ApiError(500, `В дереве разные группы веток одного типа`); // [ ['Fields'], ... ['Fields'] ], такого не может быть
        }
        map[c] = item;
    }

    //for (const [c, item] of Object.entries(map)) {
    //    if (item.children?.length) continue;
    //    if (!item) throw new ApiError(500, `В дереве нет запрошенной группы`); // должно ли это быть ошибкой в общем случае?
    //    // throw new ApiError(500, `Запрошенная группа пуста`); // должно ли это быть ошибкой в общем случае?
    //}

    return map;
}

////////////////////////////////////////////////////////////////////////////////

class MIX_LIST {
    static from(...mix_lists) {
        const combined = new this();
        for (const mix_list of mix_lists) {
            for (const entry of mix_list.entries) {
                combined._push(entry);
            }
        }
        return combined;
    }

    constructor() {
        this.entries = []; // все элементы в порядке добавления
        this.mapping = {}; // для "реальных" элементов: сопоставление key => entry, если указывался key
        this.n_real = 0; // количество "реальных"
        this.n_tldr = 0; // количество "прочих"
    }

    _push({ real, key, data }) {
        real ? this.push_real(key, data) : this.push_tldr(data);
        return this;
    }

    // добавить "настоящую" запись
    push_real(key = null, data) {
        // if (arguments.length == 1) ([key, data] = [null, key]);
        const entry = { real: true, key, data };
        this.entries.push(entry);
        if (null != key) this.mapping[key] = entry;
        this.n_real++;
        // if (data) this.push_tldr(_indent('-- ^^^### ', _inspect(data)));
        // if (_hop(result.fields_specs, alias)) {
        //     throw new DDLStop(`В списке полей обнаружены неуникальные алиасы (${escid(alias)} повторяется)`, { id, model });
        // }
        return this;
    }

    // добавить воду ("комментарии")
    push_tldr(data) {
        this.entries.push({ real: false, data });
        this.n_tldr++;
        return this;
    }

    // получить строку из "настоящей" записи
    text_real(entry) {
        return String(entry.data);
    }

    // получить строку из "водной" записи
    text_tldr(entry) {
        return String(entry.data);
    }

    // вернуть новый объект без воды
    // export_real() {
    //     const mix_list = new this.constructor();
    //     for (const entry of this.entries) {
    //         mix_list._push(entry);
    //     }
    //     return mix_list;
    // }

    commit(opts = {}) {
        const opt_dang = opts?.dang ?? true; // режим "висячей запятой" (разделитель в начале строки)
        //const opt_pre_real = opts?.pre_real ?? (opt_dang ? "  " : ""); // префикс первого настоящего элемента
        const opt_sep_real = opts?.sep_real ?? (opt_dang ? ', ' : ','); // разделитель настоящих элементов
        const opt_sep_both = opts?.sep_both ?? '\n'; // разделитель любых элементов

        // const entry_data_to_string = (entry) => String(entry.data);
        const opt_text_real = opts?.text_real ?? this.text_real;
        const opt_text_tldr = opts?.text_tldr ?? this.text_tldr;

        const entries = this.entries;
        const il = entries.length;
        if (!il) return '';

        const out = [];
        let a_real = 0; // левая граница
        let b_real = this.n_real - 1; // правая граница
        // let a_tldr = 0;
        // let b_tldr = this.n_tldr - 1;
        for (const entry of entries) {
            // const { real, content } = entries[i];
            if (entry.real) {
                const content = opt_text_real.call(this, entry);
                if (opt_dang) {
                    //out.push(a_real ? opt_sep_real : opt_pre_real); // первый элемент -- префикс, остальные -- разделитель
                    if (a_real) out.push(opt_sep_real); // не первый элемент -- вставить разделитель
                    out.push(content);
                } else {
                    out.push(content);
                    if (a_real < b_real) out.push(opt_sep_real); // не последний элемент -- вставить разделитель
                }
                a_real++;
            } else {
                const content = opt_text_tldr.call(this, entry);
                out.push(content);
                // a_tldr++;
            }
            out.push(opt_sep_both);
        }
        out.pop(); // remove trailing sep_both
        return out.join('');
    }
}

function mksql_select_field(entry) {
    const {
        sql_alias, // escaped alias
        sql_value, // expression
        sql_value_comment, // trailing comment
        sql_type, // field type in db server terms
        nullable, // void/null/bool
        // sql_default,     // default value
    } = entry;

    if (null == sql_value) throw new Error('Missing entry.sql_value');

    const width_type = 8; // longest is "datetime" for the moment
    const width_value = 24; // for names should be fine, calculated fields generally far more longer, so will screw output anyway
    const width_alias = 30;

    //let sql = `${String(sql_value).padEnd(40, " ")}`;
    //sql = `/* ::${sql_type} */`.padEnd(30, " ") + " " + sql; //DEBUG

    let sql = '';
    // sql += "/*." + _padr(width_type, (sql_type ?? "{?type?}").replace(/(?<=\/)\*|\*(?=\/)/g, '#')) + "*/ "; //DEBUG
    sql += _padr(width_value, sql_value);

    if (null != sql_alias) sql += _padr(width_alias, ` as ${sql_alias}`);
    let comment_body = Array.isArray(sql_value_comment)
        ? sql_value_comment.join(' ')
        : String(sql_value_comment ?? '');
    if (comment_body?.length) {
        if (null == sql_alias) sql += _padr(width_alias, '');
        sql += ` /* ${comment_body} */`;
    }

    return sql;
}

// mksql_colspec
const mksql_create_field = (entry) => {
    const {
        sql_alias, // escaped alias
        sql_value, // expression
        sql_value_comment, // trailing comment
        sql_type, // field type in db server terms
        nullable, // void/null/bool
        // sql_default,     // default value
    } = entry;

    const sql = [sql_alias, sql_type];
    // for "null-ability":
    if (nullable == null) {
        // both "null" and "undefined" means "db server should use defaults"
        // "undefined" means "it does not matter, proceed silently"
        // "null" means "it is EXPLICITLY was not specified, user should be noted" -- DISABLED FOR NOW
        // if (nullable === null) sql.push(`/* NULL-ability unspecified */`);
    } else if (nullable === true) sql.push(`NULL`); // explicitly null-able
    else if (nullable === false) sql.push(`NOT NULL`); // explicitly not null-able
    else {
        console.error('mksql_create_field: entry.nullable is set to invalid value', entry);
        sql.push(`/* NULL-ability configuration is not valid */`);
    }
    // if (null != sql_default) sql.push(`DEFAULT (${sql_default})`);
    return sql.join(' ');
};

class SQL_WITH {
    constructor(escid) {
        // escid => connector.AbstractSequelize.dialect.queryGenerator.quoteIdentifier(id)
        this.escid = escid || ((id) => JSON.stringify(id)); // КОСТЫЛЬ
        this.recursive = false;
        this.alias_cur = null;
        this.result = []; // [ { name: "алиас (без экранирования!)", sql: "SELECT ..." }, "коммент", ... ]
    }

    push_log(entry) {
        if ('string' != typeof entry) entry = `/* ${JSON.stringify(entry)} */`;
        this.result.push(entry);
    }

    push_sql(entry) {
        let { alias, sql } = entry;
        if (-1 < sql.indexOf('\n')) sql = '\n' + _indent('    ', sql) + '\n';
        let chunk = `${null == this.alias_cur ? '' : ', '}${this.escid(alias)} as (${sql})`;
        this.alias_cur = alias;
        this.result.push(chunk);
    }

    commit(opts = {}) {
        const result = this.result;
        const alias = this.alias_cur;
        const sql = opts?.make_select
            ? null == alias
                ? `SELECT NULL WHERE FALSE /* should throw */`
                : `SELECT * FROM ${this.escid(alias)}`
            : '';
        if (null == alias) return `${result.join('\n')}${result.length ? '\n' : ''}${sql}`;
        return `WITH${this.recursive ? ' RECURSIVE' : ''}\n${_indent(
            '    ',
            result.join('\n')
        )}\n${sql}`;
    }

    // получить список полей из указанного cte (одного из уже сформированных)
    async extract_fields(querySql, cte_alias) {
        const sql_cte_alias = this.escid(cte_alias);
        const sql = this.commit() + `SELECT * FROM ${sql_cte_alias} LIMIT 0`;
        const [rows, result_metadata] = await querySql(sql);
        //console.log(result_metadata);
        const fields = result_metadata.fields.map((field) => field.name);
        //const fields2 = result_metadata.fields.map((field) => [field.name, { dtid: field.dataTypeID, dtsz: field.dataTypeSize, dtmd: field.dataTypeModifier }]);
        //console.log(fields2);
        //console.table(result_metadata.fields);
        return fields;
    }

    // получить pg_type для полей из указанного cte (одного из уже сформированных)
    // работает только на postgres (и должно на greenplum)
    async extract_types(querySql, cte_alias, names) {
        //const escid = this.escid;
        const sql_cte_alias = this.escid(cte_alias);
        const sql_i2oid = [];
        const field2type = {};
        for (let i = 0, il = names.length; i < il; ++i) {
            const name = names[i];
            field2type[name] = null;
            sql_i2oid.push(
                `(SELECT ${i} as i, pg_typeof(${this.escid(
                    name
                )})::oid as oid FROM ${sql_cte_alias} LIMIT 1)`
            );
        }
        const sql =
            this.commit() +
            _dedent(`
            SELECT
                i2oid.i as i, oid
                -- , pg_type.*
            FROM
                (${sql_i2oid.join(' UNION ALL ')}) as i2oid
                -- LEFT JOIN pg_type USING (oid)
        `);
        const [rows, result_metadata] = await querySql(sql);
        console.log(rows);
        for (const row of rows) {
            const name = names[row.i];
            field2type[name] = { name, ...row };
        }
        console.table(field2type);
        return field2type;
    }

    async test_match(querySql, [sql_a_from, sql_a], [sql_b_from, sql_b]) {
        const sql =
            this.commit() +
            `
            SELECT
                a, b
                , (a =  b) as "eq"
                , (a != b) as "ne1"
                , (a <> b) as "ne2"
                , ARRAY[a, b] as "ar0"
                , ARRAY_APPEND(ARRAY[a], b) as "ar1"
                , ARRAY_APPEND(ARRAY[b], a) as "ar2"
                ${_void`, (WITH RECURSIVE w as (SELECT ARRAY[a] as wa UNION ALL SELECT ARRAY_APPEND(w.wa, b) FROM w) SELECT 0 FROM w LIMIT 0)`}
            FROM
                (SELECT
                    (SELECT (${sql_a})${
                null == sql_a_from ? `` : ` FROM ${sql_a_from} as ta`
            } LIMIT 0) as a,
                    (SELECT (${sql_b})${
                null == sql_b_from ? `` : ` FROM ${sql_b_from} as tb`
            } LIMIT 0) as b
                ) as ab
        `;
        // -- (SELECT ${sql_a} as a, ${sql_b} as b FROM ${sql_cte_alias} LIMIT 0) as ab
        const [rows, result_metadata] = await querySql(sql);
        return true;
    }
}

////////////////////////////////////////////////////////////////////////////////

const CLASS_MAP = {
    'f99154eb-a049-4282-ab66-0bd576648d94': {
        class_real: 'InfoserviceFlatGuide',
        class_name_display: 'Справочник инфосервиса (flat)',
    },
    '48d6c82e-f78b-42f2-8c19-ba9aaf457740': {
        class_real: 'InfoserviceGuide',
        class_name_display: 'Справочник инфосервиса (обычный)',
    },
    'b44b4843-f919-4362-b95c-4c354b2505bd': {
        class_real: 'Infoservice',
        class_name_display: 'Инфосервис',
    },
};

////////////////////////////////////////////////////////////////////////////////

/*
    Справочник (обычный)
        иерархия: нет
            _dict (_id)
        иерархия: да
            _dict (_id, _pid)
            (запрос вложенности)
            (формирование уровней)

    Справочник (flat)
        всегда иерархия
        но сразу известны уровни
        но формируются иначе

*/

class SELECTABLE {
    static async get_model(id) {
        const model = await Metadata.getItem(id, {});
        //const { connector_id, esc, escid, mksql_table, mksql_select } = await _connector_extract(model.manifest.settings.connector);
    }

    static async get_model_subs_map(id) {
        // "Fields" "Keys" "FieldsList" "Hierarchy" и т.п.
        const models = await MetadataModel.getChild(id);
        const map = {};
        for (const model of models) {
            model.manifest = JSON.parse(model.manifest);
            const subs = map[model.class] || (map[model.class] = []);
            subs.push(model);
        }
        return map;
    }

    // получить информацию о полях
    static async get_fields(id, cte_base_alias, reqs) {
        const { esc, escid } = reqs;

        const model = await Metadata.getItem(id, {});
        const model_subs_map = await SELECTABLE.get_model_subs_map(id);

        const result = []; // [ { alias, sql, join_target } ] -- поля, формируемые из слоя данных -- в слой _calc

        if (!model_subs_map.Fields?.length) {
            // throw new DDLStop(`Не обнаружили в метаданных настроек полей`);
            return result;
        }

        for (const field_model of model_subs_map.Fields) {
            const field_id = field_model.id;
            const field_settings = field_model.manifest.settings;

            const prop = {
                id: field_id,
                name: field_model.manifest.name, // Наименование объекта
                desc: field_model.manifest.description, // Описание объекта
                db_name: field_settings.nameField, // Имя поля в СУБД
                db_type: field_settings.type, // Тип поля
                db_length: field_settings.length, // Длина
                is_virtual: field_settings.virtual, // Виртуальное поле
                is_calculated: field_settings.calculated, // Вычисляемое виртуальное поле
                fn: field_settings.fnfield, // Значение виртуального поля
                hierarchy_enabled: field_settings.hierarchy, // Поддержка иерархии
                hierarchy_subtotal: field_settings.subtotal, // Промежуточные итоги иерархии
                _foreignkey: field_settings.foreignkey, // Внешний ключ (?)
                join_target_ref: field_settings.ref, // Ссылка
                join_order_field: field_settings.refOrderField, // Поле сортировки по ссылке
                join_order_dir: field_settings.refOrderDirection, // Направление сортировки
                join_order_enabled: field_settings.isOrderOn, // Сортировка активна
                join_format: field_settings.SQLQueryFormat, // Формат соединения; известные варианты: useView (денорм), isOrderOn (вирт), useWith (субд)
                is_off: field_settings.onoff, // Отключить
            };

            const flags = {
                // warn_no_alias: ...,
                // ...
            };

            // let   field_db_name = field_settings.nameField /* || "NONE" */; // имя колонки в слое данных
            // let   field_db_type = field_settings.type; // тип колонки (в выдаче? или в физической таблице?) WARN type (db column type) IS NOT CHECKED FOR BEING VALID!
            // const field_isCalculated = field_settings.calculated; // TODO это что же... яваскрипт прямо в скуле?..
            // const field_isVirtual = field_settings.virtual;
            // const field_fn = field_settings.fnfield; // значение виртуального поля
            // const field_SQLQueryFormat = field_settings.SQLQueryFormat; // "тип подключения": тип источника данных для этой колонки

            if (null == prop.db_name || !String(prop.db_name ?? '').length) {
                //TODO лог в выдачу!
                flags.warn_no_alias = true;
                console.error(
                    mklog.ERRR(
                        `Поле ${JSON.stringify(field_model.name)} (id ${JSON.stringify(
                            field_id
                        )}) не содержит имени поля в базе, попробуем обходные манёвры`
                    ),
                    { field_model }
                );
                prop.db_name = field_model.manifest.name; // можно и кириллицу схлопотать
            }

            // if (("ref" == field_db_type) || !field_db_type) field_db_type = "VARCHAR";  // костыль
            // if (field_isVirtual) field_db_type = "VARCHAR";                             // костыль

            // const {
            //     link: join_target_class_id,
            //     value: join_target_id,
            // } = _ref_extract(prop.join_target_ref); // куда смотрит поле

            let sql_field_value = ``;

            if (prop.is_calculated) {
                flags.is_calculated = true;
                flags.warn_unsupported_calculated = true;
                if (String(prop.fn ?? '').length) {
                    sql_field_value += `(${esc(_sql_remove_whitespace(prop.fn))})`; // не поддерживаем, выведем код прямо так
                } else {
                    flags.is_empty_fn = 'calculated';
                    sql_field_value += `(NULL)`;
                }
            } else if (prop.is_virtual) {
                flags.is_virtual = true;
                if (String(prop.fn ?? '').length) {
                    sql_field_value += `(${_sql_remove_whitespace(prop.fn)})`;
                } else {
                    flags.is_empty_fn = 'virtual';
                    console.error(
                        mklog.ERRR(
                            `Поле ${JSON.stringify(prop.name)} (id ${JSON.stringify(
                                field_id
                            )}) помечено виртуальным, но нет "значения виртуального поля"`
                        ),
                        { field_model }
                    );
                    sql_field_value += `(NULL)`;
                }
            } else {
                //flags.is_passthru = true;
                //sql_field_value += `${escid(cte_base_alias)}.${escid(field_db_name)}`;
                sql_field_value += `${escid(prop.db_name)}`;
            }

            //if (prop.join_format) sql_field_debug.push(prop.join_format);
            if (prop.join_format) flags['join_' + prop.join_format] = true;

            /* ${sql_field_debug.join(" ").padEnd(24)} */
            //let sql_select_field = mksql_select_field(sql_field_value, escid(field_db_name)) + `/* ${sql_field_debug.join(", ")} */`;
            // ^^^ комментарий в скрипте измозолит все глаза, нужно, например, вынести его направо, после запятой (разделяющей поля)

            // const sql_table_spec_comment = [...(function* () {
            //     // yield `SQLQueryFormat=${settings.SQLQueryFormat || ""}`.padEnd(30, " ");
            //     if ("ref" == settings.type) yield "ref";
            //     if (!settings.type) yield "no_type";
            //     if (isVirtual) yield "virtual";
            //     if (db_name != field.name) yield `as ${esc(field.name)}`;
            // })()].join(", ");

            // sql_table_specs.push(`${escid(db_name).padEnd(32, " ")} ${String(db_type).padEnd(10, " ")}, // ${sql_table_spec_comment}`);

            // таким образом собрали итоговое поле...
            result.push({
                alias: prop.db_name,
                sql: sql_field_value,
                //debug: sql_field_debug,
                flags,

                db_type: prop.db_type,

                id: prop.id,
                hierarchy_enabled: prop.hierarchy_enabled,
                join_target_ref: prop.join_target_ref,
                join_order_field: prop.join_order_field,
                join_order_dir: prop.join_order_dir,
                join_order_enabled: prop.join_order_enabled,
                join_format: prop.join_format,
                is_off: prop.is_off,
            });
        }

        return result;
    }

    // получить все поля всех ключей от указанного объекта метаданных
    static async get_keys(id) {
        const model = await Metadata.getItem(id, {});
        const model_subs_map = await SELECTABLE.get_model_subs_map(id);

        const result = {
            all: {}, // все ключи { id => item }
            pks: [], // [ id, id, ... ] вообще, по моему, логично, ЕСЛИ БЫ "первичный ключ" настраивался в самом объекте, а не был свойством детей; но что имеем
        };

        if (!model_subs_map.Keys?.length) {
            // throw new DDLStop(`Не обнаружили в метаданных настроек ключей`);
            return result;
        }

        for (const key_model of model_subs_map.Keys) {
            const key_model_id = key_model.id;
            const key_model_isPK = key_model.manifest.settings.primarykey; // признак "первичности"
            const key_model_fieldview = key_model.manifest.settings.fieldview; // имя поля, значение которого отображается

            // добываем список полей ключа:
            const key_model_fields = [];
            const key_model_subs_map = await SELECTABLE.get_model_subs_map(key_model_id);
            for (const fieldslist_model of key_model_subs_map.FieldsList ?? []) {
                //const key_field_model = await Metadata.getItem(key_field.id);
                // console.log("LOG key_field_model", key_field_model);
                const { value: field_id } = _ref_extract(fieldslist_model.manifest.settings.ref);
                const field_model = await Metadata.getItem(field_id, {});
                // console.log("LOG field_model@key", field_model);
                //primary_key_fields_name.push(field_model.manifest.settings.nameField);
                key_model_fields.push(field_model.manifest.settings.nameField);
            }
            //result.push({ id: key_model.id, fields: fields });

            const item = {
                id: key_model_id,
                isPK: key_model_isPK,
                //fieldview: key_model_fieldview,
                fields: key_model_fields,
            };
            result.all[key_model_id] = item;
            if (key_model_isPK) result.pks.push(key_model_id);
        }

        return result;
    }

    // "поле родителя иерархии" от справочников инфосервиса добывается здесь
    // оно находится в свойствах самого объекта метаданных, а не извлекается поиском по детям
    static async get_hierarchy_regular(id) {
        const model = await Metadata.getItem(id, {});
        //const model_subs_map = await SELECTABLE.get_model_subs_map(id);

        //const keys = await SELECTABLE.get_keys(id);

        const result = {
            pid_field_name: void 0, // здесь будет имя поля родителя иерархии, если настроено
            // pid_view: ...,       // поле представления (не поддерживаем)
            pid_root_value: void 0, // значение поля родителя иерархии, при котором объект считается "корневым"
            hasHierarchy: void 0,
        };
        // у справочника инфосервиса в метаданных бывает "поле родителя иерархии"
        let { value: model_pid_field_id } = _ref_extract(model.manifest.settings.fieldhierarchy);

        // WARN поля _id и _pid должны быть одного типа
        // WARN причём при отсутствии иерархии если запихнуть NULL в _pid, то это взорвёт запрос,
        // WARN потому что тип поля для этого случая мы не указываем
        // WARN (мы тупо его не знаем по метаданным без отдельного разведывательного запроса)
        // WARN вот такое (костыльное) решение с NULLIF позволит унаследовать для _pid тип от _id (правда неявно появится NULLABLE, но не страшно)
        // let sql_dict_view_pid = `NULLIF(${escid(sql_dict_view_id)}, ${escid(sql_dict_view_id)})`;
        // ... но раз мы вообще теперь не включаем поле _pid при отвутствии иерархии, то и проблемы нет...

        if (model_pid_field_id) {
            // есть как минимум поле родителя, значит, пытаемся в иерархию
            // model_pid_field_id -- id от Field, который отвечает за поле родителя иерархии
            // по-хорошему предстоит ещё проверить валидность ссылки на поле
            const pid_model = await Metadata.getItem(model_pid_field_id, {}); // ожидаем объект Field
            const pid_model_field = String(pid_model.manifest?.settings?.nameField || '');

            if (pid_model_field.length) {
                result.pid_field_name = pid_model_field;
            }
        }

        result.pid_root_value = model.manifest.settings.fieldhierarchydefault; // undefined, null или значение -- _pid у корневых объектов иерархии
        result.hasHierarchy = model.manifest.settings.hierarchy; // наличие иерархии по показаниям метаданных (ещё подумаем, обрабатывать ли)

        return result;
    }

    static async get_hierarchy_flat(id) {
        const model = await Metadata.getItem(id, {});
        const model_subs_map = await SELECTABLE.get_model_subs_map(id);

        const keys = await SELECTABLE.get_keys(id);

        // ходим по настройкам иерархии, формируем список уровней

        const result = []; // [ { id, isPK,/* fieldview,*/ fields }, ... ]

        for (const level of model_subs_map.Hierarchy ?? []) {
            const level_model = await Metadata.getItem(level.id, {});
            // console.log("LOG level_model", level_model);

            // Объект "уровень" -- какая-то хитрая и волшебная скотина; там есть:
            // "уровень" -- числовое поле, по которому, видимо, должна происходить сортировка, потому что значения бывают неуникальными и с пропусками
            // "ключ уровня" -- ссылка на объект "Ключ", в котором есть набор полей
            // "ключ родителя" -- ЗАЧЕМ-ТО, возможно, это избыточная настройка, которая не используется
            // "предыдущий уровень"-- ЗАЧЕМ-ТО, у нас же вроде есть настройка "уровень" (выше)? или тоже избыточная настройка?
            // в подобъектах "уровня" есть "поля" (причём каждый -- это FieldsList, как у "Ключа") -- что это вообще такое, если у нас уже есть ключ, состоящий из некоторых полей?

            const level_level = Number(level_model.manifest.settings.level); // может, это не level, а rank скорее?
            const { value: level_key_id } = _ref_extract(level_model.manifest.settings.keyId); // id "ключа уровня" (ссылка на ключ)
            //const { value: level_pid_id } = _ref_extract(level_model.manifest.settings.keyParent); // id "ключа родителя" (ссылка на ключ)
            //const { value: level_pre_id } = _ref_extract(level_model.manifest.settings.prevLevel); // id "предыдущего уровня" (ссылка на уровень)

            //const key_model = await Metadata.getItem(key_id);
            const key_item = keys.all[level_key_id]; // у нас есть список ключей по их id, цинично пользуемся

            const level_fields = key_item.fields;

            // нам ещё предстоит это сортировать:
            result.push({
                id: level.id,
                level: level_level,
                fields: level_fields,
            });
        }

        // полей в уровне может и не быть, но проверять это надо снаружи, тут мы просто получаем инфу

        // ... сортируем по значению поля "уровень" ...
        // FYI а вообще, раз там ключи уровней составные, м.б. надо сортировать по количеству полей в ключе?..
        // ^^^ ответ: -- нет, не нужно, состав и количество ключей не связано с уровнем
        result.sort((a, b) => a.level - b.level);

        // в моей тестовой базе эти значения ("уровень") -- неуникальны
        // (да и вообще заполнены непонятно как, очевидные констреинты отсутствуют; напр. они могут быть с пропусками)
        // из этого следует, что для индекса уровня их точно использовать нельзя
        // поэтому индекс уровня в сформированных именах соответствующих полей -- суров, однозначен и не настраивается извне;
        // образец того, как должны выглядеть поля в селекте:
        // 'lvl_0::2023'               as "__lvl_0", -- корневой (с префиксом)
        // 'lvl_1::2023::202301'       as "__lvl_1", -- все промежуточные (с префиксом)
        // '2023::202301::202301'      as "__lvl_2", -- листовой (БЕЗ префикса)
        // '2023::202301::202301'      as "_id",    -- id совпадает с листовым (и нужно, чтобы не знать снаружи глубину справочника)

        return result;
    }

    static *walk_subs(subs, class_) {
        for (const item of subs) if (class_ == item.class) yield item;
    }
    static async get_model_fields() {
        // "Fields"
    }
    static async get_model_keys() {
        // "Keys"
    }
    static async get_model_fieldslist() {
        // "FieldsList"
    }
    static async get_model_hierarchy() {
        // "Hierarchy"
    }
}

////////////////////////////////////////////////////////////////////////////////

function mksql_materialized_dict(sql, reqs = {}, opts = {}) {
    const { sql_head, sql_with, sql_main, sql_foot } = sql;
    const { escid } = reqs;

    const name = opts.name;
    const jk_field_name = opts.jk_field_name ?? '_id';

    //const name_orig = `ddlobj_${name}_orig`; // справочник в виде селекта (то ли все поля, то ли все поля и иерархия, то ли только иерархия -- неважно: называется -- так)
    //const name_view = `ddlobj_${name}_view`; // донастройки: выбранные из оригинала поля, дополнительные поля, джоины итп
    const name_phys = `ddlobj_${name}_phys`; // таблица с [неким] материализованным результатом
    //const sqlobj_orig = escid(name_orig);
    //const sqlobj_view = escid(name_view);
    const sqlobj_phys = escid(name_phys);
    const sql_jk_field_name = escid(jk_field_name);

    const sql_select =
        (null == sql_head ? '' : `${sql_head}\n`) +
        (sql_with?.commit?.() ?? '') +
        (sql_main ?? `SELECT 0 WHERE FALSE /* dummy */`);
    // ${_void`sql_reference_comment`}
    let script = _dedent(`        
        DROP /* TEMPORARY */ TABLE IF EXISTS "pg_temp".${sqlobj_phys};
        CREATE /* OR REPLACE */ TEMPORARY TABLE ${sqlobj_phys}
        WITH (
            APPENDONLY = TRUE,
            ${_void`ORIENTATION = COLUMN, -- Светлана: "колоночное распределение для справочников не нужно"`}
            COMPRESSTYPE = 'zstd'
        )
        AS (
${_indent('            ', sql_select)}
        )
        DISTRIBUTED RANDOMLY;
        ANALYZE ${sqlobj_phys};
    `);

    if (DDLCFG_OUTPUT_COUNT_CHECK) {
        script +=
            '\n' +
            _dedent(`
            -- проверить уникальность справочника по ключу (выполнять вручную!):
            -- SELECT COUNT(${sql_jk_field_name}) as "count", COUNT(DISTINCT ${sql_jk_field_name}) as "count_distinct" FROM ${sqlobj_phys};
        `);
    }

    return {
        name_phys,
        script,
    };
}

function mksql_materialized_isvc(sql, reqs = {}, opts = {}) {
    const { sql_head, sql_with, sql_main, sql_foot } = sql;

    const { escid } = reqs;

    const name = opts.name;
    const name_orig = `ddlobj_${name}_orig`; // оригинальный инфосервис без подключенных справочников в виде селекта
    const name_view = `ddlobj_${name}_view`; // донастройки: выбранные из оригинала поля, дополнительные поля, джоины итп
    const name_phys = `ddlobj_${name}_phys`; // таблица с материализованным результатом
    const sqlobj_orig = escid(name_orig);
    const sqlobj_view = escid(name_view);
    const sqlobj_phys = escid(name_phys);

    const sql_select_dummy = `SELECT 0 WHERE FALSE /* dummy */`;

    const main_cte = sql_with?.alias_cur;
    const sql_main_cte = null == main_cte ? null : escid(sql_with?.alias_cur);
    const sql_with_committed = sql_with?.commit?.() ?? '';

    const sql_select_orig =
        (null == sql_head ? '' : `${sql_head}\n`) +
        sql_with_committed +
        (null == sql_main_cte ? sql_select_dummy : `SELECT * FROM ${sql_main_cte}`);
    const sql_select_view =
        '' +
        (null == sql_main_cte ? '' : `WITH ${sql_main_cte} as (SELECT * FROM ${sqlobj_orig})\n`) +
        (sql_main ?? `SELECT 0 WHERE FALSE /* dummy */`);
    const sql_create_fields_dummy = [];
    for (const { real, key, data } of opts.sql_fields?.entries ?? []) {
        if (!real) continue;
        sql_create_fields_dummy.push('-- , ' + mksql_create_field(data));
    }

    let script = _dedent(`
        ${_void`-- предзачистка`}
        DROP /* TEMPORARY */ VIEW IF EXISTS "pg_temp".${sqlobj_orig};
        DROP /* TEMPORARY */ VIEW IF EXISTS "pg_temp".${sqlobj_view};
        DROP /* TEMPORARY */ TABLE IF EXISTS "pg_temp".${sqlobj_phys};
    `);

    if (!opts.cleanup_only) {
        script +=
            '\n' +
            _dedent(`

            ${_void`-- создаём временный view оригинала`}
            CREATE /* OR REPLACE */ TEMPORARY VIEW ${sqlobj_orig}
            AS (
${_indent('                ', sql_select_orig)}
            );

            ${_void`-- создаём временный view с финальными полями, джоинами итп`}
            CREATE /* OR REPLACE */ TEMPORARY VIEW ${sqlobj_view}
            AS (
${_indent('                ', sql_select_view)}
            );

            ${_void`-- на основе типов полей временного view создаём материализованную таблицу`}
            CREATE /* OR REPLACE */ TEMPORARY TABLE ${sqlobj_phys}
            (
                LIKE ${sqlobj_view}
${_indent('                ', sql_create_fields_dummy.join('\n'))}
            )
            WITH (
                APPENDONLY = TRUE,
                ORIENTATION = COLUMN, ${_void`-- В отличие от справочников, про инфосервис не было информации об отключении колоночного распределения`}
                COMPRESSTYPE = 'zstd'
            )
            DISTRIBUTED RANDOMLY;

            --------------------
            --
            -- Обязательно обратить внимание, что на ПРОМЕ view инфосервиса в схеме GP с прямым доступом
            -- НЕ БУДЕТ ДОСТУПНА ТУЗу devops-трубы и материализация при установке релиза не пройдет успешно!
            --
            -- Обязательно замените обращение к view инфосервиса на явный SQL код из view, без ограничений на ТУЗы!
            --
            -- Обратите внимание, что надо заменить все возможные обращения к такой view!
            --
            --------------------

            ${_void`-- материализуем`}
            INSERT INTO ${sqlobj_phys} SELECT * FROM ${sqlobj_view};

            ANALYZE ${sqlobj_phys};
        `);

        if (DDLCFG_OUTPUT_COUNT_CHECK) {
            script +=
                '\n' +
                _dedent(`
                -- проверить количество записей инфосервиса (выполнять вручную!):
                -- SELECT COUNT(*) as "count_orig" FROM ${sqlobj_orig};
                -- SELECT COUNT(*) as "count_phys" FROM ${sqlobj_phys};
            `);
        }

        script +=
            '\n' +
            _dedent(`
            ${_void`-- зачищаем временный view`}
            DROP /* TEMPORARY */ VIEW IF EXISTS "pg_temp".${sqlobj_orig};
            DROP /* TEMPORARY */ VIEW IF EXISTS "pg_temp".${sqlobj_view};
        `);
    }

    return {
        name_phys,
        script,
    };
}

async function mksql_Selectable(id, opts = {}) {
    const opt_lvls_only = opts.lvls_only; // финальный селект только из слоя _lvls
    const opt_rethrow = opts.rethrow ?? false; // выбрасывать DDLStop из внешнего try..catch

    const result = {
        id: void 0,
        script: '',
        sql_head: '',
        sql_with: new SQL_WITH(),
        sql_main: '',
        connector_id: void 0,
        class_real: void 0,
        name: void 0,

        id_field_name: void 0, // ПЕРВИЧНЫЙ КЛЮЧ из метаданных (имя поля)
        jk_field_name: void 0, // ПОЛЕ СПРАВОЧНИКА, по которому его нужно подключать к инфосервису (или другому справочнику)
        jk_field_type: void 0,

        //calc_fields: [], //TODO remove
        lvls_fields: [], //TODO decide to remove

        full_fields: [], // about to be root MIX_LIST real entries
    };

    const script2text = (script) =>
        script
            .map((item) => {
                return Array.isArray(item) ? item.join('\n') : item;
            })
            .join('\n');

    const script = [];
    const script_reference_log = [];

    const sql_with = result.sql_with;

    script.push(`-- requested id:   ${id}`);

    try {
        const model = await Metadata.getItem(id, {});

        result.id = model.id;
        result.name = model.name;

        const model_settings = model?.manifest?.settings;

        if (!model_settings || 'object' != typeof model_settings) {
            throw new DDLStop(
                `Объект метаданных не найден или не содержит ожидаемой структуры (manifest.settings)`,
                { id, model }
            );
        }

        const { connector, connector_id, esc, escid, mksql_table, mksql_select, querySql } =
            await _connector_extract(model.manifest.settings.connector);

        result.connector_id = connector_id;

        // ? model.class
        // ? model.manifest.class
        const model_class = model.manifest.class;
        const model_class_id = model.manifest.class_id;

        const { class_real: model_class_real, class_name_display: model_class_display } =
            CLASS_MAP[model_class_id] ?? {};

        script.push(`-- class:          ${model_class_id} aka ${model_class}`);
        script.push(`-- name (desc):    ${model.name} (${model.description})`);
        //script.push(`/*\n${JSON.stringify(model, null, 4)}\n*/`); rsql.push(``);

        if (null == model_class_real) {
            throw new DDLStop(
                `Такой тип объекта не поддерживается (${DDLStop.esc(
                    model_class_id
                )} aka ${DDLStop.esc(model_class)})`,
                { id, model }
            );
        }

        result.class_real = model_class_real;

        script.push(``);

        script.push(mklog.INFO(`Обрабатываемый корневой объект: ${model_class_display}`));
        script.push(script_reference_log);

        if (model_class != model_class_real) {
            script.push(
                mklog.NOTE(
                    `Неожиданная структура классов в метаданных (exp ${JSON.stringify(
                        model_class_real
                    )} got ${JSON.stringify(model_class)} for class_id ${JSON.stringify(
                        model_class_id
                    )})`
                )
            );
        }

        script.push(``);

        //const sql_with = new SQL_WITH(escid);
        sql_with.escid = escid;

        if ('Infoservice' == model_class_real) {
            // MISP-7346 предзачистка финальных объектов перед материализациями зависимостей
            const materialized = mksql_materialized_isvc(
                {},
                { escid },
                { name: id, cleanup_only: true }
            );
            script.push(`${_indent(``, materialized.script)}\n`);
        }

        // <-- объект нашли, он поддерживаемого типа и с (похожим на рабочий) коннектором, работаем

        const model_settings_table = String(model_settings.table || '').trim(); // имя физической таблицы (или view, разумеется)
        const model_settings_sqlalias = String(model_settings.sqlalias || '').trim(); // "сложный запрос" (по факту, это "inline view")
        let model_settings_filter = String(model_settings.filter || '').trim(); // настройки "фильтра"

        // готовим "фильтр"
        if (model_settings_filter.length) {
            try {
                model_settings_filter = JSON.parse(model_settings_filter);
            } catch (error) {
                console.error(error);
                throw new DDLStop(
                    `Свойство "Фильтр" объекта метаданных не является корректным JSON (manifest.settings.filter)`,
                    { id, model, error }
                );
            }
            if ('object' != typeof model_settings_filter) {
                throw new DDLStop(
                    `Свойство "Фильтр" объекта метаданных не содержит ожидаемой структуры (manifest.settings.filter должен быть объектом)`,
                    { id, model }
                );
            }
        } else {
            // @ts-ignore
            model_settings_filter = {};
        }

        const filter_keys_ignore = ['hierarchy'];
        for (const key of filter_keys_ignore) {
            if (!_hop(model_settings_filter, key)) continue;
            // sql_with.push_log(mklog.WARN(`"Фильтр": свойство ${JSON.stringify(key)} не обрабатывается`)); // не мусорим
            delete model_settings_filter[key];
        }

        const has_phys = !!model_settings_table.length; // есть физ. таблица/view
        const has_view = !!model_settings_sqlalias.length; // есть настроенный "сложный запрос"
        const has_filt = !![...Object.keys(model_settings_filter)].length; // есть настройки "фильтра", подлежащие применению

        // последовательно формируем CTE, соблюдая логику:

        if (has_phys) {
            if (has_view) {
                // если при этом есть ещё и "сложный запрос", то скажем о его бессмысленности
                // _phys as (select ...) не формируем, потому что если таблицы не существует, то весь запрос развалится
                sql_with.push_log(
                    mklog.NOTE(
                        `_phys: не формируем из-за наличия "сложного запроса", хотя сконфигурировано обращение напрямую к таблице ${mksql_table(
                            model_settings_table
                        )}`
                    )
                );
            } else {
                // обращение к реальной таблице оборачиваем в CTE для читаемости
                sql_with.push_sql({
                    alias: '_phys',
                    sql: `SELECT * FROM ${mksql_table(model_settings_table)}`,
                });
            }
        } else {
            sql_with.push_log(
                mklog.TECH(`_phys не формируем: в метаданных нет информации о "физической таблице"`)
            );
        }

        if (has_view) {
            sql_with.push_sql({ alias: '_view', sql: model_settings_sqlalias });
            // sql_with.push_sql({ alias: "_view", sql: _sql_remove_whitespace(model_settings_sqlalias) });
        } else {
            sql_with.push_log(
                mklog.TECH(`_view не формируем: в метаданных нет информации о "сложном запросе"`)
            );
        }

        if (!has_phys && !has_view) {
            throw new DDLStop(`В настройках метаданных нет ни имени таблицы, ни сложного запроса`, {
                id,
                model,
            });
        }

        if (has_filt) {
            if (DDLCFG_TRACK_SEQUELIZE_TRANSFORM)
                sql_with.push_log(
                    '/* ' + mklog.TECH(`_filt orig:\n` + _inspect(model_settings_filter)) + ' */'
                );
            const cte_underlying_alias = sql_with.alias_cur; // на чём именно работает "фильтр" -- на сложном запросе или физической таблице

            let sql;
            try {
                const applied_filter = await rebuild_sequelize(
                    model_settings_filter,
                    connector,
                    DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS
                );
                if (DDLCFG_TRACK_SEQUELIZE_TRANSFORM)
                    sql_with.push_log(
                        '/* ' +
                            mklog.TECH(
                                `_filt @${JSON.stringify(DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS)}:\n` +
                                    _inspect(applied_filter)
                            ) +
                            ' */'
                    );
                sql = mksql_select(cte_underlying_alias, applied_filter);
            } catch (error) {
                throw new DDLStop(
                    `Не удалось обработать "Фильтр" с помощью sequelize (method: ${JSON.stringify(
                        DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS
                    )})`,
                    { id, model, error, model_settings_filter }
                );
            }
            sql_with.push_sql({ deps: [cte_underlying_alias], alias: '_filt', sql });
        } else {
            sql_with.push_log(
                mklog.TECH(`_filt не формируем: в метаданных нет информации о "фильтре"`)
            );
        }

        // в этом слое -- полный набор (физических/подлежащих) данных с учётом "фильтра", если он есть
        // но здесь ещё нет виртуальных полей
        const cte_base_alias = sql_with.alias_cur;
        sql_with.push_log(
            mklog.TECH(`${cte_base_alias} выбран источником данных для формирования полей`)
        );

        if (DDLCFG_TRACK_LAYER_FIELDS) {
            const cte_alias = cte_base_alias;
            try {
                const fields = await sql_with.extract_fields(querySql, cte_alias);
                sql_with.push_log(
                    mklog.TECH(
                        `${cte_alias} discovered fields[${fields.length}]: ${JSON.stringify(
                            fields
                        )}`
                    )
                );
            } catch (error) {
                throw new DDLStop(
                    `Не удалось выполнить проверочный запрос полей на слое ${cte_alias}`,
                    { id, model, error }
                );
            }
        }
        if (DDLCFG_TRACK_LAYER_COUNTS) {
            const cte_alias = cte_base_alias;
            const sql = sql_with.commit() + `SELECT COUNT(*) as "count" FROM ${escid(cte_alias)}`;
            try {
                const [rows, result_metadata] = await querySql(sql);
                //console.log(rows, result_metadata);
                const count = rows?.[0]?.count ?? '(unknown)';
                sql_with.push_log(mklog.INFO(`${cte_alias} count(*) = ${count}`));
            } catch (error) {
                throw new DDLStop(
                    `Не удалось выполнить проверочный запрос количества элементов на слое ${cte_alias}`,
                    { id, model, error }
                );
            }
        }

        const sql_full_select_fields = new MIX_LIST();
        const sql_lvls_joins = [];
        const sql_full_joins = [];
        const fact_references = {};

        // ФОРМИРУЕМ ПОЛЯ (основной слой)
        // здесь же запланируем подключение справочников
        {
            const fields = await SELECTABLE.get_fields(id, cte_base_alias, { esc, escid });

            // sql_with.push_log(`/* ${JSON.stringify(fields, null, "    ")} */`);

            /*
                        //TODO remove
                        const mksql_select_field = (sql_value, sql_alias) => {
                            let sql = `${String(sql_value).padEnd(40, " ")}`;
                            if (null != sql_alias) sql += ` as ${sql_alias}`; // String(sql_alias).padEnd(48, " ")
                            return sql;
                        };
            */

            const sql_select_fields = new MIX_LIST();
            for (const field_item of fields) {
                const { alias, sql, flags } = field_item;
                //const sql_comment = (((1 == debug?.length) && ("asis" == debug?.[0])) || !debug?.length)
                //    ? "" // не мусорим на обычных полях
                //    // : ` /* ${JSON.stringify(debug)} */`
                //    : ` /* ${debug.join(" ")} */`
                //;
                const flags_arr = [...Object.keys(flags)];
                const sql_comment = flags_arr.length ? ` /* ${flags_arr.join(' ')} */` : '';

                sql_select_fields.push_real(alias, {
                    sql_alias: escid(alias),
                    sql_value: sql,
                    sql_value_comment: flags_arr.length ? flags_arr.join(' ') : '',
                    sql_type: db_type_meta2real(field_item.db_type),
                    nullable: null,
                });
                // sql_select_fields.push_tldr(mklog.TECH(_inspect(field_item)));

                if (DDLCFG_COMPLAIN_EMPTY_FN && flags.is_empty_fn) {
                    sql_select_fields.push_tldr(
                        mklog.WARN(
                            `^^^ для виртуального или вычисляемого поля не указано значение!`
                        )
                    );
                }

                if (!opt_lvls_only) {
                    //sql_full_select_fields.push_real(alias, `_calc.` + escid(alias));
                    sql_full_select_fields.push_real(alias, {
                        sql_alias: escid(alias),
                        sql_value: `_calc.` + escid(alias),
                        // sql_value_comment: null,
                        sql_type: db_type_meta2real(field_item.db_type),
                        nullable: null,
                    });
                }

                const {
                    // link: join_target_class_id, // не используем / не контроллируется
                    value: join_target_id,
                } = _ref_extract(field_item.join_target_ref); // куда смотрит поле

                // не нашёл, где бы взять именованные константы на эту тему...
                switch (field_item.join_format) {
                    case 'useView': {
                        // "денормализованное соединение" -- подключение справочника (обычного или FLAT)

                        if (null == join_target_id) {
                            sql_select_fields.push_tldr(
                                mklog.WARN(
                                    `^^^ денорм. соединение, но не указана связь, нечего подключать`
                                )
                            );
                        } else if (!field_item.hierarchy_enabled) {
                            sql_select_fields.push_tldr(
                                mklog.NOTE(
                                    `^^^ денорм. соединение к ${esc(
                                        join_target_id
                                    )}, но отключена поддержка иерархии, не будет подключено`
                                )
                            );
                        } else {
                            //sql_select_fields.push_tldr(`-- ^^^ FIELD LINK @${esc(join_target_id)} (${esc(field_target_link_model.class)} / ${esc(field_target_link_model.name)}); ${escid(field_target_link_model.manifest.settings.table)} is a target; sql join to be deployed`);
                            // sql_select_fields.push_tldr(`-- ^^^ FIELD LINK @${esc(join_target_id)} is a target; join to be deployed`);
                            sql_select_fields.push_tldr(
                                mklog.INFO(
                                    `^^^ денорм. соединение к ${esc(join_target_id)}, подключаем`
                                )
                            );

                            script_reference_log.push(
                                mklog.INFO(
                                    `поле ${field_item.alias} подключит справочник ${esc(
                                        join_target_id
                                    )}`
                                )
                            );

                            try {
                                let { selectable, materialized } =
                                    fact_references[join_target_id] ?? {};
                                if (null == materialized) {
                                    selectable = await mksql_Selectable(join_target_id, {
                                        lvls_only: true,
                                        rethrow: true,
                                    });
                                    materialized = mksql_materialized_dict(
                                        {
                                            sql_head: selectable.sql_head,
                                            sql_with: selectable.sql_with,
                                            sql_main: selectable.sql_main,
                                        },
                                        { escid },
                                        {
                                            name: selectable.id,
                                            jk_field_name: selectable.jk_field_name,
                                        }
                                    );
                                    script.push(`${_indent(``, materialized.script)}\n`);
                                    fact_references[join_target_id] = { selectable, materialized };
                                }

                                if (connector_id != selectable.connector_id) {
                                    if (DDLCFG_RELAX_CONNECTOR_DIFFERENCE) {
                                        sql_select_fields.push_tldr(
                                            mklog.WARN(
                                                `^^^ справочник обслуживается другим коннектором (${selectable.connector_id}), но попробуем`
                                            )
                                        );
                                    } else {
                                        throw new DDLStop(
                                            `Связанный справочник обслуживается другим коннектором (${selectable.connector_id})!`,
                                            {
                                                id,
                                                model,
                                                linked_connector_id: selectable.connector_id,
                                            }
                                        );
                                    }
                                }

                                const dict_alias = `_dict_${field_item.alias}`;
                                const sql_dict_alias = escid(dict_alias);

                                script_reference_log.push(
                                    mklog.INFO(
                                        `поле ${field_item.alias} подключен справочник ${esc(
                                            join_target_id
                                        )}: ${selectable.class_real} / ${selectable.name}`
                                    )
                                );

                                //sql_full_select_fields.push_real(null, `${sql_dict_alias}.*`);
                                for (const lvls_field of selectable.lvls_fields) {
                                    //TODO/NOTE именно здесь образуется "лишнее" подчёркивание в имени поля, нужно привести к единому виду
                                    // (имеется ввиду к тому же виду, что используется в оригинальном именовании полей пивота)
                                    const alias = field_item.alias + '_' + lvls_field;
                                    //sql_full_select_fields.push_real(alias, `${sql_dict_alias}.${escid(lvls_field)} as ${escid(alias)}`);
                                    sql_full_select_fields.push_real(alias, {
                                        sql_alias: escid(alias),
                                        sql_value: `${sql_dict_alias}.${escid(lvls_field)}`,
                                        // sql_value_comment: null,
                                        sql_type: 'TEXT/**/', //TODO db_type_meta2real(field_item.db_type),
                                        nullable: null,
                                    });
                                }

                                const sql_join_target = escid(materialized.name_phys); // подключаемая таблица
                                const sql_join_target_alias = sql_dict_alias; // её алиас
                                const sql_join_target_field = escid(
                                    selectable.jk_field_name ?? '_id'
                                ); // поле подключаемой таблицы

                                let idpid_match_hard = null; // тупой запрос без приведения типов успешен
                                /*
                                // бессмысленно, потому что на момент генерирования скрипта справочник не материализован
                                
                                                                // preflight dumb-hard comparison test
                                                                if (DDLCFG_JK_TEST_HARD) try {
                                                                    idpid_match_hard = await sql_with.test_match(querySql, [sql_join_target, sql_join_target_field], ["_calc", escid(field_item.alias)]);
                                                                    sql_select_fields.push_tldr(mklog.TECH(`Совместимость справочник/поле (hard): да`));
                                                                }
                                                                catch (error) {
                                                                    idpid_match_hard = false;
                                                                    console.error(error);
                                                                    sql_select_fields.push_tldr(mklog.PERF(`Совместимость справочник/поле (hard): нет (ошибка)`));
                                                                }
                                */
                                const do_jk_typecast = DDLCFG_JK_FORCECAST || !idpid_match_hard;
                                const _norm = (sql_value) =>
                                    mksql_cast(
                                        do_jk_typecast ? DDLCFG_JK_NORM_TYPE : null,
                                        sql_value
                                    );

                                const sql_join_target_ref = _norm(
                                    `${sql_join_target_alias}.${sql_join_target_field}`
                                ); // поле подключаемой таблицы (полный спецификатор)
                                const sql_join_origin_ref = _norm(
                                    `_calc.${escid(field_item.alias)}`
                                ); // поле основной таблицы (полный спецификатор)

                                sql_full_joins.push(
                                    `LEFT JOIN ${sql_join_target} as ${sql_join_target_alias} ON ${sql_join_target_ref} = ${sql_join_origin_ref}`
                                );
                            } catch (e) {
                                script_reference_log.push(
                                    mklog.ERRR(
                                        `поле ${field_item.alias} СПРАВОЧНИК ${esc(
                                            join_target_id
                                        )} НЕ УДАЛОСЬ ПОДКЛЮЧИТЬ ИЗ-ЗА ОШИБКИ В ЕГО DDL!`
                                    )
                                );
                                sql_select_fields.push_tldr(
                                    `-- ^^^ JOIN FAILED (either link type or linked infoservice type is not supported)`
                                );
                                console.log('JOIN FAILED', e);
                            }
                        }
                        break;
                    }

                    case 'isOrderOn': // вирт соединение
                        // нечего поддерживать (?)
                        break;

                    case 'useWith': // соединение в субд
                        // нечего поддерживать (?)
                        break;

                    default:
                        // TODO выругаться
                        break;
                }
            }

            const sql = _dedent(`
                SELECT
${_indent(
    `                    `,
    '  ' + sql_select_fields.commit({ text_real: (entry) => mksql_select_field(entry.data) })
)}
                FROM
                    ${escid(cte_base_alias)}
            `);

            sql_with.push_sql({ alias: '_calc', sql: sql });

            // в _calc нет список полей сформирован нами же -- на основе метаданных, так что _вроде как_ нет смысла получать его отдельным запросом
            // НО
            // этой проверкой обнаруживаются всякие возможные косяки в метаданных, типа:
            //      ошибка в функции ("значении") виртуального поля (надо бы сделать это отдельным видом контроля)
            //      упоминание несуществующего поля
            //      да и просто опечатка в имени поля
            // А ТАКЖЕ
            //      стоит здесь зыгрузить типы полей: это пригодится нам для того, чтобы при необходимости подружить id и pid
            //      плюс получить знание о типе поля, по которому может происходить внешний джоин
            if (DDLCFG_TRACK_LAYER_FIELDS) {
                const cte_alias = '_calc';
                try {
                    const fields = await sql_with.extract_fields(querySql, cte_alias);
                    // в этом сообщении "alt-checkout" вместо "discovered" просто потому что на основе метаданных
                    // мы точно знаем список полей, которые должны оказаться в _calc, но мы ПРОСТО смотрим,
                    // какие поля получились в sql -- и не сверяем списки, это ТОЛЬКО для избыточности данных отладки
                    sql_with.push_log(
                        mklog.TECH(
                            `${cte_alias} alt-checkout fields[${fields.length}]: ${JSON.stringify(
                                fields
                            )}`
                        )
                    );
                } catch (error) {
                    throw new DDLStop(
                        `Не удалось выполнить проверочный запрос полей на слое ${cte_alias}`,
                        { id, model, error }
                    );
                }
            }
        }

        // <-- в этой точке у нас есть полностью сформированный оригинальный объект-таблица (инфосервис, справочник или flat-справочник)
        const cte_calc_alias = sql_with.alias_cur; // это -- слой полного набора данных
        //const cte_main_alias = sql_with.alias_cur; // это -- слой полного набора данных
        // NOTE/TODO слой _calc у нас всегда есть, его не может не быть (это список полей из метаданных) -- не нужно полагаться на alias_cur, просто использовать _calc

        // дальше нам нужны волшебные дополнительные поля: как минимум это "уровни" (на момент проектирования)
        // изначально хотелось их сделать в виде "боковых" слоёв, которые подключаются left-join'ом, НО ЕСТЬ НЮАНС:
        // в общем случае НЕВОЗМОЖНО/НЕЛЬЗЯ НАДЕЯТЬСЯ НА ТО, ЧТО МЫ РАНЕЕ ОПРЕДЕЛИЛИ, КАК "ПЕРВИЧНЫЙ КЛЮЧ"!
        // (полагаться на него можем только если наш текущий объект -- справочник инфосервиса (обычный),
        // потому что только для этого типа объектов наличие первичного ключа -- это обязательный, системный момент)
        // ...а без этого "боковые" слои с дополнительными полями, которые при необходимости бы "подключались" джоином -- гиблое дело
        // так что эти... волшебные... поля просто наращиваем слой за слоем, а потом разберёмся, что из них надо;
        // в перспективе -- пройдёмся "назад" по cte-слоям и выключим неупомянутое (это полезно для вертикальных хранилок типа кликхауса)
        // итого: у нас бывают "виртуальные" поля, бывают "вычисляемые", а это пусть будут... "псевдовиртуальные" поля
        // единственный нюанс: именуем эти поля (как и слои) с префиксом "_", обозначая их особый статус, это в теории может привести к коллизии
        // но... только в теории; заправить недолго, упоминаю на всякий случай в этой заметке

        // особая отметка: НЕ ПОДДЕРЖИВАЕМ ЗАВИСИМОСТИ ПСЕВДОПОЛЕЙ ДРУГ ОТ ДРУГА, только от слоя полного набора данных

        // ходим по ключам, выясняем, что -- первичный; это наш _id
        // для инфосервиса он нам вообще не нужен, даже если объявлен (и вообще в инфосервисе отсутствие первичного ключа -- нормальная ситуация)
        // для flat-справочников... ну, может быть и объявлен, но всё равно они подключаются по самому глубокому уровню иерархии
        // а вот для обычных справочников его наличие -- критично, потому что как минимум а) они джоинятся по нему и б) он нам нужен для выяснения глубины иерархии

        //const model_subs_map = SELECTABLE.get_model_subs_map(id);
        const model_keys = await SELECTABLE.get_keys(id);

        try {
            if (![...Object.keys(model_keys.all)].length) {
                throw new DDLStop(`Не нашли в метаданных настройки ключей`);
            }
            if (!model_keys.pks.length) {
                throw new DDLStop(`Не нашли в метаданных ничего про первичный ключ`); // поищем сами в объявлении структуры таблицы?
            }
            if (1 < model_keys.pks.length) {
                throw new DDLStop(`В метаданных "первичным" объявлено несколько ключей`); // берём первый?
            }

            const id_fields_name = model_keys.all[model_keys.pks[0]]?.fields ?? [];

            if (!id_fields_name.length) {
                throw new DDLStop(`Первичный ключ нашли, но не нашли поля, его формирующие`);
            }
            if (1 < id_fields_name.length) {
                throw new DDLStop(
                    `Первичный ключ нашли, но он составной (${DDLStop.esc(
                        id_fields_name
                    )}), не можем с этим работать`
                );
            }

            result.id_field_name = id_fields_name[0];
            sql_with.push_log(
                mklog.VERB(
                    `${cte_calc_alias}.${result.id_field_name} -- в метаданных именно так обозначен первичный ключ`
                )
            );
            //NOTE это "решение" может быть пересмотрено в зависимости от типа объекта
        } catch (error) {
            if (!(error instanceof DDLStop)) throw error; // это не наша ошибка
            // первичный ключ нам фактически (и позарез) нужен только для обычных справочников
            if ('InfoserviceGuide' == model_class_real) {
                throw error; // хотели первичный ключ, но не смогли
            }
            sql_with.push_log(mklog.INFO(`Не определили первичный ключ: ${error.message}`));
        }

        // здесь это бессмысленно, т.к. не можем полагаться на то, что объявлено "первичным ключом"
        // if (DDLCFG_TRACK_LAYER_COUNTS) {
        //     const cte_alias = cte_calc_alias;
        //     let sql = sql_with.commit();
        //     if (null == result.id_field_name) {
        //         sql += `SELECT COUNT(*) as "count" FROM ${escid(cte_alias)}`;
        //     }
        //     else {
        //         sql += `SELECT COUNT(*) as "count", COUNT(DISTINCT ${escid(result.id_field_name)}) as "count_distinct" FROM ${escid(cte_alias)}`;
        //     }
        //     try {
        //         const [rows, result_metadata] = await querySql(sql);
        //         //console.log(rows, result_metadata);
        //         const { count, count_distinct } = rows?.[0] ?? {};
        //         if (null == result.id_field_name) {
        //             sql_with.push_log(mklog.INFO(`${cte_alias} count(*) = ${count}`));
        //         }
        //         else {
        //             sql_with.push_log(mklog.INFO(`${cte_alias} count(*) = ${count}; count(distinct ${escid(id_field_name)}) = ${count_distinct}`));
        //             if (count != count_distinct) {
        //                 sql_with.push_log(mklog.ERRR(`${cte_alias} в первичном ключе обнаружены неуникальные записи!`));
        //             }
        //         }
        //     }
        //     catch (error) {
        //         throw new DDLStop(`Не удалось выполнить проверочный запрос количества элементов на слое ${cte_alias}`, { id, model, error });
        //     }
        // }

        // ... итак, дополнительные поля

        const sql_xtra_select_fields = new MIX_LIST();

        // волшебный слой дополнительных полей: иерархия (справочникам)
        if ('InfoserviceFlatGuide' == model_class_real) {
            // Справочник инфосервиса (FLAT)
            sql_with.push_log(mklog.TECH(`+_lvlsflat: hierarchy layer with mode FLAT`));
            //  есть фиксированные "уровни"
            //  надо прогуляться по настройкам иерархии
            //  и формируем уровни

            const levels = await SELECTABLE.get_hierarchy_flat(id);
            //sql_with.push_log(`/* ${JSON.stringify(levels, null, "    ")} */`);

            if (1 > levels.length) {
                throw new DDLStop(
                    `В метаданных FLAT-справочника нет информации ни об одном уровне иерархии`,
                    { id, model }
                );
            }

            for (let i = 0, il = levels.length; i < il; ++i) {
                const { id, level, fields } = levels[i];

                if (1 > fields.length) {
                    throw new DDLStop(
                        `Каждый уровень в FLAT-справочнике инфосервиса должен содержать минимум одно поле`,
                        { id, model }
                    );
                }

                const lvl_value_prefix = 'lvl_';
                const lvl_value_delim = '::';
                const isLeaf = il == i + 1; // последний/листовой уровень?
                //const alias = `${lvl_prefix}${i}`; // opts.lvl_prefix
                const alias = `_lvl_${i}`; // opts.lvl_prefix

                let sql_value = `CONCAT_WS(${esc(lvl_value_delim)}, `;
                sql_value += isLeaf ? `` : `${esc(`${lvl_value_prefix}${i}`)}, `; // для самого глубокого уровня значение формируется иначе
                sql_value += `${[...fields].map((field) => `_calc.${escid(field)}`).join(`, `)}`;
                sql_value += `)`;

                //sql_xtra_select_fields.push_real(alias, `${sql_value} as ${escid(alias)}`); // + ` /* ${JSON.stringify(debug)} */ `
                sql_xtra_select_fields.push_real(alias, {
                    sql_alias: escid(alias),
                    sql_value: sql_value,
                    // sql_value_comment: null, // JSON.stringify(debug)
                    sql_type: 'TEXT/**/', //TODO db_type_meta2real(field_item.db_type),
                    nullable: null,
                });

                if (isLeaf) {
                    // flat-справочник ВСЕГДА подключается по последнему уровню своей иерархии!
                    result.jk_field_name = alias;
                }

                result.lvls_fields.push(alias);
            }

            // id не экспортируем в материализацию
            // sql_xtra_select_fields.push_tldr(`-- (nope!) -- ${escid(id_field_name)} as _id`);
        }

        /* else if: на самом деле этот слой взаимоисключается с flat-справочником */
        if ('InfoserviceGuide' == model_class_real) {
            // Справочник инфосервиса (обычный)
            //  без иерархии
            //      формируем один уровень ... по факту забиваем на иерархию в принципе
            //      ^^^ но МОЖЕТ БЫТЬ стоит вести себя как справочник с единственным уровнем, однако это приведёт к требованию годного первичного ключа и прочих вытекающих
            //  с иерархией
            //      выясняем глубину: нужен промежуточный слой (_walk) для определения глубины и последующего доставания из него значений
            //      ^^^ обязателен валидный первичный ключ!
            //      формируем уровни
            const r = await SELECTABLE.get_hierarchy_regular(id);
            // sql_with.push_log(`/* ${JSON.stringify(r, null, "    ")} */`);

            const { pid_field_name, pid_root_value } = r;

            if (!r.hasHierarchy) {
                //has_lvls = false;
                if (null != pid_field_name) {
                    // иерархия отключена, но поле родителя указано: материмся и отказываемся строить уровни, в остальном -- продолжаем
                    sql_with.push_log(
                        mklog.WARN(
                            `В метаданных УКАЗАНО поле родителя иерархии (${escid(
                                pid_field_name
                            )}), но ИЕРАРХИЯ ОТКЛЮЧЕНА, не строим уровни`
                        )
                    );
                }
                sql_with.push_log(mklog.TECH(`_xtra_lvlsnest: hierarchy mode is NONE`));
            } else {
                // вот в этой ветке мы и не можем без правильного первичного ключа -- из-за слоя _walk,
                // который нужен дважды: первый раз для определения глубины иерархии, а второй -- достать значения для джоина на каждом из уровней
                // итого: иерархия есть, придётся делать промежуточный слой и запрос для выяснения глубины
                // + теперь он рекурсивный

                if (null == pid_field_name) {
                    // включена иерархия, но не настроено поле родителя
                    throw new DDLStop(
                        `В метаданных НЕ УКАЗАНО поле родителя иерархии, но при этом ИЕРАРХИЯ ВКЛЮЧЕНА, не можем продолжать`
                    );
                }

                // у обычного справочника всегда должен быть первичный ключ, это мы уже проверили, пока добывали из метаданных информацию о ключах
                const id_field_name = result.id_field_name;

                sql_with.push_log(mklog.TECH(`_xtra_lvlsnest: hierarchy mode is NEST (recursive)`));
                sql_with.push_log(
                    mklog.VERB(`${cte_calc_alias}.${pid_field_name} -- ключ родителя иерархии`)
                );

                //                sql_xtra_select_fields.push_real(`_id`, `_id`); // первичный ключ слоя _walk

                let idpid_match_norm = null; // тупой запрос с приведением типов успешен
                let idpid_match_hard = null; // тупой запрос без приведения типов успешен
                let idpid_match_soft = null; // совпадают по oid?

                // preflight dumb-norm comparison test (expected to always be successful)
                if (DDLCFG_JK_TEST_NORM)
                    try {
                        idpid_match_norm = await sql_with.test_match(
                            querySql,
                            ['_calc', mksql_cast(DDLCFG_JK_NORM_TYPE, escid(id_field_name))],
                            ['_calc', mksql_cast(DDLCFG_JK_NORM_TYPE, escid(id_field_name))]
                        );
                        sql_with.push_log(
                            mklog.TECH(`Совместимость id/pid (norm): да (::${DDLCFG_JK_NORM_TYPE})`)
                        );
                    } catch (error) {
                        idpid_match_norm = false;
                        console.error(error);
                        sql_with.push_log(
                            mklog.ERRR(
                                `Совместимость id/pid (norm): нет (ошибка; ::${DDLCFG_JK_NORM_TYPE})`
                            )
                        );
                    }

                // preflight dumb-hard comparison test
                if (DDLCFG_JK_TEST_HARD)
                    try {
                        idpid_match_hard = await sql_with.test_match(
                            querySql,
                            ['_calc', escid(id_field_name)],
                            ['_calc', escid(pid_field_name)]
                        );
                        sql_with.push_log(mklog.TECH(`Совместимость id/pid (hard): да`));
                    } catch (error) {
                        idpid_match_hard = false;
                        console.error(error);
                        sql_with.push_log(mklog.PERF(`Совместимость id/pid (hard): нет (ошибка)`));
                    }

                // preflight soft (oid) comparison test
                if (DDLCFG_JK_TEST_SOFT)
                    try {
                        const types = await sql_with.extract_types(querySql, '_calc', [
                            id_field_name,
                            pid_field_name,
                        ]);
                        const id_field_oid = types[id_field_name].oid;
                        const pid_field_oid = types[pid_field_name].oid;
                        idpid_match_soft = null != id_field_oid && id_field_oid == pid_field_oid;
                        sql_with.push_log(
                            mklog.TECH(
                                `Совместимость id/pid (soft): ${
                                    idpid_match_soft ? 'да' : 'нет'
                                } (${JSON.stringify(id_field_oid)} vs ${JSON.stringify(
                                    pid_field_oid
                                )})`
                            )
                        );
                    } catch (error) {
                        idpid_match_soft = false;
                        console.error(error);
                        sql_with.push_log(mklog.PERF(`Совместимость id/pid (soft): нет (ошибка)`));
                    }

                // на самом деле, если проверка idpid_match_norm провалилась,
                // то даже при DDLCFG_JK_FORCECAST == true запрос, скорее всего, не будет жизнеспособен
                const do_idpid_typecast =
                    DDLCFG_JK_FORCECAST ||
                    !idpid_match_hard ||
                    !idpid_match_soft ||
                    !idpid_match_norm;
                const _norm = (sql_value) =>
                    mksql_cast(do_idpid_typecast ? DDLCFG_JK_NORM_TYPE : null, sql_value);

                const sql_walk_calc_id = _norm(`c.${escid(id_field_name)}`);
                const sql_walk_calc_pid = _norm(`c.${escid(pid_field_name)}`);
                const sql_walk_root_cond = `(${sql_walk_calc_pid} ${
                    null == pid_root_value ? `IS NULL` : `= ${_norm(esc(pid_root_value))}`
                })`;

                const sql_walk_root_path = `ARRAY[${sql_walk_calc_id}]`;
                const sql_walk_grow_path = `ARRAY_APPEND(w._path, ${sql_walk_calc_id})`;

                const sql_walk = _dedent(`
                    -- накопитель, обходящий граф детей
                    -- ходим от элементов без родителя (корневых) до самых глубоких
                    -- каждая итерация -- это один уровень вложенности
                    -- в итоге получаем поля: _lvl (глубина, 0 -- корни) и _path (путь к текущему элементу)
                    SELECT
                        ${_padr(64, `CAST(0 as INTEGER)`)} as _lvl,
                        ${_padr(64, sql_walk_calc_id)} as _id,
                        ${_padr(64, sql_walk_calc_pid)} as _pid,
                        ${_padr(64, sql_walk_root_path)} as _path
                    FROM
                        ${escid(cte_calc_alias)} as c
                    WHERE
                        ${sql_walk_root_cond} -- корневые элементы в первой итерации
                    UNION ALL
                    SELECT
                        ${_padr(64, `w._lvl + 1`)} as _lvl,
                        ${_padr(64, sql_walk_calc_id)} as _id,
                        ${_padr(64, sql_walk_calc_pid)} as _pid,
                        ${_padr(64, sql_walk_grow_path)} as _path
                    FROM
                        _walk as w
                        INNER JOIN ${escid(cte_calc_alias)} as c
                            ON  ${sql_walk_calc_pid} = w._id
                            AND ${sql_walk_calc_id} != ANY(w._path)
                         -- AND w._lvl < 20
                `);

                const cte_walk_alias = '_walk';
                sql_with.push_sql({ alias: cte_walk_alias, sql: sql_walk });
                sql_with.recursive = true;

                let _lvl_max = 0;
                try {
                    const sql =
                        sql_with.commit() +
                        `SELECT MAX(_lvl) as _lvl_max FROM ${escid(cte_walk_alias)}`;
                    const [rows, result_metadata] = await querySql(sql);
                    _lvl_max = rows[0]._lvl_max || 0;
                    console.log('FOUND MAX LEVEL:', _lvl_max);
                    sql_with.push_log(
                        mklog.TECH(`_xtra_lvlsnest: found out levels: [0..${_lvl_max}]`)
                    );
                } catch (error) {
                    throw new DDLStop(
                        `Не удалось выполнить запрос глубины на слое ${escid(cte_walk_alias)}`,
                        { id, model, error }
                    );
                }

                // обязательно "<=", потому что _lvl_max -- включительно, а 0 (нулевой/корневой уровень) -- всегда есть
                // NOTE в скуле индексы с 1, а не с 0 ;)
                //const lvl_prefix = opts.lvl_prefix || "__lvl_";
                const lvl_prefix = '_lvl_'; // префикс имени поля
                const lvl_value_prefix = 'lvl_'; // префикс в значении
                const lvl_value_delim = '::'; // разделитель в значениях

                for (let i = 0; i <= _lvl_max; ++i) {
                    const alias = `${lvl_prefix}${i}`;
                    //sql_xtra_select_fields.push_real(alias, `(_walk._path)[${i + 1}] as ${escid(alias)}`); // array[_append]
                    sql_xtra_select_fields.push_real(alias, {
                        sql_alias: escid(alias),
                        sql_value: `(_walk._path)[${i + 1}]`,
                        // sql_value_comment: null,
                        sql_type: 'TEXT/**/', //TODO db_type_meta2real(field_item.db_type),
                        nullable: null,
                    });
                    result.lvls_fields.push(alias);
                }

                // иерархичный справочник не всегда "дорастает" до глубочайшего уровня
                // так что в качестве значения для джоина по факту должно быть COALESCE(_lvl_n, ..., _lvl_1, , _lvl_0)
                // НО это ТО же самое, что и _id!
                // так что варианта два -- либо материализовывать таблицу с дополнительным полем
                // либо вычислять этот COALESCE при джоине
                // и вроде как очевидно, что гораздо быстрее и проще добавить поле, потому что при джоине нам ещё предстоит кастовать типы
                const alias = lvl_prefix + '_id';
                //sql_xtra_select_fields.push_real(alias, `_calc.${escid(id_field_name)} as ${escid(alias)}`);
                sql_xtra_select_fields.push_real(alias, {
                    sql_alias: escid(alias),
                    sql_value: `_calc.${escid(id_field_name)}`,
                    // sql_value_comment: null,
                    sql_type: 'TEXT/**/', //TODO db_type_meta2real(field_item.db_type),
                    nullable: false,
                });
                result.jk_field_name = alias;

                sql_lvls_joins.push(
                    `LEFT JOIN _walk ON _walk._id = ${_norm(`_calc.${escid(id_field_name)}`)}`
                );

                //                const sql = _dedent(`
                //                    SELECT
                //${_indent(`                        `, "  " + sql_xtra_select_fields.commit())}
                //                    FROM
                //                        ${escid(cte_walk_alias)}
                //                `);

                //                sql_with.push_sql({ alias: "_lvls", sql: sql });

                //                sql_full_select_fields.push_real(null, '_lvls.*');
                //                sql_lvls_joins.push(`LEFT JOIN _lvls ON _lvls._id = _calc.${escid(id_field_name)}`);
            }
        }

        const sql_select_fields = MIX_LIST.from(sql_full_select_fields, sql_xtra_select_fields);

        let sql_main;
        if (opt_lvls_only) {
            sql_main = _dedent(`
                SELECT
${_indent(
    `                    `,
    '  ' + sql_select_fields.commit({ text_real: (entry) => mksql_select_field(entry.data) })
)}
                FROM
                    ${cte_calc_alias} as _calc
                    ${sql_lvls_joins.join('\n                    ')}
            `);
        } else {
            sql_main = _dedent(`
                SELECT
${_indent(
    `                    `,
    '  ' + sql_select_fields.commit({ text_real: (entry) => mksql_select_field(entry.data) })
)}
                FROM
                    ${cte_calc_alias} as _calc
                    ${sql_lvls_joins.join('\n                    ')}
                    ${sql_full_joins.join('\n                    ')}
            `);
        }

        result.sql_main = sql_main;

        // немного костыльный экспорт, нужный просто для "чистоты", в теории можно просто sql_select_fields отдать
        // for (const { real, key, data } of sql_select_fields.entries) {
        //     if (!real) continue;
        //     result.full_fields.push({ key, data });
        // }

        // script.push(sql_with.commit() + `SELECT * FROM ${sql_with.alias_cur}\n;\n`);

        // sql = sql_with.commit() + sql;

        // NOTE/TODO при генерировании скрипта нужен разделитель (;), при генерировании единичного запроса -- НЕТ
        // ПОКА "внутри" мы генерируем ТОЛЬКО "единичный запрос", а снуражи -- "скрипт", оставляем так
        // нужен opts-флаг на эту тему, а генерирование запроса ИЛИ скрипта по задумке должно быть разведено на ДВЕ разные ф-ии mksql_xxx

        result.sql_head = script2text(script);

        if ('Infoservice' == model_class_real) {
            const materialized = mksql_materialized_isvc(
                {
                    sql_with,
                    sql_main,
                },
                { escid },
                { name: id, sql_fields: sql_select_fields }
            );
            script.push(`${_indent(``, materialized.script)}\n`);
        } else {
            script.push(sql_with.commit() + sql_main + `\n`);
        }
    } catch (err) {
        console.error(err);
        if (opt_rethrow) throw err;
        const sql_main_err = `SELECT DDLSTOP(${"'формирование запроса остановлено из-за критической ошибки'"})`; // esc() is out of reach in catch{} block
        if (String(result.sql_main || '').length)
            result.sql_main = `/*\n${result.sql_main}\n*/\n${sql_main_err}`;
        else result.sql_main = sql_main_err;
        script.push(sql_with.commit() + result.sql_main);
        script.push(``);
        script.push(mklog.STOP(err)); // unshift?
        if (!(err instanceof DDLStop)) {
            // если это исключение DDLStop, то не надо падать, просто мягко сообщим об этом в скрипте,
            // показав сгенерированное до момента встречи ошибки
            if (err instanceof ApiError) throw err;
            throw new ApiError(418, 'Ошибка выгрузки', err); // 418 I'm a teapot
        }
        // if (opt_rethrow) throw err;
    } finally {
        result.script = script2text(script);
    }

    return result;
}

class MetaDDLDumpService extends Extensions {
    async postQuery(id, body) {
        const result = {
            sql: '-- ... --',
        };

        let r;
        //r = await SELECTABLE.get_model_subs(id); r = JSON.stringify(r, null, 4);
        r = await mksql_Selectable(id);
        //const sql = r.sql_with.commit() + `SELECT * FROM ${r.sql_with.alias_cur}`;
        result.sql = r.script;

        return result;
    }
}

module.exports = MetaDDLDumpService;
