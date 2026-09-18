const router = sreda.restmodule.Router();
const Controller = require('../controllers/Users.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

router.route('*').all(checkAccess(['Adminpanel', 'MetadataAdmin']));

router.route('/metadata').get(Controller.metadata);
router.route('/metadata').post(Controller.createMetadata);
router.route('/metadata/:id').get(Controller.metadataItem);
router.route('/metadata/:id').put(Controller.updateMetadata);
router.route('/metadata/:id').delete(Controller.deleteMetadata);

router.route('*').all(checkAccess(['MetadataRead', 'MetadataDataRead'], true));

router.route('/:id').get(checkAccess(['MetadataDataRead']), Controller.read);
router
    .route('/:id')
    .post(checkAccess(['MetadataDataWrite']), Controller.create);
router.route('/:id').put(checkAccess(['MetadataDataWrite']), Controller.update);
router
    .route('/:id')
    .delete(checkAccess(['MetadataDataWrite']), Controller.delete);

module.exports = router;
