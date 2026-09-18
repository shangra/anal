const ServiceClass = require('../services/Measures.service');
const Service = new ServiceClass();

class MetadataController {
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
            const body = req.body;
            const form = await Service.deleteMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async create(req, res, next) {
        try {
            const body = req.body;
            const metadata = await Service.create(body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async read(req, res, next) {
        try {
            const id = req.params.id;
            const metadata = await Service.read(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async update(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await Service.update(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async delete(req, res, next) {
        try {
            const id = req.params.id;
            const metadata = await Service.delete(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = MetadataController;
