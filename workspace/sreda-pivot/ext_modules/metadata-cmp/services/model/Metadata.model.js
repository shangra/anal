const { Op } = require('sequelize');
const { Metadata, FamilyMetadata } = sreda.models;

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

class MetadataModel {

    static operatorsAliases = {
        $eq: Op.eq,
        $ne: Op.ne,
        $gte: Op.gte,
        $gt: Op.gt,
        $lte: Op.lte,
        $lt: Op.lt,
        $not: Op.not,
        $in: Op.in,
        $notIn: Op.notIn,
        $is: Op.is,
        $like: Op.like,
        $notLike: Op.notLike,
        $iLike: Op.iLike,
        $notILike: Op.notILike,
        $regexp: Op.regexp,
        $notRegexp: Op.notRegexp,
        $iRegexp: Op.iRegexp,
        $notIRegexp: Op.notIRegexp,
        $between: Op.between,
        $notBetween: Op.notBetween,
        $overlap: Op.overlap,
        $contains: Op.contains,
        $contained: Op.contained,
        $adjacent: Op.adjacent,
        $strictLeft: Op.strictLeft,
        $strictRight: Op.strictRight,
        $noExtendRight: Op.noExtendRight,
        $noExtendLeft: Op.noExtendLeft,
        $and: Op.and,
        $or: Op.or,
        $any: Op.any,
        $all: Op.all,
        $values: Op.values,
        $col: Op.col,
    };

    static async getLinks(class_id, owner_id = undefined) {
        const where = {
            class_id,
        };
        if (owner_id) where.parent = owner_id;
        where.class_id = {
            [Op.and]: [where.class_id, { [Op.ne]: { [Op.col]: 'Metadata.id' } }],
        };

        let result = await Metadata.findAll({
            attributes,
            where,
            raw: true,
            order: [
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
        return result?.dataValues ?? result;
    }

    static async get(where = {}, options = {}) {
        if (where.owner_id) {
            where.parent = where.owner_id;
            delete where.owner_id;
        }
        let result = await Metadata.showAll({
            ...options,
            where,
            raw: true,
            order: [
                ...(options.order ?? []),
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
        return result?.dataValues ?? result;
    }

    static async getItem(id, options) {
        let result = await Metadata.findOne({
            ...options,
            attributes,
            where: {
                id,
            },
            raw: true,
        });
        return result?.dataValues ?? result;
    }

    static async getChild(parent, options = {}) {
        let result = await Metadata.findAll({
            attributes,
            where: {
                [Op.and]: [
                    { parent },
                    { parent: { [Op.ne]: { [Op.col]: `${Metadata.tableName}.id` } } }
                ]
            },
            raw: true,
            order: [
                ...(options.order ?? []),
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
        return result?.dataValues ?? result;
    }
    
    static async readChild(parent, options = {}) {
        const result = await Metadata.findAll({
            ...options,
            attributes,
            where: {
                [Op.and]: [
                    { parent },
                    { parent: { [Op.ne]: { [Op.col]: `${Metadata.tableName}.id` } } }
                ]
            },
            // raw: true,
            order: [
                ...(options.order ?? []),
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
        return result?.map(i => i.get({ plain: true }));
    }

    static async viewChild(parent, options = {}) {
        const result = await Metadata.showAll({
            ...options,
            attributes,
            where: {
                [Op.and]: [
                    { parent },
                    { parent: { [Op.ne]: { [Op.col]: `${Metadata.tableName}.id` } } }
                ]
            },
            // raw: true,
            order: [
                ...(options.order ?? []),
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
        return result?.map(i => i.get({ plain: true }));
    }

    static async add(parent, class_id, class_name, name, description, manifest, transaction) {
        let result = await Metadata.create({
            parent: parent,
            class_id,
            class: class_name,
            name,
            description,
            manifest: JSON.stringify(manifest),
        }, {
            transaction
        });
        return result?.dataValues ?? result;
    }

    static async upd(id, name, description, manifest, parent, options = {}) {
        const values = {
            name,
            description,
            manifest: JSON.stringify(manifest),
        }
        if (parent) values.parent = parent;

        const isClass = (value) => { return Object.prototype.toString.call(value) === '[object class]' }
        const transaction = isClass(options) ? options : options.transaction;

        return Metadata.update(
            values,
            {
                ...options,
                where: {
                    id,
                },
                transaction,
                returning: true,
            }
        );
    }

    static async updRank(id, rank) {
        return Metadata.update(
            {
                rank,
            },
            {
                where: {
                    id,
                },
                returning: true,
            },
        );
    }

    static async del(id, transaction) {
        return Metadata.destroy({
            where: {
                id,
            },
            transaction,
        });
    }

    static async getMetadataWithFamily(metadataId) {
        return FamilyMetadata.findOne({
            where: {
                id: metadataId,
            },
        });
    }
    /**
     * @param {string} class_id 
     * @param {string} owner_id 
     * @param {string} name 
     * @param {string} [id]
     */
    static async getDuplicate(class_id, parent, name, id) {
        const where = {
            class_id,
            parent,
            name
        };

        if (id) {
            where.id = { [Op.ne]: id }
        }

        return await MetadataModel.get(where);
    }

    static async getFieldsInfo(where = {}) {
        //
        const SQL = `SELECT fieldname, name, description FROM (
                SELECT name, description, (manifest::jsonb->'settings'->>'nameField') AS fieldname FROM "${sreda.env.DB_SCHEMA}"."Metadata") AS Metadata
                WHERE fieldname IS NOT NULL
                GROUP BY fieldname, name, description
                ORDER BY fieldname`
        const data = await Metadata.sequelize.query(SQL, where);
        return data[0];
    }

}

module.exports = MetadataModel;
