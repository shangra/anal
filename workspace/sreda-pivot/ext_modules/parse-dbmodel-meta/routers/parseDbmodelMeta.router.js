const router = sreda.restmodule.Router();
const Controller = require('../controllers/parseDbmodelMeta.controller');

router.route('/autofill/:id/fromDB').post(Controller.autofillFromDB);
router.route('/autofill/:id').post(Controller.autofill);

module.exports = router;
