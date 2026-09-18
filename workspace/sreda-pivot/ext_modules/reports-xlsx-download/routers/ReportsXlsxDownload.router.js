const router = sreda.restmodule.Router();
const ReportsXlsxDownloadController = require('../controllers/ReportsXlsxDownload.controller');

router.route('/:infoserviceId').post(ReportsXlsxDownloadController.postxlsx)

module.exports = router;
