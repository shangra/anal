const ApiError = require('../../../core/exceptions/ApiError');
const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const InfoserviceService = require('./Infoservices.service');
const InfoserviseListClass = require('./metadata/shared/InfoserviseList.class');

function refPart(ref) {
    if (ref == null || ref === '') {
        return { link: null, value: null };
    }
    if (typeof ref === 'string') {
        return { link: null, value: ref };
    }
    return {
        link: ref.link ?? null,
        value: ref.value ?? ref.id ?? null,
    };
}

function ownerFields(metadata = {}) {
    const settings = metadata.settings && typeof metadata.settings === 'object' ? metadata.settings : {};
    return {
        owner_id: metadata.owner_id,
        name: metadata.name ?? metadata.manifest?.name,
        description: metadata.description ?? metadata.manifest?.description,
        infoservice: refPart(settings.infoservice ?? metadata.infoservice),
        field: refPart(settings.field ?? metadata.field),
    };
}
class InfoserviseListService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'InfoserviseList';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'infoservice',
                    description: 'Инфосервис',
                    type: 'REF',
                    link: new InfoserviceService().id,
                    class: InfoserviceService,
                },
                {
                    name: 'field',
                    description: 'Поле инфосервиса',
                    type: 'REF',
                    parent: 'infoservice.manifest.settings.ref.value',
                    link: {
                        parent: 'infoservice.manifest.settings.ref.link',
                        field: ['AllFields']
                    },
                },
            ],
        };
    }

    async createMetadata(metadata, options) {
        const { owner_id, name, description, infoservice, field } = ownerFields(metadata);
        const { transaction, force = false } = options ?? {};

        if (!infoservice.value) {
            throw ApiError.BadRequest('Выберите инфосервис');
        }

        return super.createMetadata({
            class_id: this.id,
            class: this.component,
            owner_id,
            name,
            description,
            settings: {
                infoservice,
                field,
            }
        }, {
            transaction,
            force
        });
    }

    async updateMetadata(id, metadata, options) {
        const { owner_id, name, description, infoservice, field } = ownerFields(metadata);
        const { transaction, force = false } = options ?? {};

        if (!infoservice.value && !field.value) {
            try {
                return await super.updateMetadata(id, metadata, options);
            } catch (e) {
                if (metadata?.form || metadata?.type === 'update') {
                    return super.metadataItem(id);
                }
                throw e;
            }
        }

        return super.updateMetadata(id, {
            class_id: this.id,
            class: this.component,
            owner_id,
            name,
            description,
            settings: {
                infoservice,
                field,
            }
        }, {
            transaction,
            force
        });
    }

    async create(id, body) {
        // return new MainMetadata({ id: id }).create(id, body);
    }

    async read(id, options = {}) {
        // return new MainMetadata({ id: id }).read(id, options);
    }

    async update(id, body) {
        // return new MainMetadata({ id: id }).update(id, body);
    }

    async delete(id, body) {
        // return new MainMetadata({ id: id }).delete(id, body);
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.InfoserviseList.id, InfoserviseListClass);
    global.sreda.bottle.factory('infoserviseListService', () => new InfoserviseListService());
}

module.exports = InfoserviseListService;
