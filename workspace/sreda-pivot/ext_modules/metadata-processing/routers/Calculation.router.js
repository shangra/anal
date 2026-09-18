const router = sreda.restmodule.Router();
const Controller = require('../controllers/Calculation.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');

router.route('*').all(checkAccess(['Adminpanel', 'MetadataAdmin']));

router.route('/fill').post(Controller.fill);
router.route('/prepare').post(Controller.prepare);
router.route('/calculate').post(Controller.calculate);
router.route('/calculate/matrix').post(Controller.matrix);

module.exports = router;
