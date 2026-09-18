const StoreServiceClass = require('../services/Store.service');
const StoreService = new StoreServiceClass();

const appendUserData = async (req, res, next) => {
    // TODO: Every REST make useless query to DB
    await StoreService.getAllUserData();

    next();
};

module.exports = appendUserData;
