const PivotTableServiceClass = require('../services/PivotTable.service');
const PivotTableService = new PivotTableServiceClass();

class PivotTableController {
    static async getMenuParameters(req, res, next) {
        try {
            const { id } = req.params;
            const result = await PivotTableService.getMenuParameters(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    static async getMenuChildParams(req, res, next) {
        try {
            const { id } = req.params;
            const result = await PivotTableService.getMenuChildParams(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    static async get(req, res, next) {
        res.locals.description = 'Запуск задачи построения среза куба';
        try {
            const { id } = req.params;
            const { answerType, sliceTraceId } = req.query;
            const options = {
                answerType: answerType ?? 'pivot', // 'table'
                sliceTraceId: sliceTraceId ?? null
            };
            const result = await PivotTableService.get(id, req.body, options);
            res.json(result);
        }
        catch (e) {
            next(e);
        }
    }

    static async getTableDataResults(req, res, next) {
        res.locals.description = 'Получение статуса построения среза куба';
        try {
            const { id, answerId } = req.params;
            const result = await PivotTableService.getTableDataResults(id, answerId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    static async getOldTableData(req, res, next) {
        try {
            const { id } = req.params;
            const result = await PivotTableService.get(id, req.body);
            if (result.status === 'error') {
                next(result.errors);
            } else {
                res.json(result);
            }//res.json(result);
        } catch (e) {
            next(e);
        }
    }

    static async cancelRequest(req, res, next) {
        try {
            const { answerIds } = req.body;

            const result = PivotTableService.queryCancel({ answerIds });

            res.json(result);
        } catch (e) {
            next(e);
        }
    };

    // static async getTestTableData(req, res, next) {
    //     try {
    //         const { id } = req.params;
    //         const result = await pivotTableService.getTestTableData(id, req.body);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }
    //
    // static async getTestTableDataResults(req, res, next) {
    //     try {
    //         const { id, pivotId } = req.params;
    //         const result = await pivotTableService.getTestTableDataResults(id, pivotId);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // static async createPivotSchema(req, res, next) {
    //     try {
    //         const { schema } = req.body;
    //         const result = await pivotTableService.createPivotSchema(schema);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // static async getAllPivotSchemas(req, res, next) {
    //     try {
    //         const { pivotId } = req.params;
    //         let result = [];
    //         result = await pivotTableService.getAllPivotSchemas(pivotId);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // static async getPivotSchema(req, res, next) {
    //     try {
    //         const { pivotId, id } = req.params;
    //         const result = await pivotTableService.getPivotSchema(pivotId, id);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // static async editPivotSchema(req, res, next) {
    //     try {
    //         const { pivotId, id } = req.params;
    //         const { schema } = req.body;
    //         const result = await pivotTableService.editPivotSchema(pivotId, id, schema);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // static async delPivotSchema(req, res, next) {
    //     try {
    //         const { pivotId, id } = req.params;
    //         const result = await pivotTableService.delPivotSchema(pivotId, id);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }
}

module.exports = PivotTableController;
