const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaMatrix.controller');

router.route('/matrix/:id').get(Controller.matrix);

module.exports = router;
