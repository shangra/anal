const sequelize = require('../../core/db/connection');

const transactionAgents = [];

class TransactionAgent {
    _provider;

    constructor(provider) {
        //this._provider = provider.connector;
        this._provider = sequelize; //Это костыль транзакции могут начаться на одном сервере а закончиться на другом
    }

    async transaction(...args) {
        return this._provider.transaction(...args);
    }
}

module.exports = TransactionAgent;
