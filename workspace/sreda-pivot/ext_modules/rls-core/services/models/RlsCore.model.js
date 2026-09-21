const { Op } = require('sequelize');
const { Rls } = require('../../../../core/db/rls/rls');
const { RLSManager } = require('../../../../core/db/rls/RLSManager');

class RlsCoreModel {
    static async getPermissions(options) {
        return Rls.findAll(options);
    }

    static async getTableName(tableName, options = {}) {
        const { transaction } = options;
        const item = await Rls.findOne({
            attributes: ['table_name'],
            raw: true,
            where: { table_name: { [Op.iLike]: tableName } },
            transaction,
        });
        return item?.table_name;
    }

    // static async createPermission(data) {
    //     return Rls.create(data)
    // }

    static async createPermissions(data, options = {}) {
        const { transaction } = options;
        if (transaction) {
            transaction.afterCommit(() => {
                RLSManager.dbversion++;
            });
        }
        return Rls.bulkCreate(data, { transaction }).then((results) => {
            // TODO: Этого здесь быть не должно!!!
            if (!transaction) {
                RLSManager.dbversion++;
            }
            return results;
        });
    }

    static async delPermission(options) {
        const { transaction } = options;
        if (transaction) {
            transaction.afterCommit(() => {
                RLSManager.dbversion++;
            });
        }
        return Rls.destroy(options).then((results) => {
            // TODO: Этого здесь быть не должно!!!
            if (!transaction) {
                RLSManager.dbversion++;
            }
            return results;
        });
    }

    static async getTableIdPermissions(table_id, table_name, options = {}) {
        if (table_id == null || table_id === '') {
            return [];
        }
        const { transaction } = options;
        return Rls.findAll({
            where: {
                table_id,
                table_name,
            },
            transaction,
        });
    }
}

module.exports = RlsCoreModel;
