const DeviceServiceClass = require('../services/Device.service');
// const httpContext = require('express-http-context');
const httpContext = require('../../../core/services/http-context');
const DeviceService = new DeviceServiceClass();

/**
 * @swagger
 * tags:
 *   - name: userDevice
 *     description: расширение
 */
class DeviceController {
    /**
     * @swagger
     * /devices:
     *   get:
     *     summary: Список всех устройств пользователя
     *     tags: [userDevice]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Объект  key = id устройства,  value = объект с параметрами устройства
     */
    static async getUserDevices(req, res, next) {
        res.locals.description =
            'Просмотр списка собственных устройств пользователя';
        try {
            const userId = httpContext.get('sessionStorage').user.id;
            const devices = await DeviceService.getUserDevices(userId);
            res.json(devices);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /devices/{id}/apply:
     *   post:
     *     summary: Применение настроек выбранного устройства к текущей сессии и устройству
     *     tags: [userDevice]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор устройства
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async applyDevice(req, res, next) {
        res.locals.description =
            'Перенос пользовательских настроек с другого устройства';
        try {
            const { id } = req.params;
            const settingForSession = await DeviceService.applyDevice(id);
            // добавляем новые настройки в сессию
            const sessionStorage = httpContext.get('sessionStorage');
            settingForSession.forEach(
                (setting) => (sessionStorage[setting.key] = setting.value)
            );
            httpContext.set('sessionStorage', sessionStorage);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /devices:
     *   post:
     *     summary: Добавление нового устройства пользователя
     *     tags: [userDevice]
     *     produces:
     *       - application/json
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *               type: object
     *               properties:
     *                 device:
     *                   type: object
     *                   description: характеристики устройства
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async saveDevice(req, res, next) {
        res.locals.description = 'Добавление нового устройства пользователя';
        try {
            const { device } = req.body;
            const userId = httpContext.get('sessionStorage').user.id;
            await DeviceService.addUserDevice(userId, device);
            const sessionStorage = httpContext.get('sessionStorage');
            sessionStorage.deviceId = device.id;
            httpContext.set('sessionStorage', sessionStorage);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }
}
module.exports = DeviceController;
