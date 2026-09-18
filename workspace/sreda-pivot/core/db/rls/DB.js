const { Model } = require('sequelize');
const {
    RLSManager,
    RLS_TYPE_VIEW,
    RLS_TYPE_READ,
    RLS_TYPE_WRITE,
    RLS_TYPE_DELETE,
} = require('./RLSManager');

/**
 * @import { DBStatic, TDBAttributes, TDBCreationAttributes } from "./types"
 * @import { FindOptions, FindOrCreateOptions, CreateOptions, BulkCreateOptions, UpdateOptions, DestroyOptions } from './types/Options'
 * @import { Attributes, CreationAttributes } from 'sequelize'
 * @import { Fn, Col, Literal } from 'sequelize/types/utils'
 */

/**
 * @abstract
 * @class DB
 * @property {string} id
 * @template {TDBAttributes} [TModelAttributes=TDBAttributes]
 * @template {TDBCreationAttributes} [TModelCreationAttributes=TModelAttributes]
 * @extends {Model<TModelAttributes, TModelCreationAttributes>}
 */
class DB extends Model {
    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<number>}
     */
    static async countShow(options) {
        const rls = new RLSManager(this);

        options = rls.getCountOptions(options);
        if (this.RLSRule && !options.force) {
            options = rls.getRlsOptions(RLS_TYPE_VIEW, options);
        }

        return super.count(options);
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<number>}
     */
    static async countFind(options) {
        const rls = new RLSManager(this);

        options = rls.getCountOptions(options);
        if (this.RLSRule && !options.force) {
            options = rls.getRlsOptions(RLS_TYPE_READ, options);
        }

        return super.count(options);
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M[]>}
     */
    static async showAll(options) {
        const rls = new RLSManager(this);

        options = rls.getFindOptions(options);
        if (this.RLSRule && !options.force) {
            options = rls.getRlsOptions(RLS_TYPE_VIEW, options);
        }

        return super.findAll(options);
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M | null>}
     */
    static async showOne(options) {
        const rls = new RLSManager(this);

        options = rls.getFindOptions(options);
        if (this.RLSRule && !options.force) {
            options = rls.getRlsOptions(RLS_TYPE_VIEW, options);
        }

        const [result = null] = await super.findAll({ ...options, limit: 1 });
        return result;
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M[]>}
     */
    static async findAll(options) {
        const rls = new RLSManager(this);

        options = rls.getFindOptions(options);
        if (this.RLSRule && !options.force) {
            options = rls.getRlsOptions(RLS_TYPE_READ, options);
        }

        return super.findAll(options);
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M | null>}
     */
    static async findOne(options) {
        const rls = new RLSManager(this);

        options = rls.getFindOptions(options);
        if (this.RLSRule && !options.force) {
            options = rls.getRlsOptions(RLS_TYPE_READ, options);
        }

        const [result = null] = await super.findAll({ ...options, limit: 1 });
        return result;
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @template {CreateOptions<Attributes<M>>} [O=CreateOptions<Attributes<M>>]
     * @this {DBStatic<M>}
     * @param {CreationAttributes<M>} [values]
     * @param {O} [options]
     * @returns {Promise<(O extends { returning: false; } | { ignoreDuplicates: true; } ? void : M) | null>}
     */
    static async create(values, options) {
        // /** @type {(O extends { returning: false; } | { ignoreDuplicates: true; } ? void : M) | null} */
        // let result = null;

        const rls = new RLSManager(this);
        values = rls.getValues(values, 'insert');

        if (this.RLSRule !== undefined && !options?.force) {
            const rules = this.RLSRule();
            // CreateRule
            if (rls.HaveCreateRule(rules)) {
                // создаем запись
                const result = await super.create(values, options);
                if (result) {
                    // удаляем rls поля
                    delete result.dataValues?.[RLS_TYPE_WRITE];
                    delete result.dataValues?.[RLS_TYPE_READ];
                    delete result.dataValues?.[RLS_TYPE_DELETE];
                    delete result.dataValues?.[RLS_TYPE_VIEW];

                    // устанавливаем права доступа к записи по умолчанию
                    await rls.setPermissions(rules, [result], {
                        transaction: options?.transaction,
                    });

                    return result;
                }
            }

            return null;
        }

        return super.create(values, options);
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {FindOrCreateOptions<Attributes<M>, CreationAttributes<M>>} options
     * @returns {Promise<[M | null, boolean]>}
     */
    static async findOrCreate(options) {
        let created = false;

        let result = await this.findOne(options);
        if (!result) {
            result = await this.create(options.defaults, options);
            if (result !== null) {
                created = true;
            }
        }

        return [result, created];
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {CreationAttributes<M>[]} values
     * @param {BulkCreateOptions<Attributes<M>>} options
     * @returns {Promise<M[] | null>}
     */
    static async bulkCreate(values, options) {
        const rls = new RLSManager(this);
        values = values.map((i) => rls.getValues(i, 'insert'));

        if (this.RLSRule !== undefined && !options?.force) {
            const rules = this.RLSRule();
            // CreateRule
            if (rls.HaveCreateRule(rules)) {
                const result = await super.bulkCreate(values, options);

                await rls.setPermissions(rules, result, {
                    transaction: options.transaction,
                });

                return result;
            }

            return null;
        }

        return super.bulkCreate(values, options);
    }

    /**
     * @template {DB} [M=DB]
     * @public
     * @override
     * @overload
     * @this {DBStatic<M>}
     * @param {{
     *   [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal;
     * }} values
     * @param {Omit<UpdateOptions<Attributes<M>>, 'returning'>
     *   & { returning: Exclude<UpdateOptions<Attributes<M>>['returning'], undefined | false> }
     * } options
     * @returns {Promise<[affectedCount: number, affectedRows: M[]]>}
     */
    /**
     * @template {DB} [M=DB]
     * @public
     * @override
     * @overload
     * @this {DBStatic<M>}
     * @param {{
     *   [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal;
     * }} values
     * @param {UpdateOptions<Attributes<M>>} options
     * @returns {Promise<[affectedCount: number]>}
     */
    /**
     * @template {DB} [M=DB]
     * @public
     * @override
     * @this {DBStatic<M>}
     * @param {{
     *   [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal;
     * }} values
     * @param {(Omit<UpdateOptions<Attributes<M>>, 'returning'>
     *   & { returning: Exclude<UpdateOptions<Attributes<M>>['returning'], undefined | false> }
     * ) | UpdateOptions<Attributes<M>>} options
     * @returns {Promise<[affectedCount: number, affectedRows: M[]] | [affectedCount: number]>}
     */
    static async update(values, options) {
        const rls = new RLSManager(this);

        values = rls.getValues(values, 'update');

        if (this.RLSRule !== undefined && !options.force) {
            const rules = this.RLSRule();
            // UpdateRule
            if (rls.HaveUpdateRule(rules)) {
                const permissions = await rls.getPermissions(
                    'write',
                    options.where?.id,
                    {
                        transaction: options.transaction,
                    }
                );
                if (permissions.length > 0) {
                    return super.update(values, options);
                }
            }

            return null;
        }

        return super.update(values, options);
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {DestroyOptions<Attributes<M>>} [options]
     * @returns {Promise<number>}
     */
    static async destroy(options) {
        const rls = new RLSManager(this);

        const attributes = this.getAttributes();
        // если в модели отсутствует параметр markdel или указан параметр force = true, полное удаление
        if (attributes.markdel === undefined || options.force === true) {
            return super.destroy(options);
        }

        // если в модели есть ограничение по правам, происходит дальнейшая проверка
        // в противном случае устанавливается markdel = 1
        if (this.RLSRule) {
            const rules = this.RLSRule();
            // проверка наличия у пользователя права на удаление, указанного в модели (RLSRule)
            if (rls.HaveDeleteRule(rules)) {
                const permissions = await rls.getPermissions(
                    'delete',
                    options.where.id,
                    {
                        transaction: options.transaction,
                    }
                );
                // если у пользователя есть право на удаление конкретной записи (в таблице Rls), происходит полное удаление
                // в противном случае устанавливается markdel = 1
                if (permissions.length > 0) {
                    return super.destroy(options);
                }
            }
        }

        const [result] = (await this.update({ markdel: 1 }, options)) ?? [0];

        return result;
    }

    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {string} sqltype
     * @param {string} rlstype
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    static mkRlsOptions(sqltype, rlstype, options) {
        // sqltype: 'select', 'view', 'insert', 'update'; вероятно, что-то ещё
        // rlstype: RLS_TYPE_VIEW, RLS_TYPE_READ, RLS_TYPE_WRITE, RLS_TYPE_DELETE
        const rls = new RLSManager(this);
        return this.RLSRule && !options?.force
            ? rls.getRlsOptions(rlstype, options) // rlsOptions
            : rls.getFindOptions(options); // currentOptions
    }
}

module.exports = DB;
