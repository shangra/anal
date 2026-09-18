const { uniqueValues, isNil, toJSON, isEmptyObject } = require('../../utils/services');

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');

//types
/**
 * @typedef {import('./types').IRow} IRow
 * @typedef {import('./types').IFilterResult} IFilterResult
 * @typedef {import('../../../db/rls/types/WhereOptions').TField} TField
 * @typedef {import('../../metadata-cmp/db/models/metadata').IMetadata} IMetadata
 * @typedef {import('../../metadata-connector/services/metadata/Connector.class').Ifrom} Ifrom
 * @typedef {import('../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 */

const lAttr = '__level__';
const defaultAttributes = ['_id', '_path', '_v', lAttr];
const groupAttributes = ['_path', '_v', lAttr];

const DEFAULT_MAX_LEVELS = 10;

class FilterService {
    /**
     * @public
     *
     * @param {string} id
     */
    async getLevels(id) {
        const meta = await Metadata.getParentInstance(id);

        const [item, tableInfo] = await Promise.all([meta.getItem(id), meta.tableInfo(meta, id)]);

        const hierarchy = item?.manifest?.settings?.hierarchy;

        if (!hierarchy) return [];

        const { Hierarchy } = tableInfo;

        if (!Hierarchy) {
            const levels = [];
            for (let i = 0; i < DEFAULT_MAX_LEVELS; i++) {
                levels.push({
                    level: i,
                    name: `Уровень ${i + 1}`,
                    description: `Уровень ${i + 1}`,
                });
            }

            return levels;
        }

        const levels = [];
        for (const key in Hierarchy || {}) {
            const value = Hierarchy[key];

            levels.push({
                level: value.settings.level,
                name: value.name,
                description: value.description,
            });
        }

        levels.sort((a, b) => a.level - b.level);

        return levels.map((i, index) => {
            i.level = index;
            return i;
        });
    }

    /**
     * @param {{ id: string, level: number, where: object, parent?: string, name?: string, limit?: number, offset?: number }} data
     * @returns {Promise<IFilterResult[]>}
     */
    async filter(data) {
        const { id, level, parent, name, where: swhere, limit, offset } = data;

        const meta = await Metadata.getParentInstance(id);

        const item = await meta.getItem(id);
        const tableInfo = await meta.tableInfo(meta, id);
        // @ts-ignore
        const { IdField, ParentField, ViewField, fieldhierarchydefault } =
            await meta.getHierarchySettings(id, tableInfo);

        const where = { ...swhere };

        if (name) {
            where[this.getField(ViewField)] = { ['$iLike']: name };
        }

        if (!name && isEmptyObject(swhere || {})) {
            if (parent && ParentField) {
                where[this.getField(ParentField)] = parent;
            }

            if (!parent && ParentField) {
                where[this.getField(ParentField)] = fieldhierarchydefault;
            }

            return this.getPlainRows({
                name,
                IdField,
                ViewField,
                where,
                item,
                meta,
                id,
                limit,
                offset,
            });
        }

        if (parent) {
            where[this.getField(ParentField)] = parent;
        }

        const attributes = [
            this.getField(IdField),
            this.getField(ParentField),
            this.getField(ViewField),
        ];

        const { preQuery: query } = await meta.query(id, { attributes, group: attributes });

        const { connector } = await this.getConnector(item);

        const sql = await connector.findSQL(query, { attributes, group: attributes });

        query.table = sql;

        const levelMeta = this.getLevelParams(parent, name, level);

        const from = await this.generateILikeSQL({
            id,
            from: query,
            connector,
            levelMeta,
            options: { where },
            parentField: this.getField(ParentField),
            primaryKey: this.getField(IdField),
            viewKey: this.getField(ViewField),
            fieldhierarchydefault,
        });

        /** @type {IRow[]} */
        const rows = await connector.findAll(from, {
            attributes: [...groupAttributes],
            group: [...groupAttributes],
            order: groupAttributes.map((i) => [i, 'DESC']),
            limit,
            offset,
        });

        return this.parseRows(rows);
    }

    /**
     * @private
     *
     * @param {IRow[]} rows
     */
    parseRows(rows) {
        /** @type {Record<string, IFilterResult>} */
        const idMapping = {};

        if (!rows?.length) return null;

        /** @type {Record<string, IRow[]>} */
        const childrenMap = {};

        for (const row of rows) {
            const [id] = row._path;
            const [name] = row._v;

            /** @type {IRow} */
            const lrow = {
                _path: row._path.slice(1),
                _v: row._v.slice(1),
            };

            idMapping[id] ||= { id, name, description: name, children: [] };

            if (lrow._path.length) {
                childrenMap[id] ||= [];
                childrenMap[id].push(lrow);
            }
        }

        for (const id in idMapping) {
            const value = idMapping[id];

            const children = this.parseRows(childrenMap[id]);

            if (children) value.children = children;
        }

        return Object.values(idMapping);
    }

