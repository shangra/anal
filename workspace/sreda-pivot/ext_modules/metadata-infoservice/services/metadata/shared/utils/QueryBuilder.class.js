const MetadataClass = require('../../../../../metadata-cmp/services/Metadata.service');

const WhereFormaterClass = require('./WhereFormater.class');
const WhereFormater = new WhereFormaterClass();

const { isNil, uniqueValues } = require('../../../../../utils/services');

/**
 * @typedef {import('../../../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import('../../../../../metadata-cmp/services/Metadata.service').WhereOptions} WhereOptions
 * @typedef {import('../../../../../metadata-connector/services/metadata/Connector.class').Ifrom} Ifrom
 * @typedef {import('../../../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 */

/**
 * Класс для построения SQL запросов, - (from)
 */
class QueryBuilder {
    /**
     * @param {LevelClassI} level
     */
    constructor(level, metadata = MetadataClass) {
        this.levelClass = level;
        this.level = new level();
        this.meta = new metadata();
    }

    /**
     * Формирует тело SQL подзапроса.
     *
     * @param {IConnector} connector - Коннектор
     * @param {string | Ifrom} from - SQL запрос
     * @param {string} tableName - Имя таблицы
     * @param {object} treeObject - Дерево метаданных
     * @param {object} preOptions - Пользовательские опции
     * @param {object} attributesAggr - Функции агрегации
     * @param {{
     *  wheresEntry: Array,
     *  wheresfilter: object,
     *  viewAttributes: Array,
     *  level: number | null,
     *  viewUsersFilters: Array<Object>
     *  } | null} viewParams - Параматры для WHERE VIEW запроса.
     *
     *  @returns {Promise<Ifrom>} - Подзапрос для выборки.
     */
    async getSubQuery(
        connector,
        from,
        tableName,
        treeObject,
        preOptions,
        attributesAggr,
        viewParams = null
    ) {
        preOptions = preOptions ?? { userAttributes: [] };
        preOptions.where = preOptions.where ?? {};

        // Формирует объект для преобразования в WHERE условие
        let where = {};
        attributesAggr.forEach((attr) => {
            if (!Array.isArray(attr) && typeof attr === 'object') {
                where['$or'] ??= {};
                where['$or'][attr.field] = {
                    ['$and']: {
                        ['$ne']: 0,
                        ['$not']: null,
                    },
                };
            }
        });

        const attributes = [];
        preOptions.userAttributes.forEach((fieldName) => {
            // ! в дереве метаданных есть уровни календаря
            if (typeof treeObject.Fields[fieldName] === 'undefined') return;

            const field = treeObject.Fields[fieldName];
            if (field.off) return;
            if (field.virtual) {
                if (!field.calculated) {
                    attributes.push([field.value, fieldName]);
                }
            } else if (field.foreignkey) {
                const foreignkey =
                    typeof field.foreignkey === 'object'
                        ? field.foreignkey.value
                        : field.foreignkey;
                const fkey = treeObject.ForeignKeysGUID[foreignkey];

                attributes.push([fkey.field, fieldName]);
            } else {
                attributes.push(fieldName);
            }
        });

        // Парсим список атрибутов, чтобы достать псевдонимы (Инфосервисы)
        const aliases = attributes.map((attr) => (Array.isArray(attr) ? attr[1] : attr));

        return await this._generateSQLSubQuery(
            connector,
            from,
            preOptions,
            attributes,
            where,
            aliases,
            tableName,
            viewParams
        );
    }

