// Инициализируем реестр моделей до подключения к БД:
// при недоступной БД require выше бросает исключение, и core/index.js его
// перехватывает. Если бы sreda.models не был создан, стартовое разрушение
// вида `const { User } = sreda.models` в сервисах уронило бы весь процесс.
sreda.models = {};

const Sequelize = require('sequelize');
const PatroniSwitcher = require('patroni-switcher');
const connection = require('../connection');

const _models = require('../../../ext_modules/models');

/**
 * @import { Model, ModelStatic } from 'sequelize'
 * @import { AssociateMethods } from '../rls/types'
 */

Object.values(_models)
    .flat()
    .forEach((cb) => {
        const model = /** @type {ModelStatic<Model> & AssociateMethods} */ (
            cb(connection, Sequelize.DataTypes)
        );
        sreda.models[model.name] = model;
    });

Object.keys(sreda.models).forEach((model) =>
    sreda.models[model]?.associate?.(sreda.models)
);

module.exports = {};
