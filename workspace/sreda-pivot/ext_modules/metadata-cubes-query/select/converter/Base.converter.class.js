const { uniqueValues, mergeDeep, isEmptyObject } = require("../../../utils/services");

/**
 * @typedef {import("../types").ILevel} ILevel
 * @typedef {import("../../../../core/db/types").TField} TField
 * @typedef {import("../../../metadata-connector/services/metadata/connectors/AbstractConnector").IWithOption} IWithOption
 */

class BaseConverterClass {
    /**
    * Формирование финального объекта для ORM
    * 
    * @public
    * 
    * @param {ILevel[]} arr 
    * @param {TField[]} optionsAttributes 
    * @param {number} index 
    * @returns 
    */
    static convert(arr, optionsAttributes, index) {
        if (!arr?.length) return null;

        const genAttributes = [];
        /** @type {IWithOption[]} */
        const withOptions = [];
        const attributes = {};
        const where = {};
        const genGroup = [];
        const ignoreGroupArr = new Set();
        const ignoreAttrMap = {};
        const localAdditionalAttributes = [];
        let isGroup = false;

        arr.forEach(({
            additionalAttributes,
            removeAttribute,
            ignoreGroup,
            ignoreAttribute,
            isGroup: needGroup,
            withOption,
            attribute,
            group,
            field,
            where: localWhere
        }) => {
            isGroup ||= needGroup;
            localWhere !== undefined && mergeDeep(where, localWhere);

            field && genAttributes.push([field, attribute]);

            withOption && withOptions.push(withOption);

            if (ignoreGroup) {
                ignoreGroupArr.add(ignoreGroup);
                ignoreGroupArr.add(ignoreGroup.replaceAll('"', ''));
            }

            ignoreAttribute && (ignoreAttrMap[ignoreAttribute] = true);

            removeAttribute && optionsAttributes.splice(optionsAttributes.findIndex((i) => i === removeAttribute), 1)

            // TODO
            //@ts-ignore
            additionalAttributes?.length && optionsAttributes.push(...additionalAttributes);
            additionalAttributes?.length && localAdditionalAttributes.push(...additionalAttributes);

            if (attribute && !Array.isArray(attribute) && typeof attribute === 'object') {
                attributes[attribute.alias] ||= [];
                attributes[attribute.alias].push(attribute);

                group && genGroup.push(attribute.field);
            }
        });

        if (
            (
                !localAdditionalAttributes.length
                || localAdditionalAttributes.every((item) => !ignoreAttrMap[item])
            ) &&
            !isGroup &&
            !genAttributes.length &&
            !withOptions.length &&
            isEmptyObject(where) &&
            index
        ) {
            return null
        }

        genAttributes.forEach(([attribute, field]) => attributes[field] ||= attribute);

        optionsAttributes.forEach((attr) => attributes[attr] ||= attr);

        let attrs = [];
        Object
            .entries(attributes)
            .map(
                ([key, value]) => {
                    if (Array.isArray(value)) {
                        const check = value.some((i) => typeof i === 'object');

                        if (check) {
                            attrs.push(...value);

                            return;
                        }
                    }

                    if (typeof value === 'object') {
                        attrs.push(value);

                        return
                    }

                    attrs.push(value === key ? value : [value, key]);
                }
            );

        attrs = attrs.filter(i => !ignoreAttrMap[i] || localAdditionalAttributes.includes(i));

        let group = [];
        if (isGroup) {
            const temp = [...genGroup, ...attrs]
                .map((i) => {
                    if (Array.isArray(i)) return i[1];

                    if (typeof i === 'object') return i.field.replaceAll(`"`, '');

                    return i;
                })

            group = temp
                .filter(i => !ignoreGroupArr.has(i))
        }

        return {
            where,
            withOptions,
            attributes: attrs.sort(),
            group: uniqueValues(group).sort(),
        };
    }
}

module.exports = BaseConverterClass;