    /**
     * Генерирует подзапрос на основе входных параметров.
     * @param {IConnector} connector - Коннектор.
     * @param {string | Ifrom} from - SQL подзапрос.
     * @param {string} tableName - Имя таблицы.
     * @param {Array} attributes - Список атрибутов.
     * @param {object} preOptions - Пользовательские опции.
     * @param {object} where - Базовые условия.
     * @param {Array} aliases -
     * @param {{
     *      wheresEntry: Array,
     *      wheresfilter: object,
     *      viewAttributes: Array,
     *      viewUsersFilters: Array<Object>,
     *      level: number | null } | null} viewParams - Параматры для WHERE VIEW запроса.
     *
     * @returns - Сгенерированный из вводных подзапрос.
     *
     * @private
     */
    async _generateSQLSubQuery(
        connector,
        from,
        preOptions,
        attributes,
        where,
        aliases,
        tableName,
        viewParams = null
    ) {
        // Импликация VIEW
        if (viewParams) {
            const viewFiltersMap = viewParams.wheresfilter.reduce(
                (map, filter) => ({ ...map, ...filter }),
                {}
            );
            // Итерируем уровень
            attributes = attributes.map((attribute) => {
                if (Array.isArray(attribute)) {
                    if (attribute[0].trim() === '') attribute[0] = `${attribute[1]}__lvl_0`;
                    if (
                        viewParams.level === null ||
                        !viewParams.viewAttributes.includes(attribute[0])
                    )
                        return attribute;

                    const lvlIndexPosition = attribute[0].length - 1;
                    // Установка уровня для атрибута
                    attribute[0] = `${attribute[0].slice(0, lvlIndexPosition)}${
                        viewParams.level + 1
                    }`;

                    return attribute;
                }
                return attribute;
            });

            // Создание клаузы фильтров
            const filtersForDeeperSubQuery = {
                ['$or']: viewParams.viewAttributes.flatMap((attrbute) => {
                    // Извлекаем название структуры без уровней
                    const infoserviceName = attrbute.substring(0, attrbute.indexOf('__lvl_'));
                    // Достаем актуальный для текущего атрибута фильтр
                    const actualFilter = viewFiltersMap[infoserviceName];

                    if (!actualFilter) return [];

                    const param = actualFilter?.['__parent__'] ?? actualFilter;

                    return { [attrbute]: param };
                }),
            };
            filtersForDeeperSubQuery['$or'].push(...viewParams.viewUsersFilters);

            const firstSubQueryAttributes = [...attributes, ...viewParams.viewAttributes];

            // Нижний подзапрос
            let SQLQuery = await connector.findSQL(from, {
                ...preOptions,
                attributes: firstSubQueryAttributes,
                where: filtersForDeeperSubQuery['$or'].length ? filtersForDeeperSubQuery : null,
            });
            // Подзапрос для уровней
            SQLQuery = await connector.findSQL(
                { table: SQLQuery, alias: tableName },
                {
                    ...preOptions,
                    attributes: aliases,
                    where: { ['$or']: viewParams.wheresEntry },
                }
            );
            // Верхний подзапрос
            SQLQuery = await connector.findSQL(
                { table: SQLQuery, alias: tableName },
                { where, attributes: aliases }
            );

            return {
                table: SQLQuery,
                alias: tableName,
            };
        } else {
            // Импликация RECURSIVE и CASE
            let SQLQuery = await connector.findSQL(from, { ...preOptions, attributes });
            SQLQuery = await connector.findSQL(
                { table: SQLQuery, alias: tableName },
                { where, attributes: aliases }
            );

            return {
                table: SQLQuery,
                alias: tableName,
            };
        }
    }

    /**
     * Метод для установки фильтров подполей
     *
     * @param {IConnector} connector - Коннектор.
     * @param {Ifrom} from - SQL подзапрос.
     * @param {object} treeObject - Дерево метаданных.
     * @param {{dictionaryWhere: object, fields: string[] | [string, string][], withView: boolean}} options - Пользовательские опции.
     *
     * @returns {Promise<Ifrom>} - Обновленный SQL подзапрос.
     */
    async setDictionaryWhere(connector, from, treeObject, options) {
        const dictionaryWhere = options.dictionaryWhere;

        let fieldsRes = {};
        const dictionaryFieldsName = Object.keys(dictionaryWhere);
        if (dictionaryFieldsName.length) {
            for (const fieldName of dictionaryFieldsName) {
                const find = await this.getFieldsFromDictionary(
                    treeObject.Refs[fieldName],
                    options.dictionaryWhere[fieldName]
                );

                fieldsRes = { ...fieldsRes, ...find };
            }
        }

        if (!Object.keys(fieldsRes).length) return from;

        const SQL = await connector.findSQL(from, { attributes: options.fields, where: fieldsRes });

        return {
            table: SQL,
            alias: from.alias,
        };
    }

