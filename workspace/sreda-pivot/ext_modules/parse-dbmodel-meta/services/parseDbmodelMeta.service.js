const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const MetadataModel = require('../../metadata-cmp/services/model/Metadata.model');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const Metadata = new MetadataClass();

class parseDbmodelMetaService extends Extensions {
    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }
        innerResult.buttons.push({
            name: 'Load DB model',
            component: 'DBModelLoader',
            props: {
                type: 'update',
                title: 'Загрузить модель данных',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/parsedbmodelmeta/autofill/${id}`,
            },
        });

        return innerResult;
    }

    async parse(body) {
        let nowLink = [];
        const bodyLines = body.split('\n');
        bodyLines.forEach((line) => {
            let lineM = line.split(';');

            const fieldInfo = {
                nameField: lineM[0].trim(),
                type: lineM[1].trim(),
                description: lineM[2].trim(),
            };
            nowLink.push(fieldInfo);
        });
        return nowLink;
    }

    async getType(key, value) {
        const swap = {
            string: 'text',
            number: 'integer',
            date: 'datetime',
            float: 'float',
            boolean: 'boolean',
        };

        const typeByChar = {
            d: 'date',
            s: 'string',
            n: 'number',
            r: 'float',
            b: 'boolean',
        };

        const fChar = key.charAt(0);
        const typeChar = typeByChar[fChar];
        let jsType = value ? typeof value : typeChar;
        if (jsType === 'string' && typeChar === 'date') {
            jsType = typeChar;
        }
        const sqlType = swap[jsType];

        return sqlType;
    }

    async getDescriptions() {
        const data = await MetadataModel.getFieldsInfo();

        let exportObject = {};
        data.forEach((row) => {
            if (!exportObject[row.fieldname])
                exportObject[row.fieldname] = { names: {}, descriptions: {} };
            const name = row.name;
            const nameOrd = name
                .split('')
                .reduce((accumulator, currentValue) => accumulator + currentValue.charCodeAt(0), 0);

            const description = row.description;
            const descriptionOrd = description
                .split('')
                .reduce((accumulator, currentValue) => accumulator + currentValue.charCodeAt(0), 0);

            if (!exportObject[row.fieldname].names[nameOrd]) {
                exportObject[row.fieldname].names[nameOrd] = {
                    name: name,
                    ord: nameOrd,
                    weight: 1,
                    sum: nameOrd,
                };
            } else {
                let fieldInfo = exportObject[row.fieldname].names[nameOrd];
                fieldInfo.weight = fieldInfo.weight + 1;
                fieldInfo.sum = fieldInfo.ord ** fieldInfo.weight;
            }

            if (!exportObject[row.fieldname].descriptions[descriptionOrd]) {
                exportObject[row.fieldname].descriptions[descriptionOrd] = {
                    name: name,
                    ord: descriptionOrd,
                    weight: 1,
                    sum: descriptionOrd,
                };
            } else {
                let fieldInfo = exportObject[row.fieldname].descriptions[descriptionOrd];
                fieldInfo.weight = fieldInfo.weight + 1;
                fieldInfo.sum = fieldInfo.ord ** fieldInfo.weight;
            }
        });

        Object.keys(exportObject).forEach((field) => {
            let fieldInfo = exportObject[field];
            const maxIndexNames = Math.max(...Object.keys(fieldInfo.names));
            fieldInfo.name = exportObject[field].names[maxIndexNames].name;
            delete fieldInfo.names;

            const maxIndexDescriptions = Math.max(...Object.keys(fieldInfo.descriptions));
            fieldInfo.description = exportObject[field].descriptions[maxIndexDescriptions].name;
            delete fieldInfo.descriptions;
        });

        return exportObject;
    }

    async getDescription(key, value) {
        //
        const data = await MetadataModel.getFieldsInfo();
        console.log(data);
    }

    async autofillFromDB(id) {
        const meta = await Metadata.getMetadata(id, { instance: true });
        const { connector } = await this.getConnector(meta);
        const { table: tableName } = meta.manifest.settings;

        const rows = await connector.findAll(tableName, { attributes: ['*'], limit: 1 });
        const descriptions = await this.getDescriptions();

        const fileds = [];
        if (rows?.length) {
            const line = rows[0];
            const names = Object.keys(line);
            for (const name of names) {
                const field = {};
                field.nameField = name;

                const type = await this.getType(name, line[name]);
                field.type = type ?? '';

                const description = descriptions[name] ?? { name: name, description: name };
                field.name = Metadata.sanitizedName(description.name);
                field.description = description.description;

                fileds.push(field);
            }
        }

        const result = await this.fillFields(id, fileds);
        return { result: result };
    }

    async fillFields(id, bodyFields) {
        const meta = await Metadata.getMetadata(id, { instance: true });
        let treeObject = meta.treeObject;

        let GUIDS = {};
        for (const child of meta.children) {
            GUIDS[child.class] = {
                guid: child.id,
                class: child.classInstance,
            };
        }

        const fieldsMetadata = {};
        if (Array.isArray(bodyFields)) {
            const treeFields = Object.keys(treeObject.Fields);
            const fields = [];

            for (const key of bodyFields) {
                const { nameField, type, name, description } = key;

                if (!treeFields.includes(nameField)) {
                    const fieldTemplate = {
                        owner_id: id,
                        class_id: GUIDS.Fields.guid,
                        class: 'Fields',
                        name: name ?? Metadata.sanitizedName(description),
                        description: description,
                        settings: {
                            nameField: nameField,
                            type: type,
                            increment: false,
                            // length: field.length,
                            // notnull: field.notnull,
                        },
                        events: {},
                    };
                    const fieldObject = JSON.parse(JSON.stringify(fieldTemplate));
                    fields.push(fieldObject);
                }
            }

            for (const field of fields) {
                const fieldM = await Metadata.setMetadata(field);
                fieldsMetadata[field.name] = fieldM;
            }
        }
        return true;
    }

    async autofill(id, body) {
        const bodyFields = await this.parse(body);

        const result = await this.fillFields(id, bodyFields);
        return { result: result };
    }

    /**
     * получить коннектор
     * @param {any} item
     */
    async getConnector(item) {
        let connectorId = item.manifest.settings.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }
}

module.exports = parseDbmodelMetaService;
