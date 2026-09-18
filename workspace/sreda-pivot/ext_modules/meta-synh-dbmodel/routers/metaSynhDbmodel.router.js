const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaSynhDbmodel.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

router
    .route('*')
    .post(checkAccess(['MetadataWrite']))
    .put(checkAccess(['MetadataWrite']))
    .delete(checkAccess(['MetadataDelete']));

router.route('/synch/:id').get(Controller.model);
router.route('/synch/:id').post(Controller.synch);
router.route('/synch/:id').delete(Controller.drop);

module.exports = router;
