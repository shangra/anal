const { Model } = require('sequelize');

class ExplainRequestMetaModel extends Model {}

module.exports = (sequelize, DataTypes) => {
    //@ts-ignore
    ExplainRequestMetaModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            meta: DataTypes.TEXT,
        },
        {
            sequelize,
            modelName: 'ExplainRequestMeta',
            schema: process.env.DB_SCHEMA,
            freezeTableName: true,
            timestamps: false,
        }
    );
    return ExplainRequestMetaModel;
};
