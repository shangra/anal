const DefaultClass = require("./_Default.attribute.class");
const ApiError = require("../../../../core/exceptions/ApiError");
const { uniqueValues } = require("../../../utils/services");

/**
 * @typedef {import("../types").ILevel} ILevel
 * @typedef {import("../types").IBehaviourOptions} IBehaviourOptions
 */

class SemiAdditiveAttributeClass extends DefaultClass {
    isValid() {
        return this.isSemiAddtitive([this.attribute]);
    }

    static rank = 1;

    parse() {
        if (!this.dateDimension) {
            throw ApiError.BadRequest('не заданно измерение времени для расчета полуаддитивных мер');
        }

        const attribute = structuredClone(this.attribute);

        const originalField = attribute.field;

        attribute.field = attribute.alias;

        if ('LAST_VALUE' === this.attribute.func) {
            attribute.bounds = `rows between current row and unbounded following`;
        }

        const [index] = this.settings?.index || [];
        const [column] = this.settings?.columns || [];

        this.attribute.func = 'SUM';

        attribute.windowFunc = 'OVER';
        attribute.aggrFields ||= uniqueValues([index, column]);
        attribute.order ||= [this.dateDimension.field];

        /**
         * для формирования полуаддитивных мер используется алгоритм
         *   сформируем сумму по искомому полю
         *   применим к ней функцию LAST_VALUE FIRST_VALUE
         *   группируем полученные значение
         */
        /** @type {IBehaviourOptions} */
        const result = {
            before: [
                {
                    isGroup: true,
                    attribute: this.attribute,
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                    additionalAttributes: [this.dateDimension.field],
                },
            ],
            current: [
                {
                    attribute,
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                }
            ],
            after: [
                {
                    isGroup: true,
                    attribute: attribute.alias,
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                    additionalAttributes: [attribute.alias],
                }
            ]
        }

        return result;
    }
}

module.exports = SemiAdditiveAttributeClass;