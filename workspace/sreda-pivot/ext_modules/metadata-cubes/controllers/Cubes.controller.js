const ServiceClass = require('../services/Cubes.service');
const Service = new ServiceClass();

class CubesController {
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

    static async create(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await Service.create(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async read(req, res, next) {
        res.locals.description = 'Чтение данных инфосервиса куба';
        try {
            const id = req.params.id;
            let options = req.query.options ?? '{}';
            options = JSON.parse(options);
            const metadata = await Service.read(id, options);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    static async cube(req, res, next) {
        try {
            const { id } = req.params;
            const result = await Service.cube(id, req.body);
            if (result.status === 'error') {
                next(result.errors);
            } else {
                res.json(result);
            }
        } catch (e) {
            next(e);
        }
    }

    static async result(req, res, next) {
        try {
            const { id, answerId } = req.params;
            const metadata = await Service.result(id, answerId);
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
            const body = req.body;
            const metadata = await Service.delete(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = CubesController;
