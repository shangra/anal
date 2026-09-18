const fs = require('node:fs/promises');
const DumpDBService = require('../services/DumpDB.service');

/**
 * @swagger
 * tags:
 *   - name: dumpCMP
 *     description: расширение
 */

class DumpDBController {
    /**
     * @swagger
     * /dump/{tableName}:
     *   post:
     *     summary: Создание бекапа таблицы
     *     tags: [dumpCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: tableName
     *         description: Имя таблицы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Условие для отбора
     *     responses:
     *       200:
     *         description: Данные из таблицы
     */
    static async Dump(req, res, next) {
        try {
            res.locals.description = 'Бекап таблицы';
            const { tableName } = req.params;
            const Params = {
                table: tableName,
                where: req.body,
            };
            const result = await DumpDBService.Dump(Params);
            // let jsonText = JSON.stringify(result);
            // res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.send(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /restore:
     *   post:
     *     summary: Восстановление бекапа таблицы
     *     tags: [dumpCMP]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Данные для восстановления
     *     responses:
     *       200:
     *         description: Данные из таблицы
     */
    static async Restore(req, res, next) {
        try {
            res.locals.description = 'Восстановление данных таблицы';
            let data = req.body;
            if (req.file) {
                let { path: filePath, buffer } = req.file;
                if (filePath) buffer = await fs.readFile(filePath);
                data = buffer.toString('utf-8');
            }
            const result = await DumpDBService.restoreFromStr(data);
            if (!result.result) {
                res.status(500);
            }
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = DumpDBController;
