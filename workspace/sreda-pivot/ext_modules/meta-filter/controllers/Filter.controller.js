const FilterServiceClass = require('../services/Filter.service');
const FilterService = new FilterServiceClass();

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * @swagger
 * tags:
 *   - name: Filter
 *     description: расширение для получиения данный из справочником по фильтрам
 */
class FilterController {
  /**
   * @swagger
   * /metadata/meta-filter:
   *   post:
   *     summary: Получить данный справочника по филтьтру
   *     tags: [Filter]
   *     produces:
   *       - application/json
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           id:
   *             type: string
   *             description: id записи метаднных
   *           parent:
   *             type: string
   *             description: Парент для раскрытия иерархии
   *           name:
   *             type: string
   *             description: ilike паттерн для поиска
   *           where:
   *             type: object
   *             description: Дополнительный фильтры
   *     responses:
   *       200:
   *         - name: id
   *           description: id записи
   *         - name: name
   *           description: поле представления записи
   *         - name: children
   *           description: записи зависящие от этой записи
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async filter(req, res, next) {
    try {
      res.locals.description = 'Получения иерархии по заданному фильтру';
      const data = req.body;
      const result = await FilterService.filter(data);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /metadata/meta-filter/levels/{id}:
   *   get:
   *     summary: Получить список доступных уровней для запроса
   *     tags: [Filter]
   *     produces:
   *       - application/json
   *     requestParams:
   *       required: true
   *       content:
   *         application/json:
   *           id:
   *             type: string
   *             description: id записи метаднных
   *     responses:
   *       200:
   *         - name: level
   *           description: номер уровня
   *         - name: name
   *           description: название уровня
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async getLevels(req, res, next) {
    try {
      res.locals.description = 'Получения иерархии по заданному фильтру';
      const {
        id
      } = req.params;
      const result = await FilterService.getLevels(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = FilterController;