const ReportsXlsxDownloadServiceClass = require('../services/ReportsXlsxDownload.service');
const ReportsXlsxDownloadService = new ReportsXlsxDownloadServiceClass()

class ReportsXlsxDownloadController {

    static async postxlsx(req, res, next) {
        try {
            const {infoserviceId} = req.params;
            const body = req.body;
            let result = await ReportsXlsxDownloadService.postxlsx(infoserviceId, body);
            res.send(result);
        } catch (e) {
            next(e)
        }
    }

    static async postjson(req, res, next) {
        try {
            const {infoserviceId} = req.params;
            const body = req.body;
            let result = await ReportsXlsxDownloadService.postjson(infoserviceId, body);
            res.json(result);
        } catch (e) {
            next(e)
        }
    }
}

module.exports = ReportsXlsxDownloadController;
