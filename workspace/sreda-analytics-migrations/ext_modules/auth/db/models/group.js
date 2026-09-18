const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/Group').TGroupAttributes} TGroupAttributes
 * @typedef {import('./types/Group').TGroupCreationAttributes} TGroupCreationAttributes
 */

/**
 * @class Group
 * @extends {DB<TGroupAttributes, TGroupCreationAttributes>}
 */
class Group extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Users }) {
        // define association here
        this.belongsToMany(Users, {
            through: 'GroupUser',
            foreignKey: 'group_id',
        });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof Group}
 */
module.exports = (sequelize, DataTypes) => {
    Group.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            name: DataTypes.STRING,
            description: DataTypes.STRING,
            open: DataTypes.BOOLEAN,
            private: DataTypes.INTEGER,
            logo: DataTypes.STRING,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'Group',
            schema: process.env.DB_SCHEMA,
        }
    );

    return Group;
};
