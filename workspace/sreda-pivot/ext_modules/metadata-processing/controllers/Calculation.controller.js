const ServiceClass = require('../services/metadata/helpers/Calculation.class');
const Service = new ServiceClass();

const PrepareProcessingClass = require('../services/metadata/helpers/Prepare.class');
const PrepareProcessing = new PrepareProcessingClass();

const FillProcessingClass = require('../services/metadata/helpers/Fill.class');
const FillProcessing = new FillProcessingClass();

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

class MeasuresController {
    static async fill(req, res, next) {
        try {
            const { id } = req.body;
            const data = await FillProcessing.fill(id);
            res.json(data);
        } catch (e) {
            next(e);
        }
    }

    static async prepare(req, res, next) {
        try {
            const { id, options } = req.body;
            const data = await PrepareProcessing.prepare(id, options);
            res.json(data);
        } catch (e) {
            next(e);
        }
    }

    static async calculate(req, res, next) {
        try {
            const { id } = req.body;
            const data = await Service.calculate(id);
            res.json(data);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req
     * @param {Response} res
     * @param {NextFunction} next
     */
    static async matrix(req, res, next) {
        try {
            const { id } = req.body;
            const data = await Service.matrix(id);
            res.json(data);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = MeasuresController;
