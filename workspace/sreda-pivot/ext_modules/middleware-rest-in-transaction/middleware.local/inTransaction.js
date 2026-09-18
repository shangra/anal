const { Sequelize } = require('sequelize');
const onFinished = require('on-finished');
const cls = require('cls-hooked');

const namespace = cls.createNamespace('sequelize-namespace');

Sequelize.useCLS(namespace);

const connection = require('../../../core/db/connection');

const inTransaction = (req, res, next) => {
    namespace.bindEmitter(req);
    namespace.bindEmitter(res);
    namespace.bind(next);
    namespace.run(async () => {
        const transaction = await connection.transaction({ autocommit: false });
        namespace.set('transaction', transaction);
        onFinished(res, (err) => {
            if (!err) {
                transaction.commit();
            } else {
                transaction.rollback();
            }
        });
        next();
    });
};

module.exports = inTransaction;
