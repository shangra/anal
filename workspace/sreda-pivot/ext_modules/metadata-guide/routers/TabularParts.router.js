const router = sreda.restmodule.Router();
const Controller = require('../controllers/TabularParts.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

router.route('/metadata').all(checkAccess(['Adminpanel', 'MetadataAdmin']));
router.route('/metadata/:id').all(checkAccess(['Adminpanel', 'MetadataAdmin']));

router.route('/metadata/:id').get(Controller.metadataItem);
router.route('/metadata/:id').put(Controller.updateMetadata);
router.route('/metadata/:id').delete(Controller.deleteMetadata);

router.route('/metadata').get(Controller.metadata);
router.route('/metadata').post(Controller.createMetadata);

router.route('*').all(checkAccess(['MetadataRead']));

router.route('/:id/:tabular').post(Controller.create);
router.route('/:id/:tabular').get(Controller.read);
router.route('/:id/:tabular').put(Controller.update);
router.route('/:id/:tabular').delete(Controller.delete);

module.exports = router;
