const router = sreda.restmodule.Router();
const Controller = require('../controllers/code.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('*')
    .all(checkAccess(['Adminpanel', 'CodeManager']))
    .post(checkAccess(['CodeWrite']))
    .put(checkAccess(['CodeWrite']))
    .delete(checkAccess(['CodeWrite']));
//----------------------------------------------------------------------------------------------------------------------

router.route('/').get(Controller.getAll);
router.route('/run/:id').get(Controller.run);
router.route('/:id').get(Controller.get);

router.route('/').post(Controller.post);
router.route('/copy').post(Controller.copy);
router.route('/:id').put(Controller.put);
router.route('/:id').delete(Controller.del);

module.exports = router;
