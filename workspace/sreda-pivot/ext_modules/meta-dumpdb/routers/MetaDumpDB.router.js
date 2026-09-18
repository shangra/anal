const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaDumpDB.controller');

router.route('/dumpdb/:id').get(Controller.dumpdb);

module.exports = router;
