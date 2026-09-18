const checkAuth = require('../../middleware-rest-check-auth/services/checkAuth'); //  ../../middleware/checkAuth');
const router = sreda.restmodule.Router();
const Controller = require('../controllers/Device.controller');

// /devices

// todo тесты валидация

// маршруты с проверкой аутентификации пользователя
//----------------------------------------------------------------------------------------------------------------------
//
router
    .route('/')
    .get(checkAuth, Controller.getUserDevices)
    .post(Controller.saveDevice);

router.route('/:id/apply').post(checkAuth, Controller.applyDevice);

//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
