/**
 * @typedef {import('../../select/types').ISettings} ISettings
 * @typedef {import('../../../../db/rls/types/WhereOptions').TField} TField
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').IRef} IRef
 * @typedef {import('../../../../db/rls/types/WhereOptions').TAggField} TAggField
 * @typedef {import('../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import("../../../../db/rls/types/WhereOptions").WhereOptions} WhereOptions
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 */

const Extensions = require('../../../../core/class/Extensions.class');

const { isEmptyObject } = require('../../../utils/services');
const constants = require('../../constants');

class AccessClass extends Extensions {
    /**
     * @param {{ meta: MetadataService, logger: any }} param0 
     */
    constructor({ meta, logger }) {
        super();

        this.meta = meta;
        this.logger = logger;
    }

    /**
     * @public
     * 
     * @param {{ id, options: ISettings, metaClass: MetadataService }} param0 
     * @returns {Promise<{ union: boolean, mappedOptions:object[] }>}
     */
    async matrix({ id, options }) {
        if (!options.isMask) {
            return { union: false, mappedOptions: [options] };
        }

        /**
         * запрос без ограничений видимости рефов
         */
        const loptions = structuredClone(options);

        loptions.maskFields = await this.getMaskFields(id, [...loptions.settings.index, ...loptions.settings.columns, ...loptions.attributesForDel]);

        if (!loptions.maskFields?.length) {
            options.isMask = false;
            options.maskWhere = {};

            return { union: false, mappedOptions: [options] };
        }

        /**
         * на замаскированные данные запрещено ставить фильтры пользователям
         */
        loptions.maskFields.map((attr) => {
            delete options.where[attr];
            delete loptions.where[attr];
        });

        options.totals = {};

        loptions.maskWhere = {};
        loptions.withOutRefs = true;

        options.withOutRefs = false;

        return { union: true, mappedOptions: [options, loptions] };
    }

    /**
     * WARNING
     * 
     * метод используется в перегрузке RLS service
     * для работы перегрузки getMaskFields
     * 
     * 
     * @param {string} str 
     * @returns {string}
     */
    sanitizeName(str) {
        const [val] = str.split(constants.subDimensionDelimeter);

        return val;
    }

    /**
     * метод для перегрузки - в него докидываются поля по которым будет маскирование
     * 
     * @param {string} id 
     * @param {string[]} attributes 
     * @returns {Promise<string[]>}
     */
    async getMaskFields(id, attributes) { return []; }
}

module.exports = AccessClass;