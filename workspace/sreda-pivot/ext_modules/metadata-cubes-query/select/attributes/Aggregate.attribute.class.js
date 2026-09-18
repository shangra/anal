const DefaultClass = require("./_Default.attribute.class");

/**
 * @typedef {import("../types").ILevel} ILevel
 * @typedef {import("../types").IBehaviourOptions} IBehaviourOptions
 */

class AggregateAttributeClass extends DefaultClass {
    isValid() {
        return !this.isSemiAddtitive([this.attribute]);
    }

    static rank = 2;

    parse() {
        const isGroup = true;

        /** @type {ILevel} */
        const levelData = {
            isGroup: false,
            field: this.attribute.alias,
            attribute: this.attribute.alias,
            ignoreAttribute: this.attribute.field,
        };

        /** @type {IBehaviourOptions} */
        const result = {
            before: [
                {
                    isGroup,
                    attribute: this.attribute,
                    ignoreGroup: this.attribute.field,
                    ignoreAttribute: this.attribute.field,
                }
            ],
            current: [{ ...levelData }],
            after: [
                {
                    ...levelData,
                    attribute: this.attribute.alias,
                    ignoreGroup: this.attribute.field,
                    ignoreAttribute: this.attribute.field,
                    isGroup
                }
            ]
        };

        return result;
    }
}

module.exports = AggregateAttributeClass;