const DefaultClass = require("../_default/Default.class");

const simeAdditive = ['LAST_VALUE', 'FIRST_VALUE']

class DefaultAttributeClass extends DefaultClass {
    constructor({ attribute, delimeter, dateDimension, settings }) {
        super();

        this.attribute = attribute;
        this.delimeter = delimeter;
        this.dateDimension = dateDimension;
        this.settings = settings;
    }

    /**
     * Костыль
     * 
     * @protected
     * 
     * @param {{ func: string }[]} arr 
     * @returns {boolean} 
     */
    isSemiAddtitive(arr) {
        return !!arr.find((i) => simeAdditive.includes(i?.func))
    }
}

module.exports = DefaultAttributeClass;