const Extensions = require('../../../core/class/Extensions.class');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const RlsCoreService = require('../../rls-core/services/RlsCore.service');
const sequelize = require('../../../core/db/connection');
const db = { sequelize };

const MemorySave = require('../../../core/services/memory-save');

const RlsCore = new RlsCoreService();
const Metadata = new MetadataClass();

const ALL_READ = '90499885-ae60-440b-a59f-cfd3958110cd';
const ALL_WRITE = '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6';

const schema = sreda.env.DB_SCHEMA;

class RlsExtSyncService extends Extensions {
    async dropBefore(innerResult, functionParams) {
        await this.drop(innerResult, functionParams);

        return innerResult;
    }

    async syncAfter(innerResult, functionParams) {
        this.sync(innerResult, functionParams);

        return innerResult;
    }

    formAfter(innerResult) {
        innerResult.form ||= [];

        innerResult.form.push({
            name: 'rls',
            description: 'Включить RLS на таблице',
            type: 'BOOL',
            default: false,
        });

        return innerResult;
    }

    async readBefore(innerResult, functionParams) {
        const { id } = functionParams;

        const { rls, table } = await this.getRlsAndTable(id);

        functionParams.options ||= {};
        functionParams.options.rls = rls;
        functionParams.options.table = table;

        return innerResult;
    }

    /**
     * @private
     * @param {string} id
     */
    async getRlsAndTable(id) {
        const key = `rls_table_metadata_id:${id}`;

        const cache = await MemorySave.get(key);

        if (cache) return cache;

        const item = await Metadata.getItem(id);

        const { rls, table } = item.manifest.settings;

        MemorySave.set(key, { rls, table });

        return { rls, table };
    }

    /**
     * @private
     * @param {*} _
     * @param {{ id: string }} functionParams
     */
    async drop(_, functionParams) {
        const tableId = functionParams.id;
        const item = await Metadata.getItem(tableId);
        const { table } = item?.manifest?.settings;
        if (table) {
            await Promise.all([this.dropView(item)]); //this.clearRls(item),  -- по чистой случайности, это пока не дропнуло все RLS записи по таблице метаданных, нужно переосмыслить вцелом RLS для метаданных
        }
    }

    /**
     * @private
     */
    async sync(_, functionParams) {
        const tableId = functionParams.id;

        const item = await Metadata.getItem(tableId);

        if (!item || !this.isRlsOn(item)) {
            return this.clearRls(item);
        }

        await this.clearRls(item);

        await Promise.all([this.addRls(item), this.createView(item)]);
    }

    /**
     * очистить рлс по таблице
     *
     * @private
     */
    async clearRls(item) {
        if (!item) return;

        const { table } = item.manifest.settings;

        await RlsCore.delAllPermissions(table);
    }

    /**
     * @private
     * @param {*} item
     * @returns
     */
    async addRls(item) {
        if (!item || !item.manifest.settings.rls) return;

        const { table } = item.manifest.settings;

        const connector = await this.getConnect(item);

        this.recursiveAddRls(connector, table);
    }

    async recursiveAddRls(connector, table, limit = 1000, offset = 0) {
        /** @type {{id: string}[]} */
        const ids = (
            await connector.findAll(table, {
                attributes: ['id'],
                offset,
                limit,
            })
        ).map(({ id }) => id);

        if (!ids.length) {
            return;
        }

        await Promise.all([
            RlsCore.addPermissions(table, ids, 'read', 'rules', ALL_READ),
            RlsCore.addPermissions(table, ids, 'view', 'rules', ALL_READ),
            RlsCore.addPermissions(table, ids, 'write', 'rules', ALL_WRITE),
        ]);

        setTimeout(
            () =>
                this.recursiveAddRls(
                    connector,
                    table,
                    limit,
                    offset + ids.length
                ),
            0
        );
    }

    /**
     * @private
     * @param {*} item
     * @returns
     */
    async getConnect(item) {
        const connectorId = item.manifest.settings.connector;

        const Connector = new ConnectorClass();
        const { connector } = await Connector.getConnector(connectorId.value);

        return connector;
    }

    /**
     * @private
     * @param {*} item
     * @returns
     */
    async dropView(item) {
        const { table } = item.manifest.settings;

        const sql = `DROP VIEW IF EXISTS "${schema}"."RlsMetadata_${table}";`;

        await db.sequelize.query(sql);
    }

    /**
     * @private
     * @param {*} item
     * @returns
     */
    async createView(item) {
        const { table } = item.manifest.settings;

        const connector = await this.getConnect(item);

        const sql = `
        CREATE OR REPLACE VIEW "${schema}".RlsMetadata_${table} AS (
            SELECT
                   id,
                   (
                          SELECT
                                 COALESCE(
                                        jsonb_agg(row_to_json(descendants_table.*)),
                                        '[]' :: jsonb
                                 ) AS "coalesce"
                          FROM
                                 "${schema}".get_metadata_descendants("${table}".id::UUID) descendants_table(id)
                   ) AS descendants,
                   (
                          SELECT
                                 COALESCE(
                                        jsonb_agg(row_to_json(ancestors_table.*)),
                                        '[]' :: jsonb
                                 ) AS "coalesce"
                          FROM
                                "${schema}".get_metadata_ancestors("${table}".id::UUID) ancestors_table(id)
                    ) AS ancestors FROM 
            "${connector.Model.schema}"."${table}" "${table}"
        )`;

        await db.sequelize.query(sql);
    }

    /**
     * @private
     * @param {*} item
     * @returns
     */
    isRlsOn(item) {
        return item.manifest?.settings?.rls;
    }
}

module.exports = RlsExtSyncService;
