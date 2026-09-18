const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const { uniqueValues } = require('../../utils/services');
const MetadataDBModel = require('./model/MetadataDB.model');
const Metadata = new MetadataClass();
const MetadataDB = new MetadataClass({ MetadataModel: MetadataDBModel });

const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');

/**
 * @typedef {import('../../metadata-cmp/services/metadata/source/LevelClass.class').IMultiRef} IMultiRef
 * @typedef {import('../../metadata-cmp/services/metadata/source/LevelClass.class').IField} IField
 */

/**
 * @typedef {object} DBFieldI
 * @property {string} description
 * @property {string} field
 * @property {string} id
 * @property {string} name
 * @property {boolean} notnull
 * @property {string} string
 */

class metaSynhDbmodelService extends Extensions {
    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;
        const newButton = {
            name: 'MetaSynhDBModel',
            component: 'MetaSynhDBModel',
            props: {
                icon: 'bi bi-repeat',
                type: 'update',
                server: global?.env?.ESB_NAME || '',
                service: `metadata/metasynhdbmodel/synch/${id}`,
                title: 'Синхронизировать объект метаданных',
            },
        };

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }
        innerResult.buttons.push(newButton);

        return innerResult;
    }

    async dropMetadata(id) {
        let allIDs = [id];
        const allChildren = await MetadataDB.getMetadataChildren(id);
        allIDs = [...allIDs, ...allChildren.map((item) => item.id)];

        const res = await MetadataDBModel.del(allIDs);
        return res;
    }

    async synchMetadata(id) {
        let allIDs = [id];
        const allChildren = await Metadata.getMetadataChildren(id);
        allIDs = [...allIDs, ...allChildren.map((item) => item.id)];

        await MetadataDBModel.del(allIDs);
        const res = await MetadataDBModel.synchDataModel(allIDs);

        return res;
    }

    async synch(id, body) {
        const mData = await Metadata.getMetadata(id, { instance: true });
        const result = await mData.classInstance.synch(id, body);
        await this.synchMetadata(id);

        return { result };
    }

    async drop(id) {
        const mData = await Metadata.getMetadata(id, { instance: true });
        const result = await mData.classInstance.drop(id);
        await this.dropMetadata(id); // удаляем всё из таблицы metadataDB

        return { result };
    }

    async diffField(fieldNew, fieldOld) {
        //
        const nameOk = fieldNew.field === fieldOld.field;
        const typeOk = fieldNew.type === fieldOld.type;
        const lengthOk = fieldNew.len === fieldOld.len;
        const incrementOk = fieldNew.increment === fieldOld.increment;
        const notnullOk = fieldNew.notnull === fieldOld.notnull;
        return nameOk && typeOk && lengthOk && incrementOk && notnullOk;
    }

    getNameByModel(model, fieldName) {
        //TODO нужно убрать этот костыль и перенести в коннектор
        let result = fieldName;
        if (model.dialect === 'trino') {
            result = fieldName.toLowerCase();
        }
        return result;
    }

    /**
     * @param {Record<string, DBFieldI>} fieldsNew
     * @param {Record<string, DBFieldI>} fieldsOld
     * @param {Record<string, string>} DBModel
     * @returns
     */
    async diffFields(fieldsNew, fieldsOld, DBModel, model) {
        //
        const updateFields = {};
        const insertFields = {};
        const deleteFields = {};

        let allFieldsSet = [];
        const n1 = Object.values(fieldsNew).map((field) => this.getNameByModel(model, field.field));
        const n2 = Object.values(fieldsOld).map((field) => this.getNameByModel(model, field.field));
        //@ts-ignore
        const n3 = Object.values(DBModel).map((field) => field.name);
        allFieldsSet = [...new Set([...n1, ...n2, ...n3])];

        const dbFieldsName = Object.keys(DBModel);

        const newFieldsGUID = Object.keys(fieldsNew);
        const fieldsNewByName = {};
        const newFieldsName = Object.keys(fieldsNew).map((field) => {
            const fieldName = this.getNameByModel(model, fieldsNew[field].field);
            fieldsNewByName[fieldName] = fieldsNew[field];
            return fieldName;
        });

        const oldFieldsGUID = Object.keys(fieldsOld);
        const fieldsOldByName = {};
        const oldFieldsName = Object.keys(fieldsOld).map((field) => {
            const fieldName = this.getNameByModel(model, fieldsNew[field].field);
            fieldsOldByName[fieldName] = fieldsOld[field];
            return fieldName;
        });

        //A.filter(x => !B.includes(x));
        const insertF = allFieldsSet.filter((x) => !n3.includes(x));
        insertF.forEach((fieldName) => (insertFields[fieldName] = fieldsNewByName[fieldName]));

        for (const newFieldGUID in fieldsNew) {
            const newField = fieldsNew[newFieldGUID];
            if (oldFieldsGUID.includes(newFieldGUID)) {
                // Гуиды совпадают нужно проверить имена колонок, тип и т.д.
                const res = await this.diffField(newField, fieldsOld[newFieldGUID]);
                if (!res) {
                    updateFields[fieldsOld[newFieldGUID].field] = newField;
                }
            } else {
                // Такого поля не существует в старой схеме
                // Проверим по имени поля, вдруг его случайно удалили и завели заново
                const fieldName = this.getNameByModel(model, newField.field);

                if (oldFieldsName.includes(fieldName)) {
                    // Имена совпадают нужно проверить тип и т.д.
                    const res = await this.diffField(newField, fieldsOldByName[fieldName]);
                    if (!res) {
                        updateFields[fieldName] = newField;
                        insertFields[fieldName] = newField;
                        // } else {
                        //ГУИДЫ не совпадают, а поля совпадают, нужно добавить
                        // insertFields[newField.field] = newField;
                    }
                } else if (!dbFieldsName.includes(fieldName)) {
                    // Такого поля не было раньше
                    insertFields[fieldName] = newField;
                }
            }
        }

        const updateFieldsName = Object.keys(updateFields);
        for (const oldFieldGUID in fieldsOld) {
            const oldField = fieldsOld[oldFieldGUID];

            if (
                !newFieldsGUID.includes(oldFieldGUID) &&
                !updateFieldsName.includes(oldField.field)
            ) {
                // Это поле было удалено
                deleteFields[oldField.field] = oldField;
            }
        }

        for (const dbFieldName of dbFieldsName) {
            if (!newFieldsName.includes(dbFieldName) && !updateFieldsName.includes(dbFieldName)) {
                deleteFields[dbFieldName] = { field: dbFieldName };
            }
        }

        const allFields = [
            ...new Set([
                ...allFieldsSet,
                ...dbFieldsName,
                ...Object.keys(insertFields),
                ...Object.keys(updateFields),
            ]),
        ]; //,

        return {
            allFields,
            inSchema: newFieldsName,
            inDB: dbFieldsName,
            updateFields,
            insertFields,
            deleteFields,
        };
    }

    async diffTablesFields(allTablesFields, model) {
        const result = {};
        for (const tableName in allTablesFields) {
            result[tableName] = await this.diffFields(
                allTablesFields[tableName].fieldsNew,
                allTablesFields[tableName].fieldsOld,
                allTablesFields[tableName].DBModel,
                model
            );
        }
        return result;
    }

    /**
     * @param {string} id
     * @returns
     */
    async model(id) {
        const {
            data,
            tables,
            allTables: newTables,
            model,
        } = await this.getMeta({ meta: Metadata, id, throwError: true });

        const { tables: oldTables, allTables: oldTablesNames } = await this.getMeta({
            meta: MetadataDB,
            id,
            throwError: false,
        });

        const allTables = uniqueValues([...newTables, ...oldTablesNames]);

        const models = await data.classInstance.model(id);

        const allTablesFields = {};

        allTables.forEach((table) => {
            allTablesFields[table] = {
                fieldsNew: tables[table] ?? {},
                fieldsOld: oldTables[table] ?? {},
                DBModel: models[table] ?? {},
            };
        });

        const result = await this.diffTablesFields(allTablesFields, model);
        return result;
    }

    /**
     * @param {{ Fields: Record<string, IField>, FieldsGUID: Record<string, IField> }} treeObject
     */
    async hydrateTreeObject(treeObject) {
        return treeObject;
    }

    /**
     * Перегрузка удаления метаданных.
     * @param innerResult Результат выполнения метода удаления метаданных
     * @param {object} functionInput Входные параметры метода удаления метаданных
     * @param {string} functionInput.id UUID удаляемой записи в таблице метаданных
     * @returns {Promise<void>}
     */
    async metadataDeleteAfter(innerResult, { id }) {
        const children = await MetadataDBModel.getChild(id);

        if (children?.length) {
            const ids = children.map((child) => child.id);
            await MetadataDBModel.del(ids);
        }

        await MetadataDBModel.del(id);
        return innerResult;
    }

    async getMetadata(id, options) {
        return await Metadata.getMetadata(id, options);
    }

    async getMeta({ meta, id, throwError }) {
        try {
            const tables = {};
            const data = await this.getMetadata(id, {
                MetadataModel: meta.MetadataModel,
                instance: true,
            });
            const allTables = [];

            const { connector } = await this.getConnector(data);

            if (data) {
                allTables.push(data.manifest.settings.table);

                data.treeObject = await this.hydrateTreeObject(data.treeObject);

                const FieldsGUID = data?.treeObject?.FieldsGUID ?? {};
                Object.values(FieldsGUID).forEach((field) => {
                    if (field.virtual || field.off) delete FieldsGUID[field.id];
                });
                tables[data.manifest.settings.table] = FieldsGUID;

                if (data.treeObject.TabularParts) {
                    for (const TBName in data.treeObject.TabularParts) {
                        allTables.push(TBName);

                        data.treeObject.TabularParts[TBName].info = await this.hydrateTreeObject(
                            data.treeObject.TabularParts[TBName].info
                        );

                        const tFieldsGUID =
                            data.treeObject.TabularParts[TBName].info.FieldsGUID ?? {};
                        Object.values(tFieldsGUID).forEach((field) => {
                            if (field.virtual || field.off) delete tFieldsGUID[field.id];
                        });

                        tables[TBName] = tFieldsGUID;
                    }
                }
            }

            return { tables, allTables, data, model: connector.Model };
        } catch (e) {
            if (throwError) {
                throw e;
            }

            return { tables: {}, allTables: [], data: null };
        }
    }

    async getConnector(item) {
        let connectorId = item?.manifest?.settings?.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }
}

module.exports = metaSynhDbmodelService;
