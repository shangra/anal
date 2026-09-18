const session = require('../appended/session');

// TODO: оно тут не надо по хорошему
const SYSTEM_SIDS = [
    's%DEVELOPED_REACT_PROJECT_FOR_SBER--.NotSecure',
    's%worker',
];

module.exports = (res, req, next) =>
    !SYSTEM_SIDS.includes(res?.cookies?.SID) ? session(res, req, next) : next();
