const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
//const MetadataModel = require('../../metadata-cmp/services/model/Metadata.model');
const Metadata = new MetadataClass();

const { Metadata: MetadataModel } = sreda.models;

const sys_connector = () => {
    //const Metadata.sequelize.query(sql)
    const esc = (val) => MetadataModel.sequelize.escape(val); // экранирование значений
    const escid = (id) => MetadataModel.sequelize.dialect.queryGenerator.quoteIdentifier(id); // экранирование идентификаторов
    const querySql = (sql) => MetadataModel.sequelize.query(sql);
    return { esc, escid, querySql };
};

// упаковать строковый uuid в bigint
function id_pack(id_string) {
    return BigInt('0x' + String(id_string).replaceAll('-', ''));
}
// распаковать bigint в строковый uuid
function id_wake(id_bigint) {
    const s = BigInt(id_bigint).toString(16).padStart(32, '0');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(
        20,
        32
    )}`;
}

const slicelen = 3;
// нормализовать входящую строку, разбить на слова, каждое слово разбить на пересекающиеся отрезки длиной не более slicelen
// "aBCdE fg h iJk" => abc, bcd, cde, fg, h, ijk
function mk_vector(value) {
    //if (value == "r_bal_avg") debugger;
    const vector = Object.assign([], { val: '' });
    // .replace(/^\s+|\s+$|\s+(?=\s)/gs, "")
    const raw = String(value || '')
        .normalize()
        .toLocaleLowerCase();
    const val = [];
    for (const [word] of raw.matchAll(/\S+/gs)) {
        val.push(word);
        const cps = [...word]; // split word by code points
        const len = Math.min(cps.length, slicelen);
        for (let i = 0, j = cps.length - len; i <= j; ++i) {
            vector.push(cps.slice(i, i + len).join(''));
        }
    }
    vector.val = val.join(' ');
    return vector;
}

// микро "полнотекстовый" индекс
// хранит отношение отрезка к идентификаторам, в которых он встречается
class FTIDX {
    constructor() {
        this.map = new Map();
    }

    /**
     * зачистить индекс
     */
    clear() {
        this.map.clear();
    }

    /**
     * удалить из индекса набор ids, соответствующий некоторому vec
     */
    del(ids, vec) {
        const { map } = this;
        for (const slice of vec) {
            // для каждого отрезка из vec
            const set = map.get(slice);
            if (!set) continue;
            for (const id of ids) set.delete(id); // удалить запомненные идентификаторы
            if (!set.size) map.delete(slice); // и подчистить хвосты при необходимости
        }
    }

    /**
     * добавить в индекс набор ids, соответствующий некоторому vec
     */
    add(ids, vec) {
        const { map } = this;
        for (const slice of vec) {
            // для каждого отрезка из vec
            let set = map.get(slice);
            // запомнить, что он встречается в указанных id
            if (set) for (const id of ids) set.add(id);
            else map.set(slice, (set = new Set(ids)));
        }
    }

    // /**
    //  * обновить набор ids, для которого vec изменилось с old на cur
    //  * (лучше вручную del+add)
    //  */
    // set(ids, old, cur) {
    //     if (old == cur) {
    //         // unchanged
    //         return;
    //     }
    //     if (null != old) {
    //         this.del(ids, old);
    //     }
    //     if (null != cur) {
    //         this.add(ids, cur);
    //     }
    // }

    /**
     * получить список ids, соответствующих некоторому vec
     */
    get(vec) {
        const n = vec.length;
        if (!n) return null; // с пустым вектором не совпадает ничего
        const { map } = this;
        // у нас нет Set.prototype.intersection(), ну и... ладно
        const slices = vec.values();
        const slice0 = slices.next().value;
        let set = map.get(slice0);
        if (!set) return null; // первый не найден -> ничего не найдено
        const r = new Map();
        for (const id of set) r.set(id, [1]); // список идентификаторов для первого отрезка
        for (const slice of slices) {
            set = map.get(slice);
            if (!set) return null; // какой-то не найден -> ничего не найдено
            for (const id of set) {
                const c = r.get(id);
                if (c) c[0]++;
            }
        }
        for (const [id, c] of r.entries()) {
            if (n != c[0]) r.delete(id); // нам нужны id, от которых все части найдены в индексе
        }
        return r.size ? r : null;
    }
}

// компактное хранилище уникальных идентификаторов
class IDIDX {
    constructor() {
        this.idn = 0;
        this.map = new Map();
    }

    /**
     * получить полный id по сжатому или наоборот
     */
    get(what) {
        return this.map.get(what);
    }

    /**
     * найти сжатое значение для полного или создать новое сжатое
     */
    add(id) {
        const { map } = this;
        let idk = map.get(id);
        if (undefined !== idk) return idk;
        idk = this.idn++;
        map.set(id, idk).set(idk, id);
        return idk;
    }

    /**
     * удалить пару сжатое-полное
     */
    del(what) {
        const { map } = this;
        let pair = map.get(what);
        map.delete(what);
        map.delete(pair);
    }
}

let ftidx_dt = null; // актуальность индекса до этого момента

const ididx = new IDIDX(); // карта сжатых идентификаторов
const ftidx_name = new FTIDX(); // индекс .name

async function query(params) {
    const { esc, escid, querySql } = sys_connector();
    const sql_tbl_metadata = `${escid(MetadataModel._schema)}.${escid(MetadataModel.tableName)}`;

    const target = String(params?.target || '');
    const tokens = [];
    let tokens_uuids_cnt = 0;
    for (const [token] of target.matchAll(/\S+/gs)) {
        const m_uuid = token
            .toLowerCase()
            .match(/^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$/);
        //console.log({ m_uuid, r: m_uuid.slice(1).join("+") });
        if (m_uuid) {
            tokens.push(m_uuid.slice(1).join('-'));
            tokens_uuids_cnt++;
        } else {
            tokens.push(token);
        }
    }
    // console.log({ target, tokens });

    if (!tokens.length) {
        // прилетел пустой запрос
        return null;
    }

    /*
        const report_promises = [];
        const report_map = new Map(); // номер промиса -> id и остальное
        const report_push = (id, match) => {
            // выясняли, что какой-то id нам подходит, будем ждать по нему инфу
            const promise = Metadata.getTreeNodeV3(id, {});
            report_map.set(report_promises.length, { id, match });
            report_promises.push(promise);
        };
        const report_commit = async () => {
            // дожидаемся полной инфы по всем результатам поиска
            const report = [];
            for (const [i, { status, value: node, reason: error }] of (await Promise.allSettled(report_promises)).entries()) {
                //FYI .value may be missing and therefore .node will be undefined
                // should report (access?) errors?
                //if (!node) continue;
                const { id, match } = report_map.get(i);
                const entry = {
                    id,
                    match,
                    node,
                    error: error?.message
                };
                report.push(entry);
            }
            return report;
        };
    */

    const report = [];
    const report_push = (id, match) => {
        // выясняли, что какой-то id нам подходит, будем искать по нему инфу
        report.push({ id, match, node: { id, path: [] }, error: null });
    };
    const report_commit = async () => {
        // формируем полную инфу по всем результатам поиска
        //const paths = await Metadata.MetadataModel.getPath(report.map(item => item.id));
        const paths = await Metadata.getTreeNodePath(
            report.map((item) => item.id),
            {}
        );
        for (const item of report) {
            //const id = item.id;
            item.node.path = paths[item.id];
        }
        return report;
    };

    if (tokens_uuids_cnt == tokens.length) {
        // частный случай: все токены -- это id
        for (const token of new Set(tokens).values()) {
            const id = token;
            report_push(id, 'id');
        }
    } else {
        // обычный поиск
        // ловко поддерживаем индекс в актуальном состоянии, отслеживая поле updatedAt в таблице метаданных
        // по >=, а не >, чтобы не потерять обновления, доехавшие в тот же момент времени...
        // из-за этого индекс всегда будет немного передёргиваться
        // но даже полная его пересборка не так страшна, как Metadata.getTreeNodeV3 для каждого результата поиска

        if (null == ftidx_dt) {
            // console.log("index requires full rebuild");
            ftidx_name.clear();
        }
        // console.time("index update/rebuild");
        const sql = `
            SELECT
                id,
                "name" as "val",
                "updatedAt" as "dt",
                "markdel" as "del"
            FROM ${sql_tbl_metadata}
            WHERE ${ftidx_dt ? `"updatedAt" >= ${esc(ftidx_dt)}` : `TRUE`}
            ORDER BY "updatedAt"
        `;
        const [rows] = await querySql(sql);
        const rows_del = new Map();
        const rows_add = new Map();
        if (null == ftidx_dt) ftidx_dt = rows[0]?.dt ?? null;
        for (const row of rows) {
            const idk = ididx.add(id_pack(row.id)); // в полнотекстовом индексе храним компактные id
            const vector = mk_vector(row.val);
            if (row.dt > ftidx_dt) ftidx_dt = row.dt;
            rows_del.get(vector.val)?.ids.push(idk) ??
                rows_del.set(vector.val, { vec: vector, ids: [idk] });
            if (row.del) ididx.del(idk);
            else
                rows_add.get(vector.val)?.ids.push(idk) ??
                    rows_add.set(vector.val, { vec: vector, ids: [idk] });
        }
        for (const { vec, ids } of rows_del.values()) ftidx_name.del(ids, vec);
        for (const { vec, ids } of rows_add.values()) ftidx_name.add(ids, vec);

        // console.log([...ftidx_name.map.keys()]);

        // console.timeEnd("index update/rebuild");
        // console.log("index update/rebuild entries cnt:", rows.length);

        // console.time("search index");

        // поддержали индекс в актуальном состоянии, теперь просто ищем по нему

        const found = new Set();
        for (const token of tokens) {
            const vector = mk_vector(token);
            // console.log("querying", vector);
            const r = ftidx_name.get(vector);
            if (r)
                for (const idk of r.keys()) {
                    const id = id_wake(ididx.get(idk)); // расчехлили id из компактного вида в полный
                    found.add(id);
                    report_push(id, 'name');
                }
        }

        //DEBUG
        if (0) {
            console.log({ found });
            const tbl = {};
            if (found.size) {
                const sql = `SELECT id, name FROM ${sql_tbl_metadata} where id in ('${[
                    ...found.values(),
                ].join("', '")}')`;
                const [rows] = await querySql(sql);
                for (const row of rows) tbl[row.id] = row.name;
                console.table(tbl);
            }
        }

        // console.timeEnd("search index");
        // console.timeEnd("search full");
    }

    return /* no await */ report_commit();
    // return await report_commit();
}

class MetaSearchService extends Extensions {
    /**
     * @param {object} params
     */
    async query(params) {
        //const mem0 = process.memoryUsage();
        const result = await query(params);
        //if (global.gc) gc();
        //const mem1 = process.memoryUsage();
        //console.log({ mem0, mem1, });
        return /* no await */ result;
    }
}

module.exports = MetaSearchService;
