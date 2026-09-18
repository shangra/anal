const SemiAdditiveAttributeClass = require("../attributes/SemiAdditive.attribute.class");
const AggregateAttributeClass = require("../attributes/Aggregate.attribute.class");
const BaseAttributeClass = require("../attributes/Base.attribute.class");

class AttributeFactoryClass {
    enities = [
        BaseAttributeClass,
        AggregateAttributeClass,
        SemiAdditiveAttributeClass
    ].sort((a, b) => a.rank = b.rank)

    init({ attribute, delimeter, dateDimension, settings }) {
        for (const Enitiy of this.enities) {
            const item = new Enitiy({ attribute, delimeter, dateDimension, settings });

            const check = item.isValid();
            if (check) {
                return item;
            }
        }
    }
}

module.exports = AttributeFactoryClass;