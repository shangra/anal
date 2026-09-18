const router = sreda.restmodule.Router();
const Controller = require('../controllers/Auth.controller');

// todo тесты
// маршруты
//----------------------------------------------------------------------------------------------------------------------
router.route('/registration').post(Controller.register);
router.route('/login').post(Controller.login);
router.route('/logout').get(Controller.logout);
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
