const router = sreda.restmodule.Router();
const MetaSearchController = require('../controllers/MetaSearch.controller');

router.route('/query').get(MetaSearchController.query);

module.exports = router;
