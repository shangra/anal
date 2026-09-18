const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/UAttributes').TUAttributesAttributes} TUAttributesAttributes
 * @typedef {import('./types/UAttributes').TUAttributesCreationAttributes} TUAttributesCreationAttributes
 */

/**
 * @class UAttributes
 * @extends {DB<TUAttributesAttributes, TUAttributesCreationAttributes>}
 */
class UAttributes extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ UserData }) {
        // define association here
        this.hasMany(UserData, { foreignKey: 'attribute_id' });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof UAttributes}
 */
module.exports = (sequelize, DataTypes) => {
    UAttributes.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            name: DataTypes.STRING,
            type: DataTypes.STRING,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'UAttributes',
            schema: process.env.DB_SCHEMA,
        }
    );

    return UAttributes;
};
