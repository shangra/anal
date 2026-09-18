const router = sreda.restmodule.Router();
const MetaQueryExplainController = require('../controllers/MetaQueryExplain.controller');

router.route('/:id').get(MetaQueryExplainController.get);
router.route('/:id').delete(MetaQueryExplainController.del);
router.route('/meta/:id').get(MetaQueryExplainController.getMeta);

module.exports = router;
