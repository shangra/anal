const router = sreda.restmodule.Router();
const Controller = require('../controllers/SessionSet.controller');

router.route('/').get(Controller.get);

module.exports = router;
