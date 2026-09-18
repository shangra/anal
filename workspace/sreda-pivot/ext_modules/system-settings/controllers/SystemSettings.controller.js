const SystemSettingsServiceClass = require('../services/SystemSettings.service');
const SystemSettingsService = new SystemSettingsServiceClass();
/**
 * @swagger
 * tags:
 *   - name: SystemSettings
 *     description: Управление настройками системы
 */
class SystemSettingsController {
  /**
     * @swagger
     * /SystemSettings:
     *   get:
     *     summary: Получить все настройки системы
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Список всех настроек системы
     */
  static async getAll(req, res, next) {
    try {
      const id = '00000000-0000-0000-0000-000000000000';
      const result = await SystemSettingsService.getChildren(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings/{id}:
     *   get:
     *     summary: Получить конкретную настройку системы
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID настройки
     *         in: path
     *         required: true
     *         type: string
     *       - name: filter
     *         description: Дополнительный фильтр
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Настройка системы
     */
  static async get(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const filter = JSON.parse(req.query.filter ?? '{}');
      const result = await SystemSettingsService.get(id, {
        filter
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings:
     *   post:
     *     summary: Создать новую настройку системы
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 description: Имя настройки
     *               parent:
     *                 type: string
     *                 description: Родительская настройка
     *     responses:
     *       200:
     *         description: Новая настройка системы
     */
  static async post(req, res, next) {
    try {
      const {
        name,
        parent
      } = req.body;
      const result = await SystemSettingsService.post(name, parent);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings/{id}:
     *   put:
     *     summary: Обновить существующую настройку системы
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID настройки
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Обновленные данные настройки
     *     responses:
     *       200:
     *         description: Обновленная настройка системы
     */
  static async put(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const result = await SystemSettingsService.put(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings/{id}:
     *   delete:
     *     summary: Удалить настройку системы
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID настройки
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления настройки
     */
  static async del(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const result = await SystemSettingsService.del(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings/servers/info:
     *   get:
     *     summary: Получить информацию о сервере
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Информация о сервере
     */
  static async getServerInfo(req, res, next) {
    try {
      const result = await SystemSettingsService.getServerInfo();
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings/servers/shutdown:
     *   post:
     *     summary: Завершить работу сервера
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Подтверждение завершения работы
     */
  static async shutDownServer(req, res, next) {
    try {
      process.emit('SIGINT');
      res.json({
        result: true,
        time: sreda.env.SHUTDOWN_TIMEOUT || 4000
      });
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SystemSettings/profile/cpu:
     *   post:
     *     summary: Профилировать использование CPU
     *     tags: [SystemSettings]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               timeout:
     *                 type: number
     *                 description: Таймаут профилирования
     *     responses:
     *       200:
     *         description: Данные профиля CPU
     */
  static async getCpuProfile(req, res, next) {
    try {
      const {
        timeout
      } = req.body;
      const cpuProfileData = await SystemSettingsService.getCpuProfile(timeout);
      res.json(cpuProfileData);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = SystemSettingsController;