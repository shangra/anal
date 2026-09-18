const { Sequelize, Op } = require('sequelize');

const { Metadata } = sreda.models;

const MetadataModel = require('../../../metadata-cmp/services/model/Metadata.model');

const PivotChanService = require('../../../redis-ext-itable-metadata/services/PivotChan.service');
const PivotChanInstance = PivotChanService.instance;

/** @typedef {import('../../../metadata-cmp/db/models/metadata').TMetadataAttributes} TMetadataAttributes */

//NOTE $attributes should become obsolete, deprecated and cutout
/** @type {(keyof TMetadataAttributes | [keyof TMetadataAttributes, string])[]} */
const attributes = [
    'id',
    'code',
    'markdel',
    ['parent', 'owner_id'],
    'class_id',
    'class',
    'name',
    'description',
    'manifest',
    'createdAt',
    'updatedAt',
    'createdUser',
    'updatedUser',
    'rank',
];

// экранирование значений
const esc = (val) => Metadata.sequelize.escape(val);

// экранирование идентификаторов
//const escid = (id) => Metadata.sequelize.dialect.queryGenerator.quoteIdentifier(id);
const escid = (() => {
    const { queryGenerator } = Metadata.sequelize.dialect;
    return queryGenerator.quoteIdentifier.bind(queryGenerator);
})();

// схема БД может не быть задана (DB_SCHEMA пуст) — в Postgres это public,
// иначе quoteIdentifier(null) уронит require модуля на старте
const schema_tbl = Metadata._schema ?? 'public';
const sql_attributes = attributes.map((field) => (Array.isArray(field) ? `${escid(field[0])} as ${escid(field[1])}` : escid(field))).join(", ");
const sql_tbl_metadata = `${escid(schema_tbl)}.${escid(Metadata.tableName)}`;


let CFGMETAMODEL_ITABLE_DISABLE = sreda.env?.CFGMETAMODEL_ITABLE_DISABLE ?? false; // рубильник отключения внутринодного кеша метаданных
let CFGMETAMODEL_LOG_DEBUG = sreda.env?.CFGMETAMODEL_LOG_DEBUG ?? false;
let CFGMETAMODEL_BUS_NAME = sreda.env?.CFGMETAMODEL_BUS_NAME ?? "md_dirtyq";

const { ITABLE, ITABLE_CACHE } = require('../../../../core/class/saf2dim/ITABLE.js');
const { WellknownSets, do_sets_intersect } = require('../../../../core/class/saf2dim/WellknownSets.js');

const { RLSManager, RLS_TYPE_VIEW, RLS_TYPE_READ, RLS_TYPE_WRITE, RLS_TYPE_DELETE } = require('../../../../core/db/rls/RLSManager');
const sql_tbl_rls = `${escid(schema_tbl)}.${escid("Rls")}`; // (см. RLSManager) использует "ту же схему, что и таблица целевой модели" + "таблица Rls"

const rls_owner_ids_registry = new WellknownSets(); // дедупликатор наборов owner_ids от Rls для экономии памяти

// наш внутренний кеш
const itable_metadata = new ITABLE({
    pk: "id",
    aux: {
        // DO NOT USE (works, but API about to change)
        "rank,createdAt": (row) => {
            const rank = Number.parseInt(row.rank, 10);
            const createdAt = +new Date(row.createdAt); // NaN if invalid
            return (""
                + (Number.isNaN(rank) ? "00000000000" : (((rank >= 0) ? "2" : "1") + Math.abs(rank).toFixed(0).padStart(10, "0")))
                + (Number.isNaN(createdAt) ? "00000000000000000" : (((createdAt >= 0) ? "2" : "1") + Math.abs(createdAt).toFixed(0).padStart(16, "0")))
            );
        }
    },
    fks: [
        "class", //: "class",
        "class_id", //: "class_id",
        "owner_id", //: "owner_id", // "parent" in underlying database
    ],
});

