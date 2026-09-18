const Sequelize = require('sequelize');
const connection = require('../../../../core/db/connection');
const db = sreda.models;
const { DumpMeta } = db;
const { Op } = Sequelize;

async function transformWhereOperators(where) {
    let newWhere = {};

    for (const conditionName in where) {
        /** @type {Literal | string | { sql: string }} */
        let newConditionName = conditionName;
        if (conditionName.slice(0, 1) === '$') {
            const operationName = conditionName.slice(1);
            if (operationName.slice(0, 3) !== 'sql') {
                newConditionName = Op[operationName];
                if (!newConditionName) {
                    const lit = operationName.slice(0, -1);
                    newConditionName = connection.literal(lit); //`$${operationName}`;
                }
            } else {
                const lit = operationName.slice(4).slice(0, -1);
                newConditionName = { sql: lit };
            }
        }

        let newConditionValue = where[conditionName];
        const constructorName = newConditionName?.constructor?.name ?? '';

        if (newConditionValue && typeof newConditionValue === 'object') {
            if (Array.isArray(newConditionValue)) {
                newConditionValue = await Promise.all(
                    newConditionValue.map(
                        // eslint-disable-next-line no-return-await
                        async (conditionValue) => {
                            let tempResValue = conditionValue;
                            if (typeof conditionValue === 'object') {
                                tempResValue = await transformWhereOperators(conditionValue);
                            }
                            return tempResValue;
                        }
                    )
                );
            } else {
                newConditionValue = await transformWhereOperators(newConditionValue);
            }
        }

        if (typeof newConditionName === 'object' && constructorName !== 'Literal') {
            let comparator = Op.eq;
            if (Array.isArray(newConditionValue)) {
                comparator = Op.in;
            }
            newWhere = {
                [Op.and]: [
                    connection.where(connection.literal(newConditionName.sql), {
                        [comparator]: newConditionValue,
                    }),
                    { ...newWhere },
                ],
            };
        } else if (constructorName === 'Literal') {
            newWhere = {
                [Op.and]: [connection.where(newConditionName, newConditionValue), { ...newWhere }],
            };
        } else {
            newWhere[newConditionName] = newConditionValue;
        }
    }

    return newWhere;
}

class DumpBDModel {
    static async GetTableList() {
        const TableList = [];
        for (const key in db) {
            const TableModel = db[key];
            if (typeof TableModel === 'function') {
                try {
                    const TableName = new TableModel().constructor.name;
                    TableList.push(TableName);
                } catch (e) {
                    // console.log()
                }
            }
        }
        return TableList;
    }

    /**
     * @public
     *
     * @param {string} TableName
     * @param {object} whereFilter
     * @returns
     */
    static async findAll(TableName, whereFilter) {
        const ModelManager = db[TableName];

        // Преобразование фильтра с фронтенда с $ в символы sequelize
        const where = await transformWhereOperators(whereFilter);

        return this.findAllByModel({
            model: ModelManager,
            where,
            table: TableName,
        });
    }

    /**
     * @private
     *
     * @param {*} param0
     * @returns
     */
    static async findAllByModel({ model, where, table }) {
        const result = { current: [] };

        if (!model) return result;
        if (model.tableAttributes.markdel) {
            where.markdel = [1, 0];
        }
        const options = {
            force: true,
            all: true,
            where: where,
        };

        const data = await model.findAll(options);
        let currents = [];
        for (const key in data) {
            currents.push(data[key].dataValues);
        }

        if (currents.length > 0) {
            if (model.DumpInstruction !== undefined) {
                // result = {};
                const glInstruction = model.DumpInstruction();
                if (glInstruction.preDump !== undefined) {
                    currents = glInstruction.preDump(currents);
                }

                for (const key in currents) {
                    let data = currents[key];
                    const DumpItemInstruction = model.DumpInstruction(data);

                    // current
                    if (DumpItemInstruction.current !== undefined) {
                        if (DumpItemInstruction.current.forDump !== undefined) {
                            data = await DumpItemInstruction.current.forDump(data);
                        }
                    }

                    // after
                    const afterData = [];
                    if (DumpItemInstruction.after !== undefined) {
                        for (const keyBefore in DumpItemInstruction.after) {
                            const DumpAfterInstruction = DumpItemInstruction.after[keyBefore];
                            const afterObject = await DumpBDModel.findAll(
                                DumpAfterInstruction.table,
                                DumpAfterInstruction.where
                            );

                            if (afterObject.current.length > 0) {
                                afterData.push(afterObject);
                            }
                        }
                        if (afterData.length > 0) {
                            if (result.after === undefined) {
                                result.after = afterData;
                            } else {
                                result.after = result.after.concat(afterData);
                            }
                        }
                    }

                    // before
                    const beforeData = [];
                    if (DumpItemInstruction.before !== undefined) {
                        for (const keyBefore in DumpItemInstruction.before) {
                            const DumpBeforeInstruction = DumpItemInstruction.before[keyBefore];
                            const BeforeObject = await DumpBDModel.findAll(
                                DumpBeforeInstruction.table,
                                DumpBeforeInstruction.where
                            );

                            if (BeforeObject.current.length > 0) {
                                beforeData.push(BeforeObject);
                            }
                        }
                        if (beforeData.length > 0) {
                            if (result.before === undefined) {
                                result.before = beforeData;
                            } else {
                                result.before = result.before.concat(beforeData);
                            }
                        }
                    }
                }
            }

            const currentObject = {};
            currentObject[table] = currents;
            result.current.push(currentObject);
        }

        return result;
    }

