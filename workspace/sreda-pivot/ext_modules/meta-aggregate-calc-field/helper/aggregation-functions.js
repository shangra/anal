const { default: Decimal } = require('decimal.js');

class Aggregation {
    static sum = (data) => {
        return data.reduce((total, val) => total + Number(val) || 0, 0);
    };
    static account = (data) => {
        return this.sum(data);
    };
    static len = (data) => {
        return data.length;
    };
    static count = (data) => {
        return data.length;
    };
    static avg = (data) => {
        return this.mean(data);
    };
    static mean = (data) => {
        /** @type {Decimal} */
        let result = data.reduce((total, val) => total.plus(Decimal(val || 0)), new Decimal(0));
        return result.div(new Decimal(data.length || 0)).toNumber();
    };
    static last_value = (data) => {
        return this.mean(data.filter((item) => item));
    };
    static first_value = (data) => {
        return this.mean(data.filter((item) => item));
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
