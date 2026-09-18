const router = sreda.restmodule.Router();
const MetaCompositeHelperController = require('../controllers/MetaCompositeHelper.controller');

router.route('/tree').get(MetaCompositeHelperController.tree);

module.exports = router;
