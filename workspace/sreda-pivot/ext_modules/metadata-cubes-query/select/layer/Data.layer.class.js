/**
 * @typedef {import("../types").ISettings} ISettings
 * @typedef {import("../types").IFactoryInit} IFactoryInit
 * @typedef {import("../../../../db/rls/types/WhereOptions").TField} TField
 * @typedef {import("../../../../db/rls/types/WhereOptions").TAggField} TAggField
 * @typedef {import("../../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 */

const { getLast, uniqueValues } = require("../../../utils/services");
const { SEMI_ADDITIVE, COUNT } = require("../../constants");

class DataLayerClass {
    /**
     * 
     * @param {{ options: ISettings, treeObject: object, meta: IFactoryInit}} param0 
     */
    // constructor({ options, treeObject, meta } = {}) {
    //     this.options = options;
    //     this.meta = meta;
    //     this.logger = meta?.logger;
    //     this.delimeter = meta?.delimeter;
    // }

    // async generate({ attributesForDel, key, factory }) {
    //     let viewName = null;
    //     let field = key;
    //     if (typeof key !== 'object') {
    //         ([field, viewName] = key.split(this.delimeter));
    //         attributesForDel.push([key, field]);
    //     }

    //     /** @type {IFactoryInit} */
    //     const data = this.meta;

    //     // Предикат - является ли это поведением
    //     data.isBehaviour = !!viewName
    //         || this.options.attributesForDel?.includes(/** @type {string} */(key))
    //         || this.options.settings?.index?.includes(/** @type {string} */(key))
    //         || this.options.settings?.columns?.includes(/** @type {string} */(key));

    //     // Фабрика поведений для обработки иерархий
    //     const behaviour = await this.behaviourBuilder.init(data);
    //     // Фабрика поведений для обработки физического уровня
    //     const subBehaviour = await this.subFieldBuilder.init(data)

    //     const { before: subBef, current: sub, after: subAfter } = await subBehaviour.query(options, field, viewName);

    //     subBef && beforeSub.push(...subBef);
    //     sub && subQuery.push(...sub);
    //     subAfter && afterSubQuery.push(...subAfter);

    //     /**
    //      * если это вычисляемая мера (по типу суммы) то смысла дальше идти нет
    //      */
    //     if (typeof field === 'object') return;

    //     const { before, current, after, viewAlias } = await behaviour.query(options, field, viewName);

    //     before && beforeOptions.push(...before);
    //     current && currentOptions.push(...current);
    //     after && afterOptions.push(...after);
    // }

    /**
     * @public
     * 
     * @param {object[]} layers 
     * @param {TField[]} attributes 
     */
    mutate(layers, attributes) {
        if (!layers?.length) return { layers, aggFields: [], attributesForDel: [] };

        const layerAttrs = getLast(layers).attributes;

        const check = attributes.some((attr) => /** @type {object} */(attr).func);

        if (!check) return { layers, aggFields: [], attributesForDel: [] };

        const aggregations = attributes.filter((attr) => /** @type {object} */(attr).func);
        const aggregationFields = aggregations.map((attr) => /** @type {object} */(attr).field);

        const workAttrs = uniqueValues(structuredClone([...layerAttrs.filter((attr) => !aggregationFields.includes(attr)), ...aggregations]));

        let { attrs, aggFields, attributesForDel } = this.mutateDataLayerAggregations(structuredClone(workAttrs));

        const group = [];
        attrs = attrs.map(attr => {
            if (Array.isArray(attr)) {
                group.push(attr[1]);
                return attr[1];
            }

            if (typeof attr === 'object') return attr;

            group.push(attr);

            return attr;
        });

        attributes = this.mutateFinalAggregations(attributes);

        const options = { attributes: attrs.sort(), group: group.sort() };

        return { layers: [...layers, options], aggFields, attributesForDel };
    }

    /**
     * @private
     * 
     * @param {TField[]} attributes 
     */
    mutateDataLayerAggregations(attributes) {
        const attrs = {};

        const aggFields = new Set();
        const attributesForDel = new Set();

        attributes.forEach((/** @type {TAggField} */attr) => {
            if (SEMI_ADDITIVE.includes(attr?.func?.toUpperCase())) {
                attr.func = 'SUM';
            }

            if (attr.func) {
                attrs[attr.alias] ||= attr;
                aggFields.add(attr.alias);
                attributesForDel.add(attr.field);
            } else {
                attrs[attr] ||= attr;
            }
        });

        return { attrs: Object.values(attrs), aggFields: Array.from(aggFields), attributesForDel: Array.from(attributesForDel) };
    }

    /**
     * @private
     * 
     * @param {TField[]} attributes 
     * 
     * @returns {any}
     */
    mutateFinalAggregations(attributes) {
        return attributes.map((/** @type {TAggField} */attr) => {
            if (COUNT.includes(attr?.func?.toUpperCase())) {
                attr.func = 'SUM';
            }

            if (attr.func) {
                attr.field = `"${attr.alias}"`;
            }

            return attr;
        });
    }
}

module.exports = DataLayerClass;