import $api from 'helpers/axios';

// TODO Удалить этот импорт, неможет api знать что-то про инпуты...
import { fieldTypeName, typeCodeToTypeNameMapping } from 'components/MetadataForms/MetaInput/constant';
import { buildUrl } from 'helpers/buildUrl';

export class Api {
    static getFieldsByLinkGUID = async (guidLink, server) => Api.fetchFieldsByObject(guidLink, server);

    static getFieldsByLinkName = async (nameLink, server) => {
        // nameLink = "Справочники.Контрагенты"
        const [metaName, linkName] = nameLink.split('.');
        const metadata = await $api.get(buildUrl(server, `metadata/objectbyname/${metaName}/${linkName}`));
        return metadata?.data?.[0]?.id ? Api.fetchFieldsByObject(metadata?.data?.[0]?.id, server) : '';
    };

    // Для обратной совместимости оставляем эту функцию
    static fetchFieldsByObject = async (guidLink, server) => {
        if (guidLink) {
            // почему переменная называется - "fromRegistryMetadata" ???
            const fromRegistryMetadata = await $api.get(buildUrl(server, `metadata/object/${guidLink}`));

            const fromRegistryFields = Object.values(fromRegistryMetadata.data.treeObject.Fields)?.map((field) => {
                const fieldMetaData = fromRegistryMetadata.data.treeObject.Fields[field.field];
                const fieldRef = fromRegistryMetadata.data.treeObject?.Refs?.[field.field];

                let fieldData = {
                    id: field.id,
                    label: field.description,
                    value: field.field,
                    type: fieldMetaData.type || 'input',
                    show: !!field.show,
                };

                if (fieldRef && fieldRef?.ref) {
                    fieldData = {
                        ...fieldData,
                        metaRef: fieldRef.ref,
                        type: fieldTypeName.REF,
                    };
                }

                if (fieldMetaData.type === fieldTypeName.COMPOSITE) {
                    fieldData = {
                        ...fieldData,
                        dataTypes: fieldMetaData.multiRef.map((ref) => ({
                            ...ref,
                            value: ref.value.toLowerCase(),
                            typeName: typeCodeToTypeNameMapping[ref.type],
                        })),
                    };
                }

                return fieldData;
            });

            let fromRegistryTableFields = [];
            if (fromRegistryMetadata?.data?.treeObject?.TabularParts) {
                const tabularParts = Object.values(fromRegistryMetadata.data.treeObject.TabularParts);

                // Маппинг полей табличных частей
                tabularParts.forEach((table) => {
                    fromRegistryTableFields = [
                        ...fromRegistryTableFields,
                        ...Object.values(table.info.Fields).map((field) => {
                            const fieldRef = table.info?.Refs?.[field.field];

                            const tablePrefix = table.name || table.description;
                            const fieldDescription = `${tablePrefix}.${field.description}`;
                            const fieldValue = `${table.table}.${field.field}`;
                            const fieldType = table.info.Fields[field.field].type;

                            if (fieldRef) {
                                return {
                                    id: field.id,
                                    label: fieldDescription,
                                    value: fieldValue,
                                    metaRef: fieldRef.ref,
                                    type: fieldType || fieldTypeName.STRING,
                                };
                            }

                            return {
                                id: field.id,
                                label: fieldDescription,
                                value: fieldValue,
                                type: fieldType || fieldTypeName.STRING,
                            };
                        }),
                    ];
                });
            }

            return {
                registryMetadata: fromRegistryMetadata,
                registryFields: fromRegistryFields,
                registryTableFields: fromRegistryTableFields,
            };
        }
    };
}
