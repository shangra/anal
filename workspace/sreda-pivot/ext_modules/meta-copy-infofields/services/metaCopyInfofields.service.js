const Extensions = require('../../../core/class/Extensions.class');
const { sequelize } = sreda.models;
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const { Op } = require('sequelize');
const Metadata = new MetadataClass();

/**
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * @typedef {import('./types/Button')} Button
 */

class metaCopyInfofieldsService extends Extensions {
    /**
     * @param {{ buttons?: Button[] }} innerResult
     * @param {{ id: string }} functionInput
     * @returns
     */
    async formAfter(innerResult, functionInput) {
        const id = functionInput.id;
        /** @type {Button} */
        const newButton = {
            name: 'MetaCubeCopyInfofields',
            component: 'MetaCubeCopyInfofields',
            props: {
                type: 'update',
                icon: 'bi bi-check-circle-fill',
                title: 'Заполнить полями инфосервисов',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metacopyinfofields/copyfield/${id}`,
            },
        };

        innerResult.buttons?.push(newButton);

        return innerResult;
    }

    async setInfoservices(mData, id, MeasuresObject, DimensionsObject) {
        let newTree = await mData.classInstance.info(mData.classInstance, id);

        await Promise.all(
            [MeasuresObject, DimensionsObject].map(async (obj) =>
                this.setInfoFields(obj, newTree, mData.classInstance.component)
            )
        );

        return newTree;
    }

    async setInfoFields(object, newTree, component) {
        const keys = Object.keys(object);

        const promise = keys.map(async (key) => {
            const Value = object[key];
            if (Value.typeInsert === 'insert') {
                for (const InfoserviceKey in Value.Infoservices) {
                    let template;
                    if (component === 'Reports') {
                        template = this.parseTemplateReports(Value, InfoserviceKey, newTree);
                    } else {
                        template = this.parseTemplateCubes(Value, InfoserviceKey, newTree);
                    }

                    await Metadata.setMetadata(template);
                }
            }

            if (Value.typeInsert === 'update') {
                for (const InfoserviceKey in Value.Infoservices) {
                    let template;
                    if (component === 'Reports') {
                        template = this.parseTemplateReports(Value, InfoserviceKey, newTree);
                    } else {
                        template = this.parseTemplateCubes(Value, InfoserviceKey, newTree);
                    }

                    await this.updateOrCreateMetadataManifestWithoutId(template, {});
                }
            }
        });

        await Promise.all(promise);
    }

    async copyfield(id, body) {
        return sequelize.transaction(async (t) => this._copyfield(id, body));
    }

    async _copyfield(id, body) {
        const mData = await Metadata.getMetadata(id, { instance: true });
        const ids = {};
        mData.children.forEach((child) => (ids[child.class] = child.class_id));

        let tree = await mData.classInstance.info(mData.classInstance, id);

        const MeasuresObject = {};
        const DimensionsObject = {};

        const Measures = {};
        const UpdateMeasures = {};
        const Dimensions = {};
        const UpdateDimensions = {};
        for (const InfoserviceKey in tree.Infoservices) {
            const Infoservice = tree.InfoservicesGUID[InfoserviceKey];
            for (const fieldKey in Infoservice.Fields) {
                const field = Infoservice.Fields[fieldKey];
                if (field.type === 'float') {
                    if (!MeasuresObject[fieldKey]) {
                        MeasuresObject[fieldKey] = {
                            Infoservices: {
                                [InfoserviceKey]: Infoservice,
                            },
                            InfoserviceInfo: {
                                [InfoserviceKey]: tree.Infoservices[InfoserviceKey],
                            },
                            typeInsert: 'update',
                        };
                    } else {
                        MeasuresObject[fieldKey].Infoservices = {
                            ...MeasuresObject[fieldKey].Infoservices,
                            [InfoserviceKey]: Infoservice,
                        };
                        MeasuresObject[fieldKey].InfoserviceInfo = {
                            ...MeasuresObject[fieldKey].InfoserviceInfo,
                            [InfoserviceKey]: tree.Infoservices[InfoserviceKey],
                        };
                    }
                    if (!tree?.AllMeasures?.[fieldKey]) {
                        MeasuresObject[fieldKey].typeInsert = 'insert';
                        Measures[field.field] = {
                            owner_id: id,
                            class_id: ids.Measures,
                            class: 'Measures',
                            name: field.name,
                            description: field.description,
                            settings: { nameField: field.field, type: field.type },
                        };
                    } else {
                        MeasuresObject[fieldKey].typeInsert = 'update';
                        UpdateMeasures[fieldKey] = {
                            owner_id: id,
                            class_id: ids.Measures,
                            class: 'Measures',
                            name: field.name,
                            description: field.description,
                            // groupTag: mData?.treeObject?.AllMeasures?.[fieldKey]?.groupTag,
                            settings: {
                                nameField: field.field,
                                type: field.type,
                                onoff: tree.AllMeasures[fieldKey]?.onoff,
                                groupTag: mData?.treeObject?.AllMeasures?.[fieldKey]?.groupTag,
                                format: mData?.treeObject?.AllMeasures?.[fieldKey]?.format,
                                aggrFunc: mData?.treeObject?.AllMeasures?.[fieldKey]?.aggrFunc,
                            },
                        };
                    }
                } else {
                    if (!DimensionsObject[fieldKey]) {
                        DimensionsObject[fieldKey] = {
                            Infoservices: {
                                [InfoserviceKey]: Infoservice,
                            },
                            InfoserviceInfo: {
                                [InfoserviceKey]: tree.Infoservices[InfoserviceKey],
                            },
                            typeInsert: 'update',
                        };
                    } else {
                        DimensionsObject[fieldKey].Infoservices = {
                            ...DimensionsObject[fieldKey].Infoservices,
                            [InfoserviceKey]: Infoservice,
                        };
                        DimensionsObject[fieldKey].InfoserviceInfo = {
                            ...DimensionsObject[fieldKey].InfoserviceInfo,
                            [InfoserviceKey]: tree.Infoservices[InfoserviceKey],
                        };
                    }
                    if (!tree?.AllDimensions?.[fieldKey]) {
                        DimensionsObject[fieldKey].typeInsert = 'insert';
                        Dimensions[field.field] = {
                            owner_id: id,
                            class_id: ids.Dimensions,
                            class: 'Dimensions',
                            name: field.name,
                            description: field.description,
                            settings: {
                                nameField: field.field,
                                type: field.type,
                            },
                        };
                    } else {
                        DimensionsObject[fieldKey].typeInsert = 'update';
                        UpdateDimensions[fieldKey] = {
                            owner_id: id,
                            class_id: ids.Dimensions,
                            class: 'Dimensions',
                            name: field.name,
                            description: field.description,
                            // groupTag: mData?.treeObject?.AllDimensions?.[fieldKey]?.groupTag,
                            settings: {
                                nameField: field.field,
                                type: field.type,
                                onoff: tree.AllDimensions[fieldKey]?.onoff,
                                groupTag: mData?.treeObject?.AllDimensions?.[fieldKey]?.groupTag,
                                dateDimension:
                                    mData?.treeObject?.AllDimensions?.[fieldKey]?.dateDimension,
                                format: mData?.treeObject?.AllMeasures?.[fieldKey]?.format,
                                aggrFunc: mData?.treeObject?.AllMeasures?.[fieldKey]?.aggrFunc,
                            },
                        };
                    }
                }
            }
        }

        // TODO переделать паралельным запуском с массивами
        for (const MeasureKey in Measures) {
            await this.create(MeasureKey, Measures, MeasuresObject);
        }

        for (const MeasureKey in UpdateMeasures) {
            await this.update(MeasureKey, UpdateMeasures, MeasuresObject);
        }

        for (const DimensionKey in Dimensions) {
            await this.create(DimensionKey, Dimensions, DimensionsObject);
        }

        for (const DimensionKey in UpdateDimensions) {
            await this.update(DimensionKey, UpdateDimensions, DimensionsObject);
        }

        const newTree = await this.setInfoservices(mData, id, MeasuresObject, DimensionsObject);

        await this.clearDiff(newTree, tree);

        return { result: newTree };
    }

    async clearDiff(newTree, tree) {
        const { Dimensions, Measures } = newTree;

        const deleteIds = [];

        for (const dimensionKey in Dimensions) {
            const infos = Object.values(tree.InfoservicesGUID);

            const isNotFound = infos.every(
                ({ Fields }) => !Fields[dimensionKey] || Fields[dimensionKey].type === 'float'
            );
            if (isNotFound) {
                deleteIds.push(Dimensions[dimensionKey].id);
                continue;
            }
        }

        for (const measureKey in Measures) {
            const infos = Object.values(tree.InfoservicesGUID);

            const isNotFound = infos.every(
                ({ Fields }) => !Fields[measureKey] || Fields[measureKey].type !== 'float'
            );
            if (isNotFound) {
                deleteIds.push(Measures[measureKey].id);
                continue;
            }
        }

        return Promise.all(deleteIds.map(async (id) => await Metadata.delMetadata(id)));
    }

    async create(key, obj, resObj) {
        const value = obj[key];
        const data = await Metadata.setMetadata(value);
        const rData = data.dataValues ?? data;
        resObj[key].data = { ...rData, manifest: JSON.parse(rData.manifest) }; //await Metadata.getMetadata(data.id, { instance: true });
    }

    async update(key, obj, resObj) {
        const value = obj[key];
        const res = await this.updateOrCreateMetadataManifestWithoutId(value, {
            manifest: { [Op.like]: `%"nameField" : "${value.settings.nameField}"%` },
        });
        // не смогли найти что нужно поменять - скипнем запись
        if (!res) {
            delete resObj[key];
            return;
        }
        const rRes = res.dataValues ?? res;
        resObj[key].data = { ...rRes, manifest: JSON.parse(rRes.manifest) }; //await Metadata.getMetadata(data.id, { instance: true });
    }

    parseTemplateCubes(Value, InfoserviceKey, newTree) {
        const InfoserviceInfo = Value.InfoserviceInfo[InfoserviceKey];

        const infoservice = {
            link: newTree.Infoservices[InfoserviceKey].class_id,
            value: newTree.InfoservicesGUID[InfoserviceKey].parentInfo.id,
        };

        const template = {
            owner_id: Value.data.id, //'e42b2336-1159-43e4-b428-e394d00cdca3',
            class_id: '4bc0bfd0-6fb5-4f85-8668-117a42604ddc',
            class: 'InfoserviseList',
            name: InfoserviceInfo.name,
            description: InfoserviceInfo.description,
            settings: {
                infoservice,
                field: {
                    link: '1fa330a3-4b65-42e4-b12f-1fabd0c08945',
                    value: Value.Infoservices[InfoserviceKey].Fields[
                        Value.data.manifest.settings.nameField
                    ].id,
                },
            },
        };

        return template;
    }

    parseTemplateReports(Value, InfoserviceKey, newTree) {
        const InfoserviceInfo = Value.InfoserviceInfo[InfoserviceKey];

        const infoservice = {
            link: newTree.Infoservices[InfoserviceKey].class_id,
            value: newTree.InfoservicesGUID[InfoserviceKey].parentInfo.id,
        };

        const template = {
            owner_id: Value.data.id, //'e42b2336-1159-43e4-b428-e394d00cdca3',
            class_id: '04ef8cae-65fe-4ad2-9e5f-121419c652ad',
            class: 'InfoserviseList',
            name: InfoserviceInfo.name,
            description: InfoserviceInfo.description,
            settings: {
                infoservice,
                field: {
                    link: '1fa330a3-4b65-42e4-b12f-1fabd0c08945',
                    value: Value.Infoservices[InfoserviceKey].Fields[
                        Value.data.manifest.settings.nameField
                    ].id,
                },
            },
        };

        return template;
    }

    /**
     * @param {object} metadata
     * @param {WhereOptions} searchWhere
     * @returns
     */
    async updateOrCreateMetadataManifestWithoutId(metadata, searchWhere) {
        const where = {
            owner_id: metadata.owner_id,
            class_id: metadata.class_id,
            class: metadata.class,
        };

        const name = metadata.name || metadata.description;
        const sanitizedName = Metadata.sanitizedName(name);

        const whereName = [sanitizedName, name];
        if (Object.keys(searchWhere).length) {
            where[Op.or] = [{ name: whereName }, searchWhere];
        } else {
            where.name = whereName;
        }

        const [oldMeta] = await Metadata.getMetadataByOptions({
            where,
            attributes: ['id'],
            limit: 1,
        });

        metadata.name = sanitizedName;
        if (!oldMeta) {
            return Metadata.setMetadata(metadata);
            // return null;
        }

        return Metadata.updMetadata(oldMeta.id, metadata);
    }
}

module.exports = metaCopyInfofieldsService;