// интерфейс между базой и внутренним кешом
const itable_metadata_cache = new ITABLE_CACHE(itable_metadata, {
    pull_diffs: async (known_point) => {
        // сейчас фильтр по >=, а не >, чтобы не потерять обновления, доехавшие в тот же момент времени
        // (потому что опираемся на updatedAt)
        // из-за этого индекс всегда будет немного передёргиваться как минимум одной записью
        // чтобы этого финально избежать, нужно неповторяющееся и возрастающее при любом обновлении поле,
        // какой-нибудь id транзакции, напр. системное поле xmin или отдельное поле, в которое пишется pg_current_xact_id
        // можно ввести защитный интервал... ощутимого размера, чтобы по его прошествию запрашивать не с '>=', а с '>', но это всё фантазии

        const sql = `
            WITH "Metadata" AS (
                SELECT
                    ${sql_attributes}
                FROM
                    ${sql_tbl_metadata}
                WHERE TRUE
                    AND ${known_point ? `"Metadata"."updatedAt" >= ${esc(known_point)}` : `TRUE` /* см. заметку про updatedAt выше */}
                ORDER BY
                    "Metadata"."updatedAt" ASC
            )
            SELECT
                "Metadata".*,
                "Rls_read".owner_ids AS rls_owner_ids_read,
                "Rls_view".owner_ids AS rls_owner_ids_view
            FROM
                "Metadata"
                LEFT JOIN LATERAL (
                    SELECT
                        table_id AS id,
                        "type",
                        -- ARRAY_AGG(owner || ':' || owner_id) as owner_ids ${""/* не нужно это, см. RlsManager.(addRlsOptions + getUserAccessIds, нет разделения на разных owner) */}
                        ARRAY_AGG(owner_id) as owner_ids ${""/* DISTINCT можно не использовать: в базе они (должны быть) уникальны, но даже если по-странному это не так, то не страшно, т.к. всё равно превращаем это в Set */}
                    FROM
                        ${sql_tbl_rls}
                    WHERE
                        "table_name" = ${esc(Metadata.tableName)}
                        AND table_id = "Metadata".id
                        AND "type" = ${esc(RLS_TYPE_READ)}
                    GROUP BY
                        id,
                        "type"
                ) "Rls_read" ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        table_id AS id,
                        "type",
                        -- ARRAY_AGG(owner || ':' || owner_id) as owner_ids ${""/* не нужно это, см. RlsManager.(addRlsOptions + getUserAccessIds, нет разделения на разных owner) */}
                        ARRAY_AGG(owner_id) as owner_ids ${""/* DISTINCT можно не использовать: в базе они (должны быть) уникальны, но даже если по-странному это не так, то не страшно, т.к. всё равно превращаем это в Set */}
                    FROM
                        ${sql_tbl_rls}
                    WHERE
                        "table_name" = ${esc(Metadata.tableName)}
                        AND table_id = "Metadata".id
                        AND "type" = ${esc(RLS_TYPE_VIEW)}
                    GROUP BY
                        id,
                        "type"
                ) "Rls_view" ON TRUE
        `;

        //FYI сейчас rls_owner_ids_(read|view) вытаскивается для каждой строки;
        //FYI а эти массивы достаточно неуникальны (мы их дедуплицируем для экономии памяти)
        //FYI если окончательно принять это как данность, то для минимизации трафика до бд (и избавления от сложных агрегаций)
        //FYI в теории можно разбить получение данных на два запроса:
        //FYI первый получает изменившиеся записи, а второй подтягивает rls_owner_ids_(read|view) от них

        const [rows] = await Metadata.sequelize.query(sql);

        for (const row of rows) {
            row.rls_owner_ids = {
                [RLS_TYPE_READ]: rls_owner_ids_registry.for(row.rls_owner_ids_view ?? []),
                [RLS_TYPE_VIEW]: rls_owner_ids_registry.for(row.rls_owner_ids_read ?? []),
            }
            delete row.rls_owner_ids_view;
            delete row.rls_owner_ids_read;
        }

        const final_point = rows[rows.length - 1]?.updatedAt ?? null; // OK to be undefined for empty resultset

        CFGMETAMODEL_LOG_DEBUG && console.log("pull diffs", { sql, known_point, final_point, nrows: rows.length });

        return { final_point, rows };
    }
});

// itable_metadata_cache.ee.on("dirty", (mark) => {
//     //TODO publish dirty signal to other pivot instances (esb, redis, pg listen/notify, ...)
// });

/**
 * создать функцию, проверяющую соответствие item условиям из rawRlsQuery
 */
