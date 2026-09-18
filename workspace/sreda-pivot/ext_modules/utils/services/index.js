const predicates = require('./predicates');
const functions = require('./functions');
const constants = require('./constants');

module.exports = {
    ...predicates,
    ...constants,
    ...functions,
};
