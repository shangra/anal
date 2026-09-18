const { randomUUID } = require('node:crypto');
const MemorySave = require('../../../core/services/memory-save');
const ApiError = require('../../../core/exceptions/ApiError');

const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const MainMetadata = require('./metadata/Cubes.class');

const { sleep } = require('../../utils/services');

const constants = require('../constants');

class CubesService extends DefaultMetaObject {
    /** @deprecated */
    numberDefaultParams = [
        { name: 'sum', sqlName: 'SUM', label: 'Сумма', type: 'number' },
        { name: 'len', sqlName: 'COUNT', label: 'Количество', type: 'number' },
        { name: 'distinctLen', sqlName: 'DISTINCT_COUNT', label: 'Количество уникальных', type: 'number' },
        { name: 'mean', sqlName: 'AVG', label: 'Среднее', type: 'number' },
        { name: 'min', sqlName: 'MIN', label: 'Минимум', type: 'number' },
        { name: 'max', sqlName: 'MAX', label: 'Максимум', type: 'number' },
        {
            name: 'FirstChild',
            sqlName: 'FIRST_VALUE',
            label: 'Первый дочерний',
            type: 'number',
            combined: true
        },
        {
            name: 'LastChild',
            sqlName: 'LAST_VALUE',
            label: 'Последний дочерний',
            type: 'number',
            combined: true
        },
        {
            name: 'ACCOUNT',
            sqlName: 'ACCOUNT',
            label: 'Показатели',
            type: 'number',
            combined: true
        }
        // { name: 'FirstNonEmpty', sqlName: 'MAX', label: 'FirstNonEmpty', type: 'number' },
        // { name: 'LastNonEmpty', sqlName: 'MAX', label: 'LastNonEmpty', type: 'number' },
        // { name: 'multiple', label: 'Произведение', type: 'number' },
    ];

