const DB = require('../../../../core/db/rls/DB');

const METADATA_WRITE_RULE = '232a43fb-ed52-414e-8562-75a814a1e8d1';
const ALL_READ_RULE = '90499885-ae60-440b-a59f-cfd3958110cd';

module.exports = (sequelize, DataTypes) => {
    class PivotSchemas extends DB {
        static associate() { }

        // static RLSRule() {
        //     return {
        //         CreateRules: [METADATA_WRITE_RULE],
        //         UpdateRules: [METADATA_WRITE_RULE],
        //         DeleteRules: [METADATA_WRITE_RULE],
        //         defaultReadRules: [ALL_READ_RULE],
        //     };
        // }
    }

    PivotSchemas.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.BOOLEAN,

            name: DataTypes.STRING,
            schema_owner: DataTypes.UUID,
            standart_schema: DataTypes.BOOLEAN,
            schema: DataTypes.TEXT,
            snapshot: DataTypes.TEXT,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'PivotSchemas',
            schema: process.env.DB_SCHEMA,
            tableName: 'PivotSchemas',
        },
    );
    return PivotSchemas;
};
