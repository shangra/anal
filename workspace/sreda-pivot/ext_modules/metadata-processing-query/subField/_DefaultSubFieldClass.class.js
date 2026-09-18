const DefaultProcessingClass = require("../default");

/**
 * @abstract
 */
class DefaultSubFieldClass extends DefaultProcessingClass {
    /**
    * @param {{
    *    refItem: object,
    *    field: string | object,
    * }} param0 
    */
    constructor({ refItem, field }) {
        super();

        this.refItem = refItem;
        this.field = field;
    }

    delimeter = ':->:';
}

module.exports = DefaultSubFieldClass;