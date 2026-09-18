const router = sreda.restmodule.Router();
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

const Controller = require('../controllers/MetadataV3.controller');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('*')
    .post(checkAccess(['MetadataWrite']))
    .put(checkAccess(['MetadataWrite']))
    .delete(checkAccess(['MetadataWrite']));
//----------------------------------------------------------------------------------------------------------------------

router.route('/tree').get(Controller.getTree);
router.route('/tree/:metadata_id').get(Controller.getTreeChildren);

module.exports = router;
