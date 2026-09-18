const MetadataServiceClass = require('../services/Metadata.service');
const MetadataService = new MetadataServiceClass();

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * @class MetadataV2Controller
 */
class MetadataV2Controller {
    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async getTree(req, res, next) {
        try {
            // const metadata = {};
            const { hideSubTree } = req.query;
            const filter = JSON.parse(req.query.filter ?? '{}');
            const order = JSON.parse(req.query.order ?? '[]');
            const options = {
                filter,
                order,
                hideSubTree: hideSubTree === 'true'
            };

            const metadata = await MetadataService.getMetadatasV2(options);

            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async getTreeChildren(req, res, next) {
        try {
            const { hideSubTree } = req.query;
            const { metadata_id } = req.params;
            const order = JSON.parse(req.query.order ?? '[]');
            const options = {
                order,
                hideSubTree: hideSubTree === 'true'
            };
            const metadata = await MetadataService.getTreeChildrenV2(metadata_id, options);

            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = MetadataV2Controller;
