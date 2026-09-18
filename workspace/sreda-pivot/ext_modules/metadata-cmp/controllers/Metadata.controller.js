const MetadataServiceClass = require('../services/Metadata.service');
const MetadataService = new MetadataServiceClass();

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * @class MetadataController
 */
class MetadataController {
    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async getMetadatas(req, res, next) {
        try {
            const metadata = await MetadataService.getMetadatas();
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
    static async getMetadata(req, res, next) {
        try {
            const id = req.params.object;
            const metadata = await MetadataService.getMetadata(id);
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
    static async getLinkObject(req, res, next) {
        try {
            let { class_id, parent } = req.params;
            if (class_id.indexOf(',') > 0) {
                class_id = class_id.split(',');
            }
            const metadata = await MetadataService.getMetadataLinks(class_id, parent);
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
    static async getLinksObject(req, res, next) {
        try {
            const links = JSON.parse(req.query.items ?? '[ "00000000-0000-0000-0000-000000000000" ]');
            // const metadata = {};
            const metadata = await MetadataService.getMetadataParent(links);
            res.json(metadata ?? []);
        } catch (e) {
            next(e);
        }
    }

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
            const options = {
                filter,
                hideSubTree,
            };
            const metadata = await MetadataService.getMetadatas(options);
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
            const options = {
                hideSubTree: hideSubTree === 'true'
            };
            const metadata = await MetadataService.getTreeChildren(metadata_id, options);
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
    static async appendObject(req, res, next) {
        try {
            const metadata = req.body;
            const result = await MetadataService.setMetadata(metadata);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async updateObject(req, res, next) {
        try {
            const id = req.params.object;
            const metadata = req.body;
            const result = await MetadataService.updMetadata(id, metadata);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async deleteObject(req, res, next) {
        try {
            const id = req.params.object;
            const result = await MetadataService.delMetadata(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async getItemObject(req, res, next) {
        try {
            const { id } = req.params;
            // const result = await MetadataService.delMetadata(id);
            res.json({ id });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async getRanksByParent(req, res, next) {
        try {
            const { class_id, parent } = req.params;
            const children = await MetadataService.getRanksByParent(class_id, parent);
            res.json({ children });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    static async setRanks(req, res, next) {
        try {
            const { class_id, parent } = req.params;
            const ranks = req.body ?? [];
            const pages = await MetadataService.setRanks(class_id, parent, ranks);
            res.json({ result: pages.length === ranks.length });
        } catch (e) {
            next(e);
        }
    }


    static async objectByName(req, res, next) {
        try {
            const { metaName, linkName } = req.params;
            const rootParentUUID = '00000000-0000-0000-0000-000000000000';
            const meta = await MetadataService.getMetadataByOptions({where: {name: metaName, parent: rootParentUUID} });
            const metaId = (Array.isArray(meta) && meta.length>0) ? meta[0].id : undefined;
            const link = await MetadataService.getMetadataByOptions({where: {name: linkName, parent: metaId} });
            res.json(link);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = MetadataController;