function mk_rawRlsQuery_filter_callbackFn(sqltype, rlstype, options_applied) {
    //FYI вероятно логику, сконцентрированную в mk_rawRlsQuery_filter__XXXX стоит унести
    //FYI в core/db/rls/DB.js -> mkRlsOptions
    //FYI или вообще куда-то в rls-ext-metadata
    //FYI но в таком случае туда тогда вообще всё про гибрид метаданных и рлс надо нести: у меня нет видения, как это сделать правильно, компактно и быстродействующе

    //FYI БОЛЕЕ ТОГО, возможно, функция-фильтр должна генерироваться там же, где и Rls_rawRlsQuery

    // if (options_applied?.force) return (item) => true;
    const options_rls = Metadata.mkRlsOptions(sqltype, rlstype, options_applied);
    const rawRlsQuery = options_rls[Symbol.for("Rls_rawRlsQuery")];
    if (!rawRlsQuery) {
        if (!options_applied?.force) {
            CFGMETAMODEL_LOG_DEBUG && console.error(new Error(`MAYBE PROBLEM: Metadata.mkRlsOptions[...Rls_rawRlsQuery...] contains nothing, but options.force is also false(ish); RLS filtering IS NOT APPLIED!`));
        }
        // нет фильтрации, всё пройдёт проверку
        return () => true;
    }

    if ((rawRlsQuery.rls_owner_id || rawRlsQuery.rls_type)) {
        if (!(rawRlsQuery.rls_owner_id && rawRlsQuery.rls_type)) {
            // если есть одна из опций, то обязательно нужна вторая!
            throw new Error(`Malformed Rls_rawRlsQuery: rls_owner_id and rls_type are complementary to each other and must be either both set or both absent!`);
        }
        rawRlsQuery.rls_owner_id = new Set(rawRlsQuery.rls_owner_id);
    }

    function rawRlsQuery_filter__owner(rawRlsQuery, item) {
        // item.rls_owner_ids -- ассоциативный массив { [rls_type]: Set([owner_id, owner_id, ...]) }
        // при обращении к несодержащемуся в нём rls_type будет исключение, и это правильно
        // проверяем пересечение списка допусков юзера с белым списком от элемента метаданных, разрешаем если есть хотя бы одно совпадение
        return do_sets_intersect(item.rls_owner_ids[rawRlsQuery.rls_type], rawRlsQuery.rls_owner_id);
    }
    function rawRlsQuery_filter__markdel(rawRlsQuery, item) {
        // проверяем, что опция markdel у элемента метаданных соответствует запрошенной
        return (rawRlsQuery.tbl_markdel === item.markdel);
    }

    if ((rawRlsQuery.rls_owner_id) && (undefined !== rawRlsQuery.tbl_markdel)) {
        // есть белый список допущенных owner_id И фильтрация по markdel
        return (item) => (rawRlsQuery_filter__owner(rawRlsQuery, item) && rawRlsQuery_filter__markdel(rawRlsQuery, item));
    }
    if (rawRlsQuery.rls_owner_id) {
        // есть белый список допущенных owner_id
        return (item) => (rawRlsQuery_filter__owner(rawRlsQuery, item));
    }
    if (undefined !== rawRlsQuery.tbl_markdel) {
        // есть фильтрация по markdel
        return (item) => (rawRlsQuery_filter__markdel(rawRlsQuery, item));
    }

    // не нашли опций, по которым надо что-то фильтровать
    CFGMETAMODEL_LOG_DEBUG && console.error(new Error(`WARN: non-empty Metadata.mkRlsOptions[...Rls_rawRlsQuery...], but no filters to set up; RLS filtering IS NOT APPLIED!`));
    return () => true;
};

const itable_hidden_fields = new Set(["rls_owner_ids"]);
/**
 * перед возвратом item от itable наружу его надо обезопасить:
 * не выдавать приватные поля, не выдавать лишние поля, structuredClone для защиты от случайной модификации
 * возможно, стоит сделать это по-другому и/или отключаемым
 */
function itable_item2row_callbackFn(item) {
    const row = {};
    for (const [field, value] of Object.entries(item)) {
        if (itable_hidden_fields.has(field)) continue;
        row[field] = structuredClone(value);
    }
    return row;
};

//DEBUG только для внутреннего тестирования разницы между легаси и itable
Object.defineProperty(MetadataModel, "itable_disabled", {
    get: function itable_disabled() { return CFGMETAMODEL_ITABLE_DISABLE; },
    set: function itable_disabled(val) {
        val = !!val;
        console.warn("Setting CFGMETAMODEL_ITABLE_DISABLE to", val);
        CFGMETAMODEL_ITABLE_DISABLE = val;
    }
});