    /**
     * @private
     *
     * @param {{ field: string }} item
     * @returns {string}
     */
    getField(item) {
        return item.field;
    }

    /**
     * @private
     *
     * получить коннектор
     * @param {IMetadata} item
     * @returns {Promise<{ connector: IConnector, connectorData: object }>}
     */
    async getConnector(item) {
        let connectorId = item.manifest.settings.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }

    /**
     * @private
     *
     * мутируем `from` для того что делать грубокую фильтрацию
     * @param {Object} param0
     * @param {string} param0.id
     * @param {{ start: number, end: number }} [param0.levelMeta]
     * @param {Ifrom} param0.from
     * @param {IConnector} param0.connector
     * @param {object} param0.options
     * @param {boolean} [param0.options.hierarchy]
     * @param {object} param0.options.where
     * @param {number} [param0.options.level]
     * @param {string} param0.parentField
     * @param {string} param0.primaryKey
     * @param {string} param0.viewKey
     * @param {object} param0.fieldhierarchydefault
     *
     * @returns {Promise<Ifrom>}
     */
    async generateILikeSQL({
        id,
        from,
        levelMeta,
        connector,
        options,
        parentField,
        primaryKey,
        viewKey,
        fieldhierarchydefault,
    }) {
        const { hierarchy, where, level } = options;

        // проверим что иерархия включена
        if (!isNil(hierarchy) && !hierarchy) return from;

        // ================ возьмем условие по паренту и выставим его в качестве основного фильтра ==============================
        // const parentWhere = {};
        // where?.[parentField] && (parentWhere[parentField] = structuredClone(where[parentField] ?? {}));
        // where?.[primaryKey] && (parentWhere[primaryKey] = structuredClone(where[primaryKey] ?? {}));

        const parentWhere = [];
        where?._parent && parentWhere.push(...where._parent);
        where?._id && parentWhere.push({ ['$or']: where._id });

        delete where[parentField];
        delete where[primaryKey];
        delete where._parent;
        delete where._id;
        // ================ возьмем условие по паренту и выставим его в качестве основного фильтра ==============================

        const fieldsWhere = structuredClone(options.where ?? {});

        // изначальный запрос
        const { table } = from;

        const tableCte = `cte as (${table.replace(';', '')})`;

        // запрос генерации рекурсия для углубленного поиска по элементам
        const recurSql =
            (await connector.generateRecursive({
                parentFilter: fieldhierarchydefault,
                withAttributes: defaultAttributes,
                fieldsWhere,
                where: { ['$and']: parentWhere },
                fields: {
                    parentName: parentField,
                    pkName: primaryKey,
                    viewName: viewKey,
                },
                table: { table: 'select * from cte;' },
                level,
            })) + ';';

        /** @type {(string | [string, string])[]} */
        let attrs = ['_path', '_v', lAttr, '_id'];
        if (levelMeta) {
            const { start, end } = levelMeta;

            attrs = [
                [`_path[${start}:${end}]`, '_path'],
                [`_v[${start}:${end}]`, '_v'],
                lAttr,
                '_id',
            ];
        }

        const recurCte = `recurCte as (${recurSql.replace(';', '')})`;

        from = await connector.generateFrom(
            { table: 'select * from recurCte', alias: 'recurCte' },
            { options: { attributes: attrs } }
        );

        const union = connector.union({
            withOptions: [
                { sql: tableCte, name: 'cte' },
                { sql: recurCte, name: 'recurCte' },
            ],
            sqls: [from],
        });

        return { alias: 'likeCte', table: union };
    }

    /**
     * получить срез массива
     *
     * @private
     *
     * @param {string} parent
     * @param {string} name
     * @param {number} level
     * @returns
     */
    getLevelParams(parent, name, level) {
        let start = 0;
        let end = level + 1;

        if (parent && name) {
            start = end;
        }

        return { start, end };
    }

    /**
     * @private
     *
     * @param {*} param0
     * @returns
     */
    async getPlainRows({ name, IdField, ViewField, where, item, meta, id, limit, offset }) {
        const attributes = [
            [IdField.field, 'id'],
            [ViewField.field, 'name'],
        ];
        const group = [IdField.field, ViewField.field];

        if (name) {
            const field = ViewField.field;
            const param = { $iLike: name };

            where[ViewField.field] = where[ViewField.field]
                ? { ['$and']: [where[field], param] }
                : param;
        }

        const { query } = await meta.query(id, { attributes: group, group, where });

        const { connector } = await this.getConnector(item);

        /** @type {IFilterResult[]} */
        const rows = await connector.findAll(query, { attributes, limit, offset, group });

        return this.addChildren(rows);
    }

    /**
     * @private
     *
     * @param {*} rows
     * @returns
     */
    addChildren(rows) {
        return rows.map((row) => {
            row.children ||= [];
            return row;
        });
    }
}

module.exports = FilterService;
