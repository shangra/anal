const router = sreda.restmodule.Router();
const Controller = require('../controllers/RlsUI.controller');
const { param, query } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');
const checkAuth = require('../../middleware-rest-check-auth/services/checkAuth');

// маршруты
// todo  тесты
//----------------------------------------------------------------------------------------------------------------------
router
    .route('/meta/:table_name/:table_id/:owner')
    .get(
        checkAuth,
        query('type').matches(/^(view)|(read)|(write)|(delete)$/),
        param('table_id').isUUID(),
        param('owner').matches(/^(roles)|(rules)|(users)|(groups)$/i),
        validateMiddleware,
        Controller.getPermissionsMeta
    );

router
    .route('/meta/:table_name/:table_id/:owner/all')
    .get(
        param('table_id').isUUID(),
        param('owner').matches(/^(roles)|(rules)|(users)|(groups)$/i),
        validateMiddleware,
        Controller.getEntityAllTypePermissions
    );

router
    .route('/:table_name/:table_id/permissions')
    .get(
        checkAuth,
        query('type').matches(/^(view)|(read)|(write)|(delete)$/),
        param('table_id').isUUID(),
        validateMiddleware,
        Controller.getAllPermissions
    );
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
