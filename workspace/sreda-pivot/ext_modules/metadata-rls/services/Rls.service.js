const { Op } = require('sequelize');
const httpContext = require('../../../core/services/http-context');
const jsonLogic = require('json-logic-js');

const ApiError = require('../../../core/exceptions/ApiError');

const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

const RlsClass = require('./metadata/Rls.class');

const InfoserviceService = require('../../metadata-infoservice/services/Infoservice.service');

const constants = require('../constants');

class RlsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Rls';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form(id) {
        const result = {
            form: [
                {
                    name: 'objectid',
                    description: 'Название инфосервиса',
                    useParent: false,
                    type: 'REF',
                    link: new InfoserviceService().id,
                    class: InfoserviceService,
                },
            ],
        };

        return result;
    }

    async getValueByPathObject(obj, pathObject) {
        let result;
        const name = pathObject.pop();
        result = obj?.[name];

        if (pathObject.length > 0) {
            result = await this.getValueByPathObject(result, pathObject);
        }
        return result;
    }

    fromJSON(json) {
        try {
            return JSON.parse(json || '{}');
        } catch (e) {
            console.error(e);
        }

        return {};
    }

    /**
     * @param {{ classId?: string, id: string }} classId
     * @returns
     */
    async getMetadataRls({ classId, id }) {
        const where = {
            [Op.and]: [
                { class_id: this.id },
                { manifest: { [Op.like]: `%${id}%` } },
            ],
        };

        const rows = await Metadata.getMetadataByOptions(
            { where },
            { force: true }
        );

        return rows.filter((row) => {
            const manifest =
                typeof row.manifest === 'string'
                    ? this.fromJSON(row.manifest)
                    : row.manifest;
            const objectId = manifest?.settings?.objectid?.value;
            if (objectId !== id) {
                return false;
            }

            if (classId !== undefined) {
                const objectClassId = manifest?.settings?.objectid?.class_id;
                if (objectClassId !== undefined && objectClassId !== classId) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * @param {string} id
     */
    async getAllIds(id) {
        const rls = new RlsClass();

        const metadataRls = await this.getMetadataRls({ id });

        const ids = [];

        for (const item of metadataRls) {
            const tableInfo = await rls.tableInfo(rls, item.id);

            ids.push(item.id, ...Object.keys(tableInfo.ConditionsGUID));
        }

        return ids;
    }

    /**
     * @param {{ mapping: Record<string, string[]>} } fargs
     */
    async getIdsByMapping(innerResult, fargs, source) {
        const result = [];

        const { mapping } = fargs;

        for (const classId in mapping) {
            const ids = mapping[classId];

            const arr = await Promise.all(ids.map((id) => this.getAllIds(id)));

            result.push(arr);
        }

        return result.flat(Infinity);
    }

    normalizeConditionObject(conditionObject) {
        if (conditionObject === undefined || conditionObject === null) {
            return undefined;
        }

        if (
            Object.prototype.hasOwnProperty.call(conditionObject, 'where') &&
            Object.keys(conditionObject).length === 1
        ) {
            return conditionObject.where;
        }

        return conditionObject;
    }

    async readBefore(innerResult, fargs, source) {
        if (fargs.inputOptions === undefined) {
            fargs.inputOptions = {};
        }

        if (fargs.inputOptions.withOutMetaWhere) {
            return innerResult;
        }

        const metadataRls = await this.getMetadataRls({
            classId: fargs.this.id,
            id: fargs.id,
        });

        const allConditions = [];
        for (let i = 0; i < metadataRls.length; i++) {
            const condition = metadataRls[i];

            const meta = await Metadata.getParentInstance(
                condition.id,
                { force: true },
                RlsClass
            );
            const { ConditionsGUID } =
                (await meta.tableInfo(meta, condition.id, { force: true })) ||
                {};
            Object.values(ConditionsGUID).forEach(
                ({ conditionuser, conditionobject }) => {
                    allConditions.push({
                        conditionUser: this.fromJSON(conditionuser),
                        conditionObject: this.normalizeConditionObject(
                            this.fromJSON(conditionobject)
                        ),
                    });
                }
            );
        }

        const where = {};
        if (allConditions.length > 0) {
            // TODO: чтобы понять есть ли вообще хоть одно условие
            where['$or'] ||= [];

            const { user } = httpContext.get('sessionStorage');
            const userInfo = await this.getUserInfo(user);

            let allowAll = false;

            for (let i = 0; i < allConditions.length; i++) {
                const { conditionUser, conditionObject } = allConditions[i];

                let apply = true;
                if (
                    conditionUser !== undefined &&
                    Object.keys(conditionUser).length > 0
                ) {
                    apply = jsonLogic.apply(conditionUser, userInfo);
                }

                if (!apply) {
                    continue;
                }

                if (
                    conditionObject !== undefined &&
                    conditionObject !== null &&
                    Object.keys(conditionObject).length > 0
                ) {
                    where['$or'].push(conditionObject);
                } else {
                    allowAll = true;
                }
            }

            if (allowAll) {
                delete where['$or'];
            } else if (
                where['$or'] === undefined ||
                where['$or'].length === 0
            ) {
                throw ApiError.AccessRestricted(
                    `Не достаточно прав для просмотра данных`
                );
            }
        }

        fargs.inputOptions.metaAccessWhere = where;

        return innerResult;
    }

    async getUserInfo(user) {
        return {
            roles: Object.keys(user.roles),
            rules: Object.keys(user.rules),
            groups: Object.keys(user.groups),
            groupsAD: Object.keys(user.groupsAD ?? {}),
            attributes: user.attributes,
        };
    }

    async create(id, body) {
        // return new MainMetadata({ id: id }).create(id, body);
    }

    async read(id, options = {}) {
        //return new MainMetadata({ id: id }).read(id, options);
    }

    async update(id, body) {
        // return new MainMetadata({ id: id }).update(id, body);
    }

    async delete(id, body) {
        // return new MainMetadata({ id: id }).delete(id, body);
    }
}

module.exports = RlsService;
