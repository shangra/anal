const ServiceClass = require('../services/FieldsList.service');
const Service = new ServiceClass();

class FieldsListController {
    static async metadata(req, res, next) {
        try {
            const form = await Service.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await Service.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await Service.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await Service.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await Service.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = FieldsListController;
