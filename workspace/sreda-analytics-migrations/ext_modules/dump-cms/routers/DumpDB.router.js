const router = sreda.restmodule.Router();
const Controller = require('../controllers/DumpDB.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');
const uploadFile = require('../../middleware-rest-upload-file/services/uploadFile');

router.route('*').all(checkAccess(['Administrator']));

router.route('/dump/:tableName').post(Controller.Dump);
router.route('/restore').post(uploadFile, Controller.Restore);

module.exports = router;
