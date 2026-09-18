const { MetadataDB, FamilyMetadata } = sreda.models;
const sequelize = require('../../../../core/db/connection');

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

class MetadataDBModel {
    static async getFieldsModel() {
        return Object.keys(MetadataDB.rawAttributes);
    }

    static async synchDataModel(allIDs) {
        const schema = sequelize.options.schema;
        const fields = await MetadataDBModel.getFieldsModel();
        const SQL = `INSERT INTO ${schema}."MetadataDB" ("${fields.join('", "')}")
            SELECT "${fields.join('", "')}" FROM ${schema}."Metadata" WHERE "id" in ('${allIDs.join(
            "', '"
        )}')`;
        const result = await sequelize.query(SQL);
        return result;
    }

    static async getLinks(class_id, owner_id = undefined) {
        const where = {
            class_id,
        };
        if (owner_id) where.parent = owner_id;
        where.class_id = {
            [Sequelize.Op.and]: [
                where.class_id,
                { [Sequelize.Op.ne]: { [Sequelize.Op.col]: 'Metadata.id' } },
            ],
        };

        return MetadataDB.findAll({
            attributes,
            where,
            raw: true,
            order: [
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
    }

    static async get(where) {
        if (where.owner_id) {
            where.parent = where.owner_id;
            delete where.owner_id;
        }
        return MetadataDB.showAll({
            attributes,
            where,
            raw: true,
            order: [
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
    }

    static async getItem(id) {
        return MetadataDB.findOne({
            attributes,
            where: {
                id,
            },
            raw: true,
        });
    }

    static async getChild(owner_id) {
        return MetadataDB.findAll({
            attributes,
            where: {
                parent: owner_id,
            },
            raw: true,
            order: [
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });
    }

    static async add(owner_id, class_id, class_name, name, description, manifest) {
        return MetadataDB.create({
            parent: owner_id,
            class_id,
            class: class_name,
            name,
            description,
            manifest: JSON.stringify(manifest),
        });
    }

    static async upd(id, name, description, manifest) {
        return MetadataDB.update(
            {
                name,
                description,
                manifest: JSON.stringify(manifest),
            },
            {
                where: {
                    id,
                },
                returning: true,
            }
        );
    }

    static async updRank(id, rank) {
        return MetadataDB.update(
            {
                rank,
            },
            {
                where: {
                    id,
                },
                returning: true,
            }
        );
    }

    static async del(ids) {
        return MetadataDB.destroy({
            where: {
                id: ids,
            },
            force: true,
        });
    }

    static async getMetadataWithFamily(metadataId) {
        return FamilyMetadata.findOne({
            where: {
                id: metadataId,
            },
        });
    }
}

module.exports = MetadataDBModel;
