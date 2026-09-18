const { sequelize } = sreda.models;

class InfoserviceModel {
    static async getGroupRef(Model, field, options) {
        //

        const tempSQL = await sequelize.dialect.queryGenerator
            .selectQuery(
                { schema: Model._schema, tableName: Model.tableName },
                {
                    attributes: [field.nameField],
                    offset: options.offset ?? 0,
                    limit: options.limit ?? 100,
                }
            )
            .slice(0, -1);

        let tempSQL2 = await sequelize.dialect.queryGenerator.selectQuery([['][', 'tmpTable']], {
            attributes: [
                field.nameField,
                // [{model: 'tmpTable', as: 'tmpTable'}, field.nameField, field.nameField]
            ],
            group: [field.nameField],
        });
        tempSQL2 = tempSQL2.replaceAll('"]["', `(${tempSQL})`);

        const res = await sequelize.query(tempSQL2);
        return res[0];
    }
}

module.exports = InfoserviceModel;
