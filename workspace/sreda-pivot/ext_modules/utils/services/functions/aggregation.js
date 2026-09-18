const { default: Decimal } = require('decimal.js');

class Aggregation {
    static sum = (data) => {
        return data.reduce((total, val) => total + Number(val) || 0, 0);
    };
    static len = (data) => {
        return data.length;
    };
    static count = (data) => {
        return data.length;
    };
    static mean = (data) => {
        /** @type {Decimal} */
        let result = data.reduce((total, val) => total.plus(Decimal(val)), new Decimal(0));
        return result.div(new Decimal(data.length || 0)).toNumber();
    };
    static min = (data) => {
        return Math.min.apply(null, data);
    };
    static max = (data) => {
        return Math.max.apply(null, data);
    };
}

module.exports = {
    Aggregation,
};
