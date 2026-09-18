const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaCopyInfofields.controller');
const inTransaction = require('../../middleware-rest-in-transaction/middleware.local/inTransaction');

router.route('/copyfield/:id').post(/** inTransaction, */ Controller.copyfield);

module.exports = router;
