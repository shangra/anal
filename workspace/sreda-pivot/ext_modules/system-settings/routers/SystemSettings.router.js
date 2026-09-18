const router = sreda.restmodule.Router();
const Controller = require('../controllers/SystemSettings.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('*')
    .all(checkAccess(['Adminpanel', 'SystemSettingsManager']))
    .post(checkAccess(['SystemSettingsWrite']))
    .put(checkAccess(['SystemSettingsWrite']))
    .delete(checkAccess(['SystemSettingsWrite']));
//----------------------------------------------------------------------------------------------------------------------

// маршруты
//----------------------------------------------------------------------------------------------------------------------
router.route('/servers/info').get(Controller.getServerInfo);
router.route('/servers/shutdown').post(Controller.shutDownServer);
router.route('/profile/cpu').post(Controller.getCpuProfile);

router.route(`/`).get(Controller.getAll).post(Controller.post);
router.route(`/:id`).get(Controller.get).put(Controller.put).delete(Controller.del);
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
