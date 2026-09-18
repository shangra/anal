const router = sreda.restmodule.Router();
const Controller = require('../controllers/Filter.controller');

router.route('').post(Controller.filter);
router.route('/levels/:id').get(Controller.getLevels);

module.exports = router;
