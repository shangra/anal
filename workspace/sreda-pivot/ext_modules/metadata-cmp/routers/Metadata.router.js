const router = sreda.restmodule.Router();
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

const Controller = require('../controllers/Metadata.controller');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('*')
    .post(checkAccess(['MetadataDataWrite', 'MetadataWrite'], true))
    .put(checkAccess(['MetadataDataWrite', 'MetadataWrite'], true))
    .delete(checkAccess(['MetadataDataWrite', 'MetadataWrite'], true));
//----------------------------------------------------------------------------------------------------------------------

router.route('/tree').get(Controller.getTree);
router.route('/tree/:metadata_id').get(Controller.getTreeChildren);
router
    .route('/object/:object')
    .get(Controller.getMetadata)
    .put(Controller.updateObject)
    .delete(Controller.deleteObject);
router.route('/object').get(Controller.getMetadatas).post(Controller.appendObject);
router.route('/links').get(Controller.getLinksObject);
router.route('/link/:class_id/:parent?').get(Controller.getLinkObject);

router.route('/rank/:class_id/:parent').get(Controller.getRanksByParent).put(Controller.setRanks);

router
    .route('/objectbyname/:metaName/:linkName')
    .get(Controller.objectByName)

module.exports = router;
