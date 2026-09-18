const FieldsListServiceClass = require('../services/FieldsList.service');
const FieldsListService = new FieldsListServiceClass();

class FieldsListController {
    static async metadata(req, res, next) {
        try {
            const form = await FieldsListService.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await FieldsListService.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await FieldsListService.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await FieldsListService.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await FieldsListService.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = FieldsListController;
