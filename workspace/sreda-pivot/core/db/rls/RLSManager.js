const httpContext = require('../../services/http-context');
const { Op, literal } = require('sequelize');

const { Rls } = require('./rls');

const RLS_TYPE_READ = 'read';
const RLS_TYPE_WRITE = 'write';
const RLS_TYPE_DELETE = 'delete';
const RLS_TYPE_VIEW = 'view';

/** @typedef {import('./DB')} DB */

/**
 * @import { FindOptions } from './types/Options'
 * @import { DBStatic } from './types'
 * @import { CreationAttributes, Attributes } from 'sequelize'
 * @import { Fn, Col, Literal } from 'sequelize/types/utils'
 */

/**
 * @class RLSManager
 */
class RLSManager {
    static dbversion = 0n;

    /**
     * @private
     * @param {DBStatic<DB>} model
     */
    Model;

    /**
     * @public
     */
    user = {
        id: '00000000-0000-0000-0000-000000000000',
        rules: {
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                name: 'AllRead',
                details: 'AllRead',
            },
        },
    };

    /**
     * @constructor
     * @param {DBStatic<DB>} Model
     */
    constructor(Model) {
        this.Model = Model;

        const sessionStorage = httpContext.get('sessionStorage');
        if (sessionStorage?.user) {
            this.user = Object.assign(
                {},
                this.user,
                JSON.parse(JSON.stringify(sessionStorage.user))
            );
        }
    }

    /**
     * @public
     * @template {DB} M
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    getFindOptions(options = {}) {
        const localOptions = { ...options };

        const attributes = this.Model.getAttributes();
        if (typeof attributes.code !== 'undefined') {
            if (
                typeof localOptions.order === 'undefined' &&
                typeof localOptions.group === 'undefined' &&
                ((typeof localOptions.attributes === 'object' &&
                    !Array.isArray(localOptions.attributes) &&
                    localOptions.attributes?.include?.includes('code')) ||
                    (Array.isArray(localOptions.attributes) &&
                        localOptions.attributes.includes('code')))
            ) {
                localOptions.order = [['code', 'ASC']];
            }
        }

        if (typeof attributes.markdel !== 'undefined') {
            if (typeof localOptions.where === 'undefined') {
                localOptions.where = {};
            }
            if (typeof localOptions.where.markdel === 'undefined') {
                localOptions.where.markdel = 0;
            }
        }

        if (localOptions.all !== true) {
            // ограничим вывод полей для безопасности
            if (localOptions.attributes === undefined) {
                // и нет указанных полей
                const blacklist = [
                    'createdUser',
                    'updatedUser',
                    'createdAt',
                    'updatedAt',
                    'markdel',
                    'password',
                    'write',
                    'read',
                    'view',
                    'delete',
                ];

                localOptions.attributes = Object.keys(attributes).filter(
                    (a) => blacklist.indexOf(a) === -1
                );
            }
        }

        return localOptions;
    }

    /**
     * @public
     * @template {DB} M
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    getCountOptions(options = {}) {
        const localOptions = { ...options };

        const attributes = this.Model.getAttributes();
        if (typeof attributes.markdel !== 'undefined') {
            if (!localOptions.where) {
                localOptions.where = {};
            }
            if (typeof localOptions.where.markdel === 'undefined') {
                localOptions.where.markdel = 0;
            }
        }

        return localOptions;
    }

    /**
     * @template {DB} M
     * @overload
     * @param {CreationAttributes<M>} values
     * @param {"insert"} type
     * @returns {CreationAttributes<M>}
     */
    /**
     * @template {DB} M
     * @overload
     * @param {{ [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal }} values
     * @param {"update"} type
     * @returns {{ [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal }}
     */
    /**
     * @template {DB} M
     * @public
     * @param {CreationAttributes<M> | { [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal }} values
     * @param {"insert" | "update"} [type]
     * @returns {CreationAttributes<M> | { [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal }}
     */
    getValues(values = {}, type) {
        const localValues = { ...values };

        const attributes = this.Model.getAttributes();
        if (type === 'insert') {
            if (attributes.createdUser !== undefined) {
                localValues.createdUser =
                    localValues.createdUser === undefined
                        ? this.user.id
                        : localValues.createdUser;
            }
        }
        if (type === 'update') {
            if (attributes.updatedUser !== undefined) {
                localValues.updatedUser = this.user.id;
            }
        }
        if (attributes.deletedAt) {
            localValues.deletedAt =
                localValues.markdel !== 0
                    ? localValues.deletedAt ?? new Date()
                    : null;
        }
        if (attributes.deletedUser) {
            localValues.deletedUser =
                localValues.markdel !== 0
                    ? localValues.deletedUser ?? this.user.id
                    : null;
        }

        return localValues;
    }

    /**
     * @public
     * @template {DB} M
     * @param {string} type
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    getRlsOptions(type, options = {}) {
        const localOptions = { ...options };

        const userAccessIds = this.getUserAccessIds();
        const userAccessIdsSql = userAccessIds.join("', '");

        if (!localOptions.where[Op.and]) {
            localOptions.where[Op.and] = [];
        }

        localOptions.where[Op.and].push(
            literal(
                `EXISTS (SELECT owner_id FROM "${this.Model.options.schema}"."Rls" AS Rls WHERE Rls.type = '${type}' AND Rls.table_id = "${this.Model.name}".id AND Rls.owner_id IN ('${userAccessIdsSql}') LIMIT 1)`
            )
        );

        return localOptions;
    }

    /**
     * @public
     * @returns {string[]}
     */
    getUserAccessIds() {
        const result = this.user.id ? [this.user.id] : [];
        const RulesArray = Object.keys(this.user.rules ?? {});
        const RolesArray = Object.keys(this.user.roles ?? {});
        const GroupsArray = Object.keys(this.user.groups ?? {});
        return result.concat(RulesArray, RolesArray, GroupsArray);
    }

    /**
     * @public
     * @param {"view" | "read" | "write" | "delete"} [type="read"]
     * @param {string[]} [ids=[]]
     * @param {{ transaction?: import('sequelize').Transaction }} [options={}]
     * @returns {Promise<Rls[]>}
     */
    async getPermissions(type = 'read', ids = [], options = {}) {
        if (!ids.length) {
            return [];
        }

        const { transaction } = options;

        const owner_ids = this.getUserAccessIds();
        return Rls.findAll({
            attributes: [
                /** @type {readonly [string, string]} */ (['table_id', 'id']),
            ],
            where: {
                table_name: this.Model.tableName,
                type,
                table_id: ids,
                owner_id: owner_ids,
            },
            transaction,
        });
    }

    /**
     * @public
     * @param {Record<string, string[]> & { default?: { [key: string]: { [key: string]: string[] } } }} rules
     * @param {DB[]} records
     * @param {{ transaction?: import('sequelize').Transaction }} [options={}]
     * @returns {Promise<void>}
     */
    async setPermissions(rules, records, options = {}) {
        console.log('Добавляем RLS к записи');

        const { transaction } = options;

        // Добавим права по умолчанию
        if (typeof rules.default === 'object') {
            const promises = Object.entries(rules.default)
                .map(([type, value]) => {
                    if (!['view', 'read', 'write'].includes(type)) return;

                    return Object.entries(value).map(([owner, owners]) => {
                        if (
                            !['rules', 'roles', 'groups'].includes(owner) ||
                            !owners.length
                        )
                            return;

                        return records.map((record) =>
                            owners.map((owner_id) =>
                                Rls.create(
                                    {
                                        table_name: this.Model.tableName,
                                        table_id: record.dataValues.id,
                                        owner_id,
                                        owner,
                                        type,
                                    },
                                    {
                                        transaction,
                                    }
                                )
                            )
                        );
                    });
                })
                .flat(4);

            await Promise.all(promises);
        }
    }

    /**
     * @public
     */
    HaveCreateRule(tableOptions) {
        let result = true;
        const RulesArray = this.getUserAccessIds();
        if (tableOptions.CreateRules !== undefined) {
            // Есть ограничения по записи в таблицу
            const intersection = RulesArray.filter((x) =>
                tableOptions.CreateRules.includes(x)
            );
            result = intersection.length > 0;
        }
        return result;
    }

    /**
     * @public
     */
    HaveSelfUpdateRule(tableOptions) {
        let result = false;
        const RulesArray = this.getUserAccessIds();
        if (tableOptions.SelfUpdateRules !== undefined) {
            // Есть ограничения по записи в таблицу
            const intersection = RulesArray.filter((x) =>
                tableOptions.SelfUpdateRules.includes(x)
            );
            result = intersection.length > 0;
        }
        return result;
    }

    /**
     * @public
     */
    HaveUpdateRule(tableOptions) {
        let result = false;
        const RulesArray = this.getUserAccessIds();
        if (tableOptions.UpdateRules !== undefined) {
            // Есть ограничения по записи в таблицу
            const intersection = RulesArray.filter((x) =>
                tableOptions.UpdateRules.includes(x)
            );
            result = intersection.length > 0;
        }
        return result;
    }

    /**
     * @public
     */
    HaveDeleteRule(tableOptions) {
        let result = true;
        const RulesArray = this.getUserAccessIds();
        if (tableOptions.DeleteRules !== undefined) {
            // Есть ограничения по записи в таблицу
            const intersection = RulesArray.filter((x) =>
                tableOptions.DeleteRules.includes(x)
            );
            result = intersection.length > 0;
        }
        return result;
    }
}

module.exports = {
    RLS_TYPE_READ,
    RLS_TYPE_WRITE,
    RLS_TYPE_DELETE,
    RLS_TYPE_VIEW,
    RLSManager,
};
