const TotalClass = require("./dialects/base/Total.class");
const TotalGroupingClass = require("./dialects/grouping/Total.grouping.class");

class TotalFactoryClass {
    static enitities = [
        TotalGroupingClass,
        TotalClass,
    ].sort((a, b) => a.rank - b.rank);

    static init({ connector, treeObject, options }) {
        const dateDimension = options?.settings?.dateDimension;

        for (const Enity of this.enitities) {
            const val = new Enity({ connector, treeObject, dateDimension });

            const check = val.isValid({ connector, options });
            if (check) {
                return val;
            }
        }
    }
}

module.exports = TotalFactoryClass;