    constructor() {
        super(__dirname);

        const name = 'Cubes';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async getClassesMetadata(innerResult, functionParams) {
        return super.getClassesMetadata(innerResult, functionParams);
    }

    async form(id) {
        const result = {
            form: [],
            buttons: [],
        };

        return result;
    }

    async create(id, body) {
        // return new MainMetadata({ id: id }).create(id, body);
    }

    async read(id, options = {}) {
        return new MainMetadata({ id: id }).read(id, options);
    }

    async getKey(answerId) {
        return `cube_${answerId}`;
    }

    /** @deprecated */
    sqlFunc(func) {
        return this.numberDefaultParams.find((i) => i.name === func).sqlName;
        // switch (func) {
        //     case 'sum':
        //         return 'sum';
        //     case 'mean':
        //         return 'avg';
        //     case 'min':
        //         return 'min';
        //     case 'max':
        //         return 'max';
        //     case 'len':
        //         return 'count';
        // }
    }

    /** @deprecated */
    async prepare(params) {
        const json = {
            settings: {
                columns: [],
                index: [],
                values: [],
                aggfunc: {},
                where: params.where,
                systemWhere: params.systemWhere,
                order: Object.values(params.order ?? []).flat(1),
                fields: {}
            },
            data: []
        };

        if (params.columns.length > 0) {
            //TODO убрать костылек, когда реализуем сортировку по значениям и слоям
            const usedStatics = params.columns.filter((item) => item.type === 'static').map(i => i.name);
            for (const column of params.columns) {
                if (column.type === 'static') {
                    // json.settings.columns.push(column.name);
                } else {
                    // Убираем статичные
                    const usedNonStatics = json.settings.columns.filter(col => !usedStatics.includes(col));

                    // if (usedNonStatics.length > 0) continue;

                    json.settings.columns.push(column.name);

                    const children = [];
                    (column.child || []).forEach((column) => {
                        column.name && children.push(column.name);
                    });

                    if (children.length) {
                        json.settings.fields[column.name] ||= {};
                        json.settings.fields[column.name].children = children;
                    }
                }
            }
        }

        if (params.rows.length > 0) {
            //TODO убрать костылек, когда реализуем сортировку по значениям и слоям
            // params.rows = params.rows.filter((item) => item.type !== 'static');
            //TODO убрать костылек, когда реализуем сортировку по значениям и слоям
            const usedStatics = params.rows.filter((item) => item.type === 'static').map(i => i.name);
            for (const row of params.rows) {
                if (row.type === 'static') {
                    // json.settings.index.push(row.name);
                } else {
                    // Убираем статичные
                    const usedNonStatics = json.settings.index.filter(r => !usedStatics.includes(r));

                    // if (usedNonStatics.length > 0) continue;

                    json.settings.index.push(row.name);

                    const children = [];
                    (row.child || []).forEach((column) => {
                        column.name && children.push(column.name);
                    });

                    if (children.length) {
                        json.settings.fields[row.name] ||= {};
                        json.settings.fields[row.name].children = children;
                    }
                }
            }

            // const row = params.rows[0];
            // json.settings.index.push(row.name);

            // const children = [];
            // (row.child || []).forEach((row) => {
            //     row.name && children.push(row.name);
            // });

            // if (children.length) {
            //     json.settings.fields[row.name] ||= {};
            //     json.settings.fields[row.name].children = children;
            // }
        }

        for (let i = 0; i < params.values.length; i++) {
            if (!params.values[i].child?.length) {
                throw ApiError.BadRequest('Не указан тип агрегации для меры');
            }

            const value = params.values[i];
            json.settings.values.push(value.name);

            for (let j = 0; j < value.child.length; j++) {
                const aggregation = value.child[j];
                const layers = params.layers ?? aggregation.layers;
                for (let l = 0; l < layers.length; l++) {
                    const layer = layers[l];
                    json.settings.aggfunc[value.name] ||= [];
                    json.settings.aggfunc[value.name].push({
                        name: this.sqlFunc(aggregation.name),
                        layer
                    });
                }
            }
        }

        return json;
    }

    async cube(id, options = {}) {
        const answerId = randomUUID();

        let result = { answerId, status: 'wait', params: options, table: {}, totalRows: 0 };

        const answerKey = await this.getKey(answerId);
        await MemorySave.set(answerKey, result, { isLocal: false, ttl: sreda.env?.PIVOT_ANSWER_TTL || 1000 * 60 * 5 });

        result = (await Promise.race([this._cube(result, id, options), sleep(1_000)])) ?? result;

        if (result?.status === 'error') {
            throw ApiError.ServerError('Ошибка при формировании среза', [result.errors], { answerId });
        }

        return result;
    }

    async _cube(result, id, options = {}) {
        if (!(options.rows.length > 0 && options.values.length > 0)) {
            return { ...result, return: 'ok' };
        }

        try {
            const json = await this.prepare(options);

            const table = await new MainMetadata({ id: id }).cube(id, json);

            console.log('Закончили формировать таблицу!');

            result = { ...result, status: 'ok', table };
        } catch (e) {
            result = {
                ...result,
                status: 'error',
                errors: {
                    message: e.message,
                    stack: e.stack
                }
            };
        } finally {
            const answerKey = await this.getKey(result.answerId);
            await MemorySave.set(answerKey, result, { isLocal: false, ttl: sreda.env?.PIVOT_ANSWER_TTL || 1000 * 60 * 5 });
        }

        return result;
    }

    async result(id, answerId) {
        const answerKey = await this.getKey(answerId);

        const result = await MemorySave.get(answerKey, { isLocal: false });
        if (!result) {
            throw ApiError.BadRequest('Не найден статус построения среза. Попробуйте еще раз.', [], { answerId });
        }

        if (result.status === 'error') {
            throw ApiError.ServerError('Ошибка при формировании среза', [result.errors], { answerId });
        }

        // if (result.status !== 'wait') {
        //     await MemorySave.deleteFromMemory(answerKey, { isLocal: false });
        // }

        return result;
    }

    async update(id, body) {
        // return new MainMetadata({ id: id }).update(id, body);
    }

    async delete(id, body) {
        // return new MainMetadata({ id: id }).delete(id, body);
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Cubes.id, MainMetadata);
    global.sreda.bottle.factory('cubesService', () => new CubesService());
}

module.exports = CubesService;
