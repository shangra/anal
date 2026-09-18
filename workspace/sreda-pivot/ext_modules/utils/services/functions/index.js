const pandas = require('./pandasJS');
const basicSet = require('./basicSet');
const systemsSet = require('./systemsSet');
const aggregation = require('./aggregation');
const context = require('./context');

module.exports = { ...pandas, ...basicSet, ...systemsSet, ...aggregation, ...context };
