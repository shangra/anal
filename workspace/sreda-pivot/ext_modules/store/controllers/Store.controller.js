const StoreServiceClass = require('../services/Store.service');
const StoreService = new StoreServiceClass();

/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: расширение
 */

class StoreController {
  /**
   * @swagger
   * /setuserdata/{key}:
   *   post:
   *     summary: Сохранения информации пользователя по ключу
   *     tags: [Store]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: key
   *         description: Произвольное значение ключа
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       description: Произвольные данные
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Удачное состояние записи
   */
  static async setUserData(req, res, next) {
    try {
      res.locals.description = 'Устанавливаем значение по пользователю';
      const {
        key
      } = req.params;
      const value = req.body;
      await StoreService.setUserDataByKey(key, value);
      res.json({
        result: true
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /getuserdata/{key}:
   *   get:
   *     summary: Получение информации пользователя по ключу
   *     tags: [Store]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: key
   *         description: Произвольное значение ключа
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Данные по ключу
   */
  static async getUserData(req, res, next) {
    try {
      res.locals.description = 'Получаем значение по пользователю';
      const {
        key
      } = req.params;
      const result = await StoreService.getUserDataByKey(key);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /getuserdata:
   *   get:
   *     summary: Получение всех данных пользователя
   *     tags: [Store]
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Список данных c ключами
   */
  static async getAllUserData(req, res, next) {
    try {
      res.locals.description = 'Получаем полный список значений по пользователю';
      const result = await StoreService.getAllUserData();
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = StoreController;