MetadataModel.known_point_rls = 0n;

// ─── itable_fast_forward ────────────────────────────────────────────────────

/**
 * Вызывать перед любым обращением к itable на чтение.
 * Также сбрасывает кеш при смене RLS-версии.
 */
const itable_fast_forward = async function () {
    if (MetadataModel.known_point_rls < RLSManager.dbversion) {
        MetadataModel.known_point_rls = RLSManager.dbversion;
        itable_metadata_cache.emit_dirty(itable_metadata_cache.SIG_REREAD);
    }
    return /* no await */ itable_metadata_cache.fast_forward();
};
MetadataModel.itable_fast_forward = itable_fast_forward.bind(MetadataModel);

// ─── itable_emit_dirty ──────────────────────────────────────────────────────

/**
 * Вызывать после любой мутации данных.
 * Публикует dirty-сигнал в Redis для других реплик и обновляет локальный кеш.
 */
const itable_emit_dirty = async function (mark = null) {
    // 1. Выставляем dirty-флаг локально (синхронно, всегда успешно)
    itable_metadata_cache.emit_dirty(mark);

    // 2. Сериализуем mark в строку для Redis pub/sub
    const payload = (itable_metadata_cache.SIG_REREAD === mark)
        ? "Metadata.reread"
        : (mark ?? "Metadata.update");

    // 3. Публикуем в Redis — другие реплики получат сигнал
    try {
        await PivotChanInstance.push_item(CFGMETAMODEL_BUS_NAME, payload);
    } catch (err) {
        // Публикация не удалась (Redis временно недоступен?).
        // Локальный dirty уже выставлен, другие реплики подхватят изменения
        // при следующем периодическом принудительном сбросе кеша.
        console.error(
            `ItableMetadata.itable_emit_dirty: failed to publish dirty signal` +
            ` (payload=${JSON.stringify(payload)}):`,
            err?.message
        );
    }

    // 4. Обновляем локальный кеш
    return this.itable_fast_forward().catch((err) => {
        console.error("ItableMetadata.itable_emit_dirty: itable_fast_forward failed:", err?.message);
    });
};
MetadataModel.itable_emit_dirty = itable_emit_dirty.bind(MetadataModel);

// ─── Bus subscription ───────────────────────────────────────────────────────

/**
 * Обработчик входящих сообщений от других реплик.
 * Вынесен в именованную функцию для возможности отписки.
 */
function _onBusMessage(event) {
    const { internal, error, epoch, payload } = event;
    const log_marker = `> MetadataModel # bus listener:`;
    CFGMETAMODEL_LOG_DEBUG && console.log(log_marker, "recv", CFGMETAMODEL_BUS_NAME, event);
    // Своё собственное сообщение — уже обработано локально при отправке
    if (internal) return;
    const mark = ("Metadata.reread" === payload)
        ? itable_metadata_cache.SIG_REREAD
        : payload;
    if (error) {
        // SIG_MISS: потеряли одно или несколько сообщений — принудительный полный сброс
        // SIG_CULL: пришло устаревшее сообщение — тоже на всякий случай делаем reread
        console.warn(log_marker, "recv error signal, forcing full cache reread:", { epoch, error: error.toString() });
        itable_metadata_cache.emit_dirty(itable_metadata_cache.SIG_REREAD);
    } else {
        itable_metadata_cache.emit_dirty(mark);
    }
    MetadataModel.itable_fast_forward().catch((err) => {
        console.error(log_marker, "itable_fast_forward failed:", err?.message);
    });
}

/**
 * Подписка на Redis-канал с автоматическими повторными попытками при ошибке.
 * @param {number} [retryCount=0]
 */
async function _initBusSubscription(retryCount = 0) {
    try {
        await PivotChanInstance.join_items(CFGMETAMODEL_BUS_NAME, _onBusMessage);
        console.log(`ItableMetadata: bus subscription established (channel="${CFGMETAMODEL_BUS_NAME}")`);
    } catch (err) {
        // Экспоненциальный backoff: 5s, 10s, 15s, ..., не более 60s
        const delay = Math.min(5_000 * (retryCount + 1), 60_000);
        console.error(
            `ItableMetadata: failed to subscribe to bus channel "${CFGMETAMODEL_BUS_NAME}"` +
            ` (attempt ${retryCount + 1}), retry in ${delay}ms:`,
            err?.message
        );
        setTimeout(() => _initBusSubscription(retryCount + 1), delay);
    }
}

