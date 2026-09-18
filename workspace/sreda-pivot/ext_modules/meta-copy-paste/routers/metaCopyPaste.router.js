const router = sreda.restmodule.Router();
const inTransaction = require('../../middleware-rest-in-transaction/middleware.local/inTransaction');
const Controller = require('../controllers/metaCopyPaste.controller');

router.route('/copy/:id').get(Controller.copy);
router.route('/paste/:id').post(/** inTransaction, */ Controller.paste);

module.exports = router;
