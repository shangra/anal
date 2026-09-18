const router = sreda.restmodule.Router();
const Controller = require('../controllers/wrapper.controller');

router.route('/').get(Controller.get);
router.route('/:from/:to/:service').post(Controller.post);

module.exports = router;