_initBusSubscription();

// ─── Периодический принудительный сброс кеша (fallback) ────────────────────

// Страховка на случай временной недоступности Redis или потери pub/sub сообщений.
// Если за N секунд ни одно сообщение не дошло — кеш всё равно обновится.
// CFGMETAMODEL_REFRESH_INTERVAL=0 отключает механизм.
const METADATA_CACHE_REFRESH_INTERVAL = +(sreda.env?.CFGMETAMODEL_REFRESH_INTERVAL ?? 60_000);

if (!CFGMETAMODEL_ITABLE_DISABLE && METADATA_CACHE_REFRESH_INTERVAL > 0) {
    const refreshTimer = setInterval(() => {
        CFGMETAMODEL_LOG_DEBUG && console.log("ItableMetadata: periodic forced cache refresh");
        itable_metadata_cache.emit_dirty(itable_metadata_cache.SIG_REREAD);
        MetadataModel.itable_fast_forward().catch((err) => {
            console.error("ItableMetadata: periodic refresh failed:", err?.message);
        });
    }, METADATA_CACHE_REFRESH_INTERVAL);

    // Таймер не должен удерживать процесс при graceful shutdown
    if (typeof refreshTimer.unref === 'function') refreshTimer.unref();
}

// ─── Мутации: обёртки с поддержкой транзакций ───────────────────────────────
const _get = MetadataModel.get;
const get = async function (...args) {
    // fast_forward актуализирует кеш, но get слишком гибкий для itable:
    // произвольный where не всегда можно покрыть индексами.
    // Актуализация нужна для консистентности, если вызов идёт в паре с itable-методами.
    await this.itable_fast_forward();
    return _get.apply(MetadataModel, args);
};
MetadataModel.get = get.bind(MetadataModel);

const _getLinks = MetadataModel.getLinks;
const getLinks = async function (class_id, owner_id = undefined, options = {}) {
    // select [attributes] from metadata
    // where 1
    //  [and "parent" = $owner_id]
    //  and "class_id" = $class_id
    //  and "class_id" != "id"
    // order by rank, createdAt
    const { markdel = 0, force = false, transaction } = options ?? {};

    const log_marker = CFGMETAMODEL_LOG_DEBUG && `> MetadataModel.getLinks(class_id = ${JSON.stringify(class_id)}, owner_id = ${JSON.stringify(owner_id)}):`;

    const where = {
        class_id: {
            [Op.and]: [class_id, { [Op.ne]: { [Op.col]: 'Metadata.id' } }]
        },
        markdel
    };
    if (owner_id) where.parent = owner_id;

    const options_applied = {
        attributes,
        where,
        raw: true, // sequelize: "disable wrapping every row to proper instance objects"
        order: [
            ['rank', 'ASC'],
            ['createdAt', 'ASC'],
        ],
        force,
        transaction
    };

    if (CFGMETAMODEL_ITABLE_DISABLE) {
        return _getLinks.apply(MetadataModel, [class_id, owner_id, options])
    }

    await this.itable_fast_forward();

    const rawRlsQuery_filter_callbackFn = mk_rawRlsQuery_filter_callbackFn('select', RLS_TYPE_VIEW, options_applied);

    const items = [];
    for (const i of [].concat(class_id)) {
        const iterable = /* no await */ itable_metadata.scan(i, "class_id");
        for (const item of iterable) {
            if (item.id == item.class_id) continue; // воспроизводим where { class_id: { [Op.ne]: { [Op.col]: `${Metadata.tableName}.id` } } }
            if (owner_id && !(item.owner_id == owner_id)) continue;
            if (!rawRlsQuery_filter_callbackFn(item)) continue; // не прошли по Rls
            items.push(item);
        }
    }

    // items.sort(itable_metadata.aux_compareFn("rank,createdAt", (a, b) => a.localeCompare(b))); // unstable API, do not use
    items.sort((a, b) => { // воспроизводим order by ...
        return 0
            || (a.rank - b.rank) // ... ['rank', 'ASC'],
            || (+new Date(a.createdAt) - +new Date(b.createdAt)) // ... ['createdAt', 'ASC']
            // || String(a.createdAt).localeCompare(b.createdAt) // ... ['createdAt', 'ASC'] // should be faster?
            ;
    });

    return items.map(itable_item2row_callbackFn);

};
MetadataModel.getLinks = getLinks.bind(MetadataModel);

