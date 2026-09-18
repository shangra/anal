const Sequelize = require('sequelize');
const PatroniSwitcher = require('patroni-switcher');
const connection = require('../connection');

const _models = require('../../../ext_modules/models');

/**
 * @import { Model, ModelStatic } from 'sequelize'
 * @import { AssociateMethods } from '../rls/types'
 */

sreda.models = {};

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
