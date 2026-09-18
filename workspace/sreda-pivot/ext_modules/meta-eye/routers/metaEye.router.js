const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaEye.controller');

router.route('/eye/:id').get(Controller.eye);

module.exports = router;