const _getItem = MetadataModel.getItem.bind(MetadataModel);
const getItem = async function (id, options) {
    //TODO restrict $options to some well-known subset
    // select [attributes] from metadata
    // where 1
    //  and id = $id
    //  and markdel = $markdel

    //FYI options.force has no effect for sequelize..findOne|findAll
    const { markdel, force = false, transaction } = options ?? {};

    const log_marker = CFGMETAMODEL_LOG_DEBUG && `> MetadataModel.getItem(${JSON.stringify(id)}):`;

    const options_applied = {
        attributes,
        where: {
            id,
            markdel,
        },
        raw: true,
        force, //FYI no effect!
        transaction,
    };

    if (CFGMETAMODEL_ITABLE_DISABLE || transaction) {
        // не работаем через кеш, если хотят транзакцию
        log_marker && console.log(`${log_marker} legacy`);
        return _getItem.apply(MetadataModel, [id, options]);
    }

    await this.itable_fast_forward();

    const item = /* no await */ itable_metadata.get(id);

    if (!item) return null;
    const rawRlsQuery_filter_callbackFn = mk_rawRlsQuery_filter_callbackFn('select', RLS_TYPE_VIEW, options_applied);
    if (!rawRlsQuery_filter_callbackFn(item)) return null; // не прошли по Rls

    return itable_item2row_callbackFn(item);
};
MetadataModel.getItem = getItem.bind(MetadataModel);

const _viewChild = MetadataModel.viewChild.bind(MetadataModel);
const _readChild = MetadataModel.readChild.bind(MetadataModel);

const getChild = async function (rlsType, parent, options = {}) {
    const owner_id = parent; // argument should be renamed, but unknown consequences to be met due to ext_modules argument name parsing
    //TODO restrict $options to some well-known subset

    const options_map = new Map(Object.entries(options).filter(i => i[1]));
    //const { transaction } = options;
    //options_map.delete("transaction");

    const log_marker = CFGMETAMODEL_LOG_DEBUG && `> MetadataModel.getChild(${JSON.stringify(owner_id)}}):`;

    const options_applied = {
        ...options,
        attributes,
        where: {
            [Op.and]: [
                { parent: owner_id },
                { parent: { [Op.ne]: { [Op.col]: `${Metadata.tableName}.id` } } }
            ]
        },
        raw: true,
        order: [
            ...(options.order ?? []),
            ['rank', 'ASC'],
            ['createdAt', 'ASC'],
        ],
    };

    if (CFGMETAMODEL_ITABLE_DISABLE || options.transaction) {
        // не работаем через кеш, если хотят неизвестные нам опции (напр., transaction)
        log_marker && console.log(`${log_marker} legacy`);
        return RLS_TYPE_VIEW == rlsType
            ? _viewChild.apply(MetadataModel, [parent, options])
            : _readChild.apply(MetadataModel, [parent, options]);
    }

    await this.itable_fast_forward();

    const rawRlsQuery_filter_callbackFn = mk_rawRlsQuery_filter_callbackFn('select', rlsType, options_applied);

    const items = [];
    for (const i of [].concat(owner_id)) {
        const iterable = /* no await */ itable_metadata.scan(i, "owner_id");
        for (const item of iterable) {
            if (item.id == i) continue; // воспроизводим where { parent: { [Op.ne]: { [Op.col]: `${Metadata.tableName}.id` } } }
            if (!rawRlsQuery_filter_callbackFn(item)) continue; // не прошли по Rls
            items.push(item);
        }
    }

    // items.sort(itable_metadata.aux_compareFn("rank,createdAt", (a, b) => a.localeCompare(b))); // unstable API, do not use
    items.sort((a, b) => { // воспроизводим order by ...
        return 0
            || (a.rank - b.rank) // ... ['rank', 'ASC'],
            || (+new Date(a.createdAt) - +new Date(b.createdAt)) // ... ['createdAt', 'ASC']
            // || String(a.createdAt).localeCompare(b.createdAt) // ... ['createdAt', 'ASC'] // should be faster
            ;
    });

    return items.map(itable_item2row_callbackFn);
}

