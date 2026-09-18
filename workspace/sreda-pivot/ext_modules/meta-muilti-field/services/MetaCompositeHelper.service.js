const Extensions = require('../../../core/class/Extensions.class');
const MetadataModelClass = require('../../metadata-cmp/services/model/Metadata.model');

const MetadataServiceClass = require('../../metadata-cmp/services/Metadata.service');
const MetadataService = new MetadataServiceClass();

class MetaCompositeHelperService extends Extensions {
    async tree() {
        const childMetadata = await MetadataModelClass.getChild(
            '00000000-0000-0000-0000-000000000000'
        ); //{ parent : "00000000-0000-0000-0000-000000000000"}

        const childByChildMetadata = [];
        let exportData = {};
        childMetadata.forEach((child) => {
            childByChildMetadata.push(child.id);
            exportData[child.id] = {
                value: child.id,
                label: child.description,
                disabled: true,
                children: [],
            };
        });

        const level2Metadata = await MetadataModelClass.getChild(
            childByChildMetadata
        ); //{ parent : "00000000-0000-0000-0000-000000000000"}
        level2Metadata.forEach((child) => {
            exportData[child.owner_id].children.push({
                type: 10,
                value: child.id,
                link: child.owner_id,
                label: child.description,
                disabled: false,
            });
        });

        exportData = Object.values(exportData);

        const result = [
            {
                type: 0,
                value: 'STRING',
                label: 'Строка',
            },
            {
                type: 1,
                value: 'FLOAT',
                label: 'Число',
            },
            {
                type: 2,
                value: 'BOOLEAN',
                label: 'Булево',
            },
            {
                type: 3,
                value: 'DATETIME',
                label: 'Дата время',
            },
        ];

        result.push({
            value: '00000000-0000-0000-0000-000000000000',
            label: 'Метаданные',
            disabled: true,
            children: exportData,
        });

        return result;
    }

    async get(id) {
        return { get: id };
    }

    async post(body) {
        return { post: body };
    }

    async put(id, body) {
        return {
            put: {
                id,
                body,
            },
        };
    }

    async del(id) {
        return { del: id };
    }
}

module.exports = MetaCompositeHelperService;
