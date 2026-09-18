const FieldsServiceClass = require('../services/Binds.service');
const FieldsService = new FieldsServiceClass();

class FieldsController {
    static async metadata(req, res, next) {
        try {
            const form = await FieldsService.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await FieldsService.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await FieldsService.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await FieldsService.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await FieldsService.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async create(req, res, next) {
        try {
            const body = req.body;
            const metadata = await FieldsService.create(body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async read(req, res, next) {
        try {
            const id = req.params.id;
            const metadata = await FieldsService.read(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async update(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await FieldsService.update(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async delete(req, res, next) {
        try {
            const id = req.params.id;
            const metadata = await FieldsService.delete(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = FieldsController;
