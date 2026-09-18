const router = sreda.restmodule.Router();
const Controller = require('../controllers/MemorySaveMetadata.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');

router.route('*').all(checkAccess(['Adminpanel', 'MetadataAdmin']));

router.route('/:id/body').delete(Controller.clearCacheMetadataByBody);
router.route('/:id/withRefs').delete(Controller.memorySaveMetadataWithRefs);
router.route('/:id').delete(Controller.memorySaveMetadata);

module.exports = router;
