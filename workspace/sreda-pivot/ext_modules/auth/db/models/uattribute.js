const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/UAttribute').TUAttributeAttributes} TUAttributeAttributes
 * @typedef {import('./types/UAttribute').TUAttributeCreationAttributes} TUAttributeCreationAttributes
 */

/**
 * @class UAttribute
 * @extends {DB<TUAttributeAttributes, TUAttributeCreationAttributes>}
 */
class UAttribute extends DB {
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
 * @returns {typeof UAttribute}
 */
module.exports = (sequelize, DataTypes) => {
    UAttribute.init(
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
            modelName: 'UAttribute',
            schema: process.env.DB_SCHEMA,
        }
    );

    return UAttribute;
};
