const router = sreda.restmodule.Router();
const Controller = require('../controllers/Values.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

router.route('*').all(checkAccess(['Adminpanel', 'MetadataAdmin']));

router.route('/metadata').get(Controller.metadata);
router.route('/metadata').post(Controller.createMetadata);
router.route('/metadata/:id').get(Controller.metadataItem);
router.route('/metadata/:id').put(Controller.updateMetadata);
router.route('/metadata/:id').delete(Controller.deleteMetadata);

module.exports = router;
