const MetaCompositeHelperServiceClass = require('../services/MetaCompositeHelper.service');
const MetaCompositeHelperService = new MetaCompositeHelperServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaCompositeHelper
 *     description: Методы для работы с композитным помощником
 */
class MetaCompositeHelperController {
    /**
     * @swagger
     * /MetaCompositeHelper/tree:
     *   get:
     *     summary: Получение дерева композитов
     *     tags: [MetaCompositeHelper]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Дерево композитов
     */
    static async tree(req, res, next) {
        try {
            let result = await MetaCompositeHelperService.tree();
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = MetaCompositeHelperController;
