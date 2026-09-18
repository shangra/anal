const router = sreda.restmodule.Router();
const Controller = require('../controllers/Store.controller');

// todo тесты
router.route('/getuserdata').get(Controller.getAllUserData);
router.route('/setuserdata/:key').post(Controller.setUserData);
router.route('/getuserdata/:key').get(Controller.getUserData);

module.exports = router;