    /**
     * @private
     *
     * @param {*} tableName
     * @param {*} values
     * @param {*} transaction
     * @returns
     */
    static async updateInsert(tableName, values, transaction) {
        let result;

        const ModelManager = db[tableName];
        if (ModelManager) {
            const { id } = values;
            const where = {};
            const options = {
                force: true,
                where,
            };
            if (ModelManager.rawAttributes.id) {
                where.id = id;
            }

            if (ModelManager.rawAttributes.markdel) {
                options.where.markdel = [1, 0];
            }

            if (Object.keys(where).length === 0) {
                return;
            }

            delete values.code; // код - инкремент и он создается автоматически

            // hook forRestore
            if (ModelManager.DumpInstruction !== undefined) {
                const DumpItemInstruction = ModelManager.DumpInstruction(values);

                if (DumpItemInstruction.current !== undefined) {
                    if (DumpItemInstruction.current.forRestore !== undefined) {
                        values = await DumpItemInstruction.current.forRestore(values, transaction);
                    }
                }
            }

            // Пользователя может не быть в БД, поэтому RLS установит текущего в текущей БД
            // delete values.createdUser;
            // delete values.updatedUser;

            const itemDB = await ModelManager.findOne({
                ...options,
                transaction,
            });
            if (itemDB === null) {
                // insert
                result = await ModelManager.create(values, {
                    force: true,
                    transaction,
                });
                if (result === null) throw new Error('ОШИБКА ЗАПИСИ!!!');
            } else {
                // update
                const valuesWithoutId = { ...values };
                delete valuesWithoutId.id;
                result = await ModelManager.update(valuesWithoutId, {
                    where: { id },
                    force: true,
                    transaction,
                });
                if (result === null) throw new Error('ОШИБКА ОБНОВЛЕНИЯ!!!');
            }

            // hook afterRestore
            if (ModelManager.DumpInstruction !== undefined) {
                const DumpItemInstruction = ModelManager.DumpInstruction(values);

                if (DumpItemInstruction.current !== undefined) {
                    if (DumpItemInstruction.current.afterRestore !== undefined) {
                        await DumpItemInstruction.current.afterRestore(values, transaction);
                    }
                }
            }
        }

        return result;
    }

    /**
     * @private
     *
     * @param {*} currentObjects
     * @param {*} transactionError
     * @returns
     */
    static async restoreCurrent(currentObjects, transactionError) {
        const result = {};

        for (const tableName in currentObjects) {
            let transaction;

            const dataTable = currentObjects[tableName];

            try {
                transaction = await connection.transaction();

                result[tableName] = db[tableName].restoreFromDump
                    ? await db[tableName].restoreFromDump(dataTable, transaction)
                    : await this.restoreFromDump({
                          dataTable,
                          tableName,
                          transaction,
                          transactionError,
                      });

                await transaction.commit();
            } catch (err) {
                if (transaction) await transaction.rollback();

                console.error(err);
                console.log(tableName, db);
            }
        }
        return result;
    }

    /**
     * @private
     *
     * @param {*} param0
     * @returns
     */
    static async restoreFromDump({ dataTable, tableName, transaction, transactionError }) {
        const result = [];
        for (const index in dataTable) {
            const dataItem = dataTable[index];

            try {
                await DumpBDModel.updateInsert(tableName, dataItem, transaction);
            } catch (err) {
                console.error(err);

                transactionError.push(err);

                result.push(dataItem);
            }
        }

        return result;
    }

    /**
     * @private
     *
     * @param {*} data
     * @param {*} options
     * @returns
     */
    static async restore(data, options) {
        const transactionError = [];

        let transaction = options?.transaction;
        try {
            if (data.before !== undefined) {
                for (const beforeKey in data.before) {
                    const beforeInput = data.before[beforeKey];
                    await DumpBDModel.restore(beforeInput);
                }
            }

            let res;
            if (data.current !== undefined) {
                for (const indexCurrent in data.current) {
                    const currentObjects = data.current[indexCurrent];
                    res = await DumpBDModel.restoreCurrent(currentObjects, transactionError);
                }
            }

            if (data.after !== undefined) {
                for (const afterKey in data.after) {
                    const afterInput = data.after[afterKey];
                    await DumpBDModel.restore(afterInput);
                }
            }

            if (transaction) await transaction.commit();
        } catch (e) {
            transactionError.push(e);

            if (transaction) await transaction.rollback();
        }

        return transactionError;
    }

    /**
     * @public
     *
     * @param {*} data
     * @param {*} options
     * @returns
     */
    static async restoreAll(data, options) {
        const transactionErrors = await DumpBDModel.restore(data, options);
        return transactionErrors.length === 0;
    }

    /**
     * @public
     *
     * @param {*} hash
     * @returns
     */
    static async getMeta(hash) {
        return DumpMeta.findOne({
            logging: false,
            where: {
                hash,
            },
        });
    }

    /**
     * @public
     *
     * @param {*} hash
     * @param {*} name
     * @returns
     */
    static async setMeta(hash, name) {
        return DumpMeta.create({
            logging: false,
            hash,
            name,
        });
    }
}

module.exports = DumpBDModel;
