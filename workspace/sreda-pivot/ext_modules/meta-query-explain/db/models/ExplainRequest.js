const { Model } = require('sequelize');

class ExplainRequestModel extends Model {}

module.exports = (sequelize, DataTypes) => {
    //@ts-ignore
    ExplainRequestModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            answerId: DataTypes.UUID,
            plan: DataTypes.TEXT,
        },
        {
            sequelize,
            modelName: 'ExplainRequest',
            schema: process.env.DB_SCHEMA,
            freezeTableName: true,
            timestamps: false,
        }
    );
    return ExplainRequestModel;
};
