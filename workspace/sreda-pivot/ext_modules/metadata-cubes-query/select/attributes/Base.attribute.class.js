const DefaultClass = require("./_Default.attribute.class");

/**
 * @typedef {import("../types").ILevel} ILevel
 */

class BaseAttributeClass extends DefaultClass {
    isValid() {
        return typeof this.attribute !== 'object' || Array.isArray(this.attribute);
    }

    static rank = 0;

    parse() {
        const isArray = Array.isArray(this.attribute);
        let [field, attribute] = isArray ? this.attribute : [this.attribute, this.attribute];

        let isSubDiv = false;
        if (typeof this.attribute === 'string' && ~this.attribute.indexOf(this.delimeter)) {
            ([field] = this.attribute.split(this.delimeter));

            isSubDiv = true;
        }

        /** @type {ILevel[]} */
        const level = [
            {
                field: isArray ? attribute : this.attribute,
                attribute: this.attribute,
                ignoreAttribute: isSubDiv ? field : null,
                additionalAttributes: !isSubDiv ? [attribute] : null
            }
        ];

        return {
            before: level,
            current: level,
            after: level
        }
    }
}

module.exports = BaseAttributeClass;