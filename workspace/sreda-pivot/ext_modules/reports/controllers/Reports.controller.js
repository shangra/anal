const ReportsServiceClass = require('../services/Reports.service');

const ReportsService = new ReportsServiceClass();

/**
 * @swagger
 * tags:
 *   - name: reportsCMP
 *     description: расширение
 */
class ReportsController {
    static async getTableData(req, res, next) {
        res.locals.description = 'Запуск задачи построения отчета';
        try {
            const { id } = req.params;
            const result = await ReportsService.get(id, req.body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    static async getTableDataResults(req, res, next) {
        res.locals.description = 'Получение статуса построения отчета';
        try {
            const { id, answerId } = req.params;
            const result = await ReportsService.getTableDataResults(id, answerId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

}

module.exports = ReportsController;