    /**
     * Вспомогательный метод для поиска полей фильтров.
     *
     * @param {{ field: string, subtotal: boolean, ref: {link:string, value: string} | string }} refItem
     * @param {WhereOptions} where
     * @returns
     */
    async getFieldsFromDictionary(refItem, where) {
        const idGuide = typeof refItem.ref === 'object' ? refItem.ref.value : refItem.ref;

        const meta = await this.meta.getInstance(refItem.ref, {}, this.levelClass);

        const [item, treeObject] = await Promise.all([
            meta.getItem(idGuide),
            meta.tableInfo(meta, idGuide),
        ]);

        let pkName = this.getPK(treeObject.Keys) || 'id';
        let parentName = 'parent';

        if (item.manifest.settings.fieldhierarchy) {
            const fieldHierarchy =
                typeof item.manifest.settings.fieldhierarchy === 'object'
                    ? item.manifest.settings.fieldhierarchy.value
                    : item.manifest.settings.fieldhierarchy;
            parentName =
                treeObject?.AllFieldsGUID?.[fieldHierarchy]?.field ||
                treeObject.FieldsGUID?.[fieldHierarchy]?.field; // TODO не поддерживает составные ключи
        }

        const attributes = uniqueValues([pkName, ...Object.keys(where)]);

        const options = {
            attributes,
            where,
            hierarchy: false,
            withOutCount: true,
            withOutRefs: true,
            withChildren: {
                pkName,
                parentName,
            },
        };

        const { rows } = await meta.read(idGuide, options);

        const find = { [refItem.field]: [] };
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            find[refItem.field].push(row[pkName], ...(row.children || []));
        }

