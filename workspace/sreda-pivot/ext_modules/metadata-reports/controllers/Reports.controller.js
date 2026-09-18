const ReportsServiceClass = require('../services/Reports.service');

const ReportsService = new ReportsServiceClass();

class ReportsController {
    static async metadata(req, res, next) {
        try {
            const form = await ReportsService.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await ReportsService.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await ReportsService.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await ReportsService.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await ReportsService.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }

    static async create(req, res, next) {
        try {
            const { body } = req;
            const metadata = await ReportsService.create(body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async read(req, res, next) {
        try {
            const { id } = req.params;
            let options = req.query.options ?? '{}';
            options = JSON.parse(options);
            const metadata = await ReportsService.read(id, options);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const metadata = await ReportsService.update(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            const metadata = await ReportsService.delete(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = ReportsController;