const viewChild = async function (parent, options = {}) {
    return getChild.apply(MetadataModel, [RLS_TYPE_VIEW, parent, options]);
}
MetadataModel.viewChild = viewChild.bind(MetadataModel);

const readChild = async function (parent, options = {}) {
    return getChild.apply(MetadataModel, [RLS_TYPE_READ, parent, options]);
};
MetadataModel.readChild = readChild.bind(MetadataModel);

const transactMap = new Map();

/**
 * Регистрирует транзакцию для отложенного сброса кеша.
 * Очищает transactMap при любом исходе (commit или rollback).
 * @param {import('sequelize').Transaction} transaction
 * @param {Function} thisArg — контекст вызова (MetadataModel)
 */
function _registerTransaction(transaction, thisArg) {
    transaction ||= Sequelize._cls.get('transaction');

    if (!transaction) return;

    if (transactMap.has(transaction.id)) return;

    // afterCommit — сбрасываем кеш и оповещаем другие реплики
    transaction.afterCommit(() => {
        thisArg.itable_emit_dirty(itable_metadata_cache.SIG_REREAD);
        transactMap.delete(transaction.id);
    });

    // Sequelize не имеет built-in afterRollback hook — патчим rollback вручную
    const _rollback = transaction.rollback.bind(transaction);
    transaction.rollback = async function (...args) {
        transactMap.delete(transaction.id);
        return _rollback(...args);
    };

    transactMap.set(transaction.id, true);
}


const _add = MetadataModel.add;
const add = async function (parent, class_id, class_name, name, description, manifest, transaction) {
    _registerTransaction(transaction, this);

    return _add.apply(MetadataModel, [parent, class_id, class_name, name, description, manifest, transaction])
        .then(result => {
            if (!transaction && !Sequelize._cls.get('transaction')) this.itable_emit_dirty("Metadata.add");
            return result;
        });
};
MetadataModel.add = add.bind(MetadataModel);

const _bulkAdd = MetadataModel.bulkAdd;
const bulkAdd = async function ({ rows, force, transaction }) {
    _registerTransaction(transaction, this);

    return _bulkAdd.apply(MetadataModel, [{ rows, force, transaction }])
        .then(result => {
            if (!transaction && !Sequelize._cls.get('transaction')) this.itable_emit_dirty(itable_metadata_cache.SIG_REREAD);
            return result;
        });
};
MetadataModel.bulkAdd = bulkAdd.bind(MetadataModel);


const _upd = MetadataModel.upd;
const upd = async function (id, name, description, parent, manifest, options) {
    const { transaction } = options ?? {};
    _registerTransaction(transaction, this);

    return _upd.apply(MetadataModel, [id, name, description, parent, manifest, options])
        .then(result => {
            if (!transaction && !Sequelize._cls.get('transaction')) this.itable_emit_dirty("Metadata.upd");
            return result;
        });
};
MetadataModel.upd = upd.bind(MetadataModel);

const _updRank = MetadataModel.updRank;
const updRank = async function (id, rank, options) {
    const { transaction } = options ?? {};
    _registerTransaction(transaction, this);

    return _updRank.apply(MetadataModel, [id, rank])
        .then(result => {
            if (!transaction && !Sequelize._cls.get('transaction')) this.itable_emit_dirty("Metadata.updRank");
            return result;
        });
};
MetadataModel.updRank = updRank.bind(MetadataModel);

const _del = MetadataModel.del;
const del = async function (id, transaction, force) {
    _registerTransaction(transaction, this);

    return _del.apply(MetadataModel, [id, transaction, force])
        .then(result => {
            if (!transaction && !Sequelize._cls.get('transaction')) this.itable_emit_dirty(itable_metadata_cache.SIG_REREAD);
            return result;
        });
};
MetadataModel.del = del.bind(MetadataModel);

async function _shutdownBusSubscription() {
    try {
        await PivotChanInstance.exit_items(CFGMETAMODEL_BUS_NAME, _onBusMessage);
        console.log("ItableMetadata: bus subscription released");
    } catch (err) {
        console.error("ItableMetadata: failed to release bus subscription:", err?.message);
    }
}

process.on('SIGTERM', _shutdownBusSubscription);
process.on('SIGINT', _shutdownBusSubscription);

module.exports = {};