        return find;
    }

    /**
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys
     * @returns {string}
     */
    getPK(keys) {
        /** @type {string} */
        let fieldsPK = null;
        Object.keys(keys).forEach((key) => {
            if (keys[key].settings?.primarykey) {
                fieldsPK = Object.keys(keys[key].fields ?? {})[0];
            }
        });

        return fieldsPK;
    }

    /**
     *
     * @param {IConnector} connector
     * @param {Ifrom} from
     * @param {*} treeObject
     * @param {*} options
     * @returns {Promise<{from?: Ifrom, where?: WhereOptions }>}
     */
    async findHierarhyFields(connector, from, treeObject, options) {
        let result = {};
        const flatWhere = WhereFormater.flat(options.where);

        const table = from.alias;

        const fields = {};
        for (const object of flatWhere) {
            Object.keys(object).forEach((fieldName) => {
                if (treeObject.Fields[fieldName]?.hierarchy) {
                    fields[fieldName] ||= [];
                    fields[fieldName].push(object[fieldName]);
                }
            });
        }

        const fieldsRes = {};
        const withMapping = [];

        const fieldsName = Object.keys(fields);
        if (fieldsName.length > 0) {
            for (const fieldName of fieldsName) {
                const parents = fields[fieldName];

                for (const parent of parents) {
                    //TODO Если в этой функции getHierarchyValues будет ошибка процесс не останавливается :(
                    const { newField, sqlWhere, withOption } = await this.getHierarchyValues(
                        treeObject.Refs[fieldName],
                        table,
                        fieldName,
                        connector,
                        parent,
                        options.systemWhere[fieldName]?.['__parent__'] ??
                            options.systemWhere[fieldName]
                    );

                    if (!withOption) {
                        if (!fieldsRes[fieldName]) fieldsRes[fieldName] = {};
                        fieldsRes[fieldName][parent] = { field: newField, where: sqlWhere };
                    } else {
                        withMapping.push(fieldName);
                    }
                }
            }
        }

        if (Object.keys(fieldsRes).length > 0) {
            let notNull = [];
            let attributes = options.attributes.map((attribute) => {
                if (!Array.isArray(attribute) && typeof attribute === 'object' && attribute.field) {
                    notNull.push(attribute.field);
                    return attribute.field;
                }
                return Array.isArray(attribute) ? attribute[1] : attribute;
            });

            let newWhere = WhereFormater.replace(options.where, fieldsRes);
            if (notNull.length > 0) {
                newWhere['$or'] = [];
                notNull.forEach((field) => newWhere['$or'].push({ [field]: { $ne: null } }));
            }

            newWhere = WhereFormater.clear(newWhere, withMapping);
            newWhere = WhereFormater.normalize(newWhere);

            const SQL = await connector.findSQL(from, { attributes: attributes, where: newWhere });

            const exportWhere = WhereFormater.delete(options.where, fieldsRes);

            result = {
                from: { table: SQL, alias: table },
                where: exportWhere,
            };
        }

        return result;
    }

    /**
     * Собирает иерархию значений.
     *
     * @param {object} refItem
     * @param {string} table - SQL запросы
     * @param {string} attribute - Имя атрибута
     * @param {IConnector} connector - Коннектор
     * @param {string | WhereOptions} parent
     * @param {string | WhereOptions} nid
     *
     * @returns
     */
    async getHierarchyValues(
        refItem,
        table,
        attribute,
        connector,
        parent = null,
        nid = null,
        from
    ) {
        let sqlWhere = {};
        let withOption = null;

        // Берется id для инфосервиса справочников
        const idGuide = typeof refItem.ref === 'object' ? refItem.ref.value : refItem.ref;

        const meta = await this.meta.getInstance(refItem.ref, {}, this.levelClass);

        const [item, treeObject] = await Promise.all([
            meta.getItem(idGuide),
            meta.tableInfo(meta, idGuide),
        ]);

        const { connector: hierarchyConnector } = await this.level.getConnector(item);

        const isSameConnector =
            refItem.SQLQueryFormat === 'useWith' ||
            (refItem.useWith && connector.dbhash === hierarchyConnector.dbhash);
        const isView =
            refItem.SQLQueryFormat === 'useView' ||
            (refItem.useView && connector.dbhash === hierarchyConnector.dbhash);

        if (!isSameConnector && !parent) {
            parent = nid;
        }

        const {
            hierarchy: isHeirarchy,
            fieldhierarchy,
            fieldhierarchydefault,
        } = item?.manifest?.settings || {};

        const pkName = this.getPK(treeObject.Keys) || 'id';
        let parentName = 'parent';

        if (fieldhierarchy) {
            const fieldHierarchy =
                typeof fieldhierarchy === 'object' ? fieldhierarchy.value : fieldhierarchy;

            parentName =
                treeObject?.AllFieldsGUID?.[fieldHierarchy]?.field ||
                treeObject.FieldsGUID?.[fieldHierarchy]?.field; // TODO не поддерживает составные ключи
        }

        /** @type {WhereOptions} */
        let parentFilter = { $is: null };
        if (!isNil(fieldhierarchydefault)) {
            parentFilter = { $eq: fieldhierarchydefault };
        }

        if (!isNil(parent)) {
            parentFilter = /** @type {WhereOptions} */ (parent);
        }

        const attributes = isHeirarchy ? [pkName, parentName] : [pkName];
        const where = isHeirarchy ? { [parentName]: parentFilter } : { [pkName]: parentFilter };

        const qoptions = {
            attributes,
            where,
            group: attributes,
            withOutCount: true,
            withOutRefs: true,
            hierarchy: true,
        };

        if (!isSameConnector && refItem.subtotal) {
            qoptions.withChildren = {
                pkName,
                parentName,
            };
        }

        const { rows, query } = await meta.read(idGuide, qoptions); // Извлечение данных(ходит за данными в справоник) id первого уровня

        let viewOptions;

        if (isView) {
            const ids = rows.map((row) => row[pkName]);
            // TODO  возможно стоит пересмотреть получение уровней, так как сейчас это дополнительный запрос к СУБД
            const lvlsOfAttribute = await this.getLevelsForAttribute(attribute, table, connector);

            viewOptions = {
                ...lvlsOfAttribute.reduce((result, field) => {
                    result[field] = ids;

                    return result;
                }, {}),
            };
        }
        let sqlField;
        /** @type {string | string[]} */
        let newField = attribute;
        if (!isSameConnector) {
            // Запрос через CASE
            if (refItem.subtotal && rows.length > 0) {
                const params = this.transformPK(rows, table, attribute, pkName, parentName, parent);
                sqlField = params.sqlField;
                sqlWhere = params.sqlWhere;
                newField = [sqlField, attribute];
            }
        } else {
            // Рекурсивный запрос
            withOption = await hierarchyConnector.generateRecursive({
                table: { table: query + ';' },
                fields: {
                    pkName,
                    parentName,
                },
                nparentid: nid,
                nid: parent,
            });
        }

        const newWhere = {};
        if (Array.isArray(attribute)) {
            newWhere[`$sql(${attribute[0]})`] = rows.map((row) => row[pkName]);
        } else {
            newWhere[attribute] = uniqueValues(
                rows.filter((i) => i[pkName] !== nid).map((row) => row[pkName])
            );
        }

        if (!rows.length) {
            sqlWhere = [parentFilter];
        }

        const newWhereWithParent = structuredClone(newWhere);

        if (!newWhereWithParent.length) {
            newWhereWithParent[attribute].push(parent);
        }
        const queryOptions = { withOption, viewOptions };

        return {
            newField,
            newWhere,
            parent: parent || nid,
            newWhereWithParent,
            sqlWhere,
            queryOptions,
            withOption,
        };
    }

    /**
     * Достает список уровней атрибута (Используется в имплиментации представления).
     *
     * @param {string} attribute - Название аттрибута.
     * @param {string} tableName - Название таблицы.
     * @param {IConnector} connector - Коннектор.
     *
     * @returns { Promise<Array<string>> } - Cписок уровней для аттрибута.
     */
    async getLevelsForAttribute(attribute, tableName, connector) {
        // Такой формат аргументов, потому что коннектор предоставляет кастомный метод со своей сигнатурой и потенциальными ошибками.
        const data = await connector.findAll(tableName, {
            limit: 1,
            attributes: ['*'],
            where: null,
        });
        const columnNames = Object.keys(data[0]).filter((columnName) => {
            const startPosition = columnName.indexOf(attribute);
            const lvlPosition = columnName.indexOf('__lvl_');

            return startPosition >= 0 && lvlPosition > 0;
        });

        return columnNames;
    }

    /**
     * @param {object[]} rows
     * @param {string} table
     * @param {string} attribute
     * @param {string} namePK
     * @param {string} parentName
     * @returns {{ sqlField: string, sqlWhere: string[] }}
     */
    transformPK(rows, table, attribute, namePK, parentName, parent) {
        //
        let result = "'' ";
        /** @type {string[]} */
        let resultWhere = [];

        if (!rows.length) {
            return { sqlField: result, sqlWhere: resultWhere };
        }

        let sql_select = `CASE `;

        /** @type { Record<string, string[]> } */
        const mapping = {};

        let type = 'string';

        rows.forEach((row) => {
            const childs = mapping[row[namePK]] || [];

            childs.push(
                // row[namePK],
                ...row.children
            );

            resultWhere = [].concat(
                resultWhere,
                row[parentName],
                row.children?.length ? row.children : row[namePK]
            );

            /**
             * если вы хотите боли - раскомментируйте строчки ниже
             */

            // if (!isNil(parent)) {
            //     resultWhere.push(parent);
            //     childs.push(parent);
            // }

            mapping[row[namePK]] = childs;

            type = typeof row[namePK];
        });

        for (const key in mapping) {
            /** @type {string | string[]} */
            let childs = mapping[key];

            if (!childs.length) continue;

            if (typeof childs[0] === 'string') {
                childs = `'${childs.join("','")}'`;
            } else {
                childs = childs.join(',');
            }

            const then = type === 'string' ? `'${key}'` : key;
            sql_select += ` WHEN "${table}"."${attribute}" IN (${childs}) THEN ${then} `;
        }

        result = sql_select += `END`;

        return { sqlField: result, sqlWhere: uniqueValues(resultWhere) };
    }

    /**
     * @param {IConnector} connector
     * @param {Ifrom} from
     * @param {*} options
     * @returns
     */
    async setMetaAccessWhere(connector, from, options) {
        const metaAccessWhere = options.metaAccessWhere;

        if (!Object.keys(metaAccessWhere ?? {}).length) {
            return from;
        }

        const SQL = await connector.findSQL(from, {
            attributes: options.fields,
            where: metaAccessWhere,
        });

        return {
            table: SQL,
            alias: from.alias,
        };
    }
}

module.exports = QueryBuilder;
