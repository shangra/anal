// const MetadataClass = require('../../Metadata.service');
// const Metadata = new MetadataClass();
const MetaDumpDBServiceClass = require('../../../../meta-dumpdb/services/MetaDumpDB.service.js');

const ConnectorClass = require('../../../../metadata-connector/services/metadata/Connector.class');

const FSCK = require('../../../../meta-fsck');


const SelectableMixin = {
    async * fsck_self(self, opts) {

        let skip_read_test = opts.skip_read_test ?? false;

        const path = FSCK.path_meta(opts?.path, self.id, this?.constructor?.name, self.name);

        const self_settings = self?.manifest?.settings;

        yield FSCK.assert(path, `Объект метаданных содержит ожидаемую структуру (manifest.settings)`,
            self_settings && ("object" == typeof self_settings), true,
            { self }
        );

        const { connector, connectorData } = await this.getConnector(self);
        try {
            yield* (new ConnectorClass()).fsck_self(connectorData, { ...opts, path });
        }
        catch (error) {
            // (фатальная) ошибка при проверке коннектора не препятствует проведению остальных проверок
            // рапортуем и идём дальше
            yield error;
            skip_read_test = true;
        }

        const self_settings_table = String(self_settings.table || "").trim();       // имя физической таблицы (или view, разумеется)
        const self_settings_sqlalias = String(self_settings.sqlalias || "").trim(); // "сложный запрос" (по факту, это "inline view")
        let self_settings_filter = String(self_settings.filter || "").trim();       // настройки "фильтра"

        let alias_cur = null;
        const has_phys = !!self_settings_table.length;                     // есть физ. таблица/view
        const has_view = !!self_settings_sqlalias.length;                  // есть настроенный "сложный запрос"


        yield FSCK.assert(path, `В настройках метаданных есть физическая таблица или сложный запрос`,
            has_phys || has_view, true,
            { self }
        );

        if (has_view) {
            // физическая таблица при наличии "сложного запроса" используется как алиас для этого запроса
            // вообще непонятно, что должно быть ошибкой: отсутствие этого алиаса или его наличие;
            // зачем это вообще именно так работает -- только вносит неразбериху
            // так что просто сообщаем о выбранном режиме
            yield FSCK.info(path, `Алиас "сложного запроса"`,
                has_phys ? self_settings_table : null, null,
                { self }
            );

            alias_cur = "_view";
        }
        else if (has_phys) {
            alias_cur = "_phys";
        }

        // готовим "фильтр"
        if (self_settings_filter.length) {
            let fail = null;
            try {
                self_settings_filter = JSON.parse(self_settings_filter);
            }
            catch (error) {
                fail = error;
                //console.error(error);
                //throw new FSCKStop(`Свойство "Фильтр" объекта метаданных не является корректным JSON (manifest.settings.filter)`, { self, error });
            }
            yield FSCK.assert(path, `Нет ошибки при обработке свойства "Фильтр" как JSON (manifest.settings.filter)`,
                fail, null,
                { self }
            );

            yield FSCK.assert(path, `Свойство "Фильтр" объекта метаданных содержит ожидаемую структуры (manifest.settings.filter должен быть объектом)`,
                "object" == typeof self_settings_filter, true,
                { self }
            );
        }
        else {
            // @ts-ignore
            self_settings_filter = {};
        }

        const filter_keys_ignore = ["hierarchy"];
        for (const key of filter_keys_ignore) {
            if (!FSCK.is.hop(key)(self_settings_filter)) continue;
            delete self_settings_filter[key];
        }

        const has_filt = !![...Object.keys(self_settings_filter)].length;  // есть настройки "фильтра", подлежащие применению
        yield FSCK.info(path, `Наличие применяемого "фильтра"`,
            has_filt,
            { self }
        );

        if (has_filt) {
            // if (DDLCFG_TRACK_SEQUELIZE_TRANSFORM) sql_with.push_log('/* ' + mklog.TECH(`_filt orig:\n` + _inspect(model_settings_filter)) + ' */');
            // const cte_underlying_alias = sql_with.alias_cur; // на чём именно работает "фильтр" -- на сложном запросе или физической таблице

            // let sql;
            // try {
            //     const applied_filter = await rebuild_sequelize(model_settings_filter, connector, DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS);
            //     if (DDLCFG_TRACK_SEQUELIZE_TRANSFORM) sql_with.push_log('/* ' + mklog.TECH(`_filt @${JSON.stringify(DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS)}:\n` + _inspect(applied_filter)) + ' */');
            //     sql = mksql_select(cte_underlying_alias, applied_filter);
            // }
            // catch (error) {
            //     throw new DDLStop(`Не удалось обработать "Фильтр" с помощью sequelize (method: ${JSON.stringify(DDLCFG_SUPPORT_SEQUELIZE_SYMBOLS)})`, { id, model, error, model_settings_filter });
            // }
            // sql_with.push_sql({ deps: [cte_underlying_alias], alias: "_filt", sql });
            alias_cur = "_filt";
        }

        // в этом слое -- полный набор (физических/подлежащих) данных с учётом "фильтра", если он есть
        // но здесь ещё нет виртуальных полей
        const cte_base_alias = alias_cur;

        yield FSCK.info(path, `Источник данных для формирования полей`,
            cte_base_alias,
            { self }
        );

        // if (DDLCFG_TRACK_LAYER_FIELDS) {
        //     const cte_alias = cte_base_alias;
        //     try {
        //         const fields = await sql_with.extract_fields(querySql, cte_alias);
        //         sql_with.push_log(mklog.TECH(`${cte_alias} discovered fields[${fields.length}]: ${JSON.stringify(fields)}`));
        //     }
        //     catch (error) {
        //         throw new DDLStop(`Не удалось выполнить проверочный запрос полей на слое ${cte_alias}`, { id, model, error });
        //     }
        // }
        // if (DDLCFG_TRACK_LAYER_COUNTS) {
        //     const cte_alias = cte_base_alias;
        //     const sql = sql_with.commit() + `SELECT COUNT(*) as "count" FROM ${escid(cte_alias)}`;
        //     try {
        //         const [rows, result_metadata] = await querySql(sql);
        //         //console.log(rows, result_metadata);
        //         const count = rows?.[0]?.count ?? "(unknown)";
        //         sql_with.push_log(mklog.INFO(`${cte_alias} count(*) = ${count}`));
        //     }
        //     catch (error) {
        //         throw new DDLStop(`Не удалось выполнить проверочный запрос количества элементов на слое ${cte_alias}`, { id, model, error });
        //     }
        // }

        if (skip_read_test) {
            yield FSCK.tell(path, `Тестирование реального чтения данных не проводилось`,
                { self },
                { type: "warn" }
            );
        }
        else {
            let fail = null;
            try {
                const r = await this.read(self.id, { limit: 10 });
            }
            catch (error) {
                fail = error;
            }
            yield FSCK.check(path, `Нет ошибки при тестовом чтении данных`,
                fail, FSCK.is.not_error,
                { self },
                { failtype: "fail" }
            );
        }

        const MetaDumpDBService = new MetaDumpDBServiceClass();
        if (1) {
            let fail = null;
            try {
                const r = await MetaDumpDBService.dumpdb(self.id);
            }
            catch (error) {
                fail = error;
            }
            yield FSCK.check(path, `Нет ошибки при выгрузке слепка метаданных`,
                fail, FSCK.is.not_error,
                { self },
                { failtype: "fail" }
            );
        }
        // if (1) {
        //     let fail = null;
        //     try {
        //         const r = await MetaDumpDBService.dumpWithRefs(self.id);
        //     }
        //     catch (error) {
        //         fail = error;
        //     }
        //     yield FSCK.check(path, `Нет ошибки при выгрузке слепка метаданных со ссылками`,
        //         fail, FSCK.is.not_error,
        //         { self },
        //         { failtype: "fail" }
        //     );
        // }
    },
};

module.exports = SelectableMixin;
