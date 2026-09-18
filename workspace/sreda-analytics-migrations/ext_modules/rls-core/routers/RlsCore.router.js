const router = sreda.restmodule.Router();
const Controller = require('../controllers/RlsCore.controller');
const { param, body, oneOf, query } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');
const checkAuth = require('../../middleware-rest-check-auth/services/checkAuth');

// /rls

// todo  добавит генерацию регулярного выражения /^(pages)|(widgets)|(cloudfiles)$/i на основе подключенных модулей
// маршруты с проверкой аутентификации
//----------------------------------------------------------------------------------------------------------------------
// todo deprecated , использовать маршрут ниже
router
    .route('/status/:table_name/:table_id')
    .get(checkAuth, param('table_id').isUUID(), validateMiddleware, Controller.getAccessStatus);

// Маршрут для получения массива статусов по массиву id в теле
router
    .route('/multi/status/:table_name')
    .post(
        checkAuth,
        body('ids').notEmpty(),
        body('ids.*').isUUID(),
        validateMiddleware,
        Controller.getAccessStatusMulti
    );

// маршруты
//----------------------------------------------------------------------------------------------------------------------
router
    .route('/:table_name/:table_id/:owner')
    .get(
        query('type').matches(/^(view)|(read)|(write)|(delete)$/),
        param('table_id').isUUID(),
        param('owner').matches(/^(roles)|(rules)|(users)|(groups)$/i),
        validateMiddleware,
        Controller.getPermissions
    )
    .post(
        query('type').matches(/^(view)|(read)|(write)|(delete)$/),
        param('table_id').isUUID(),
        param('owner').matches(/^(roles)|(rules)|(users)|(groups)$/i),
        oneOf([
            body('role_id').isUUID('all'),
            body('rule_id').isUUID('all'),
            body('user_id').isUUID('all'),
            body('group_id').isUUID('all'),
        ]),
        validateMiddleware,
        Controller.addPermission
    )
    .delete(
        query('type').matches(/^(view)|(read)|(write)|(delete)$/),
        param('table_id').isUUID(),
        param('owner').matches(/^(roles)|(rules)|(users)|(groups)$/i),
        oneOf([
            body('role_id').isUUID('all'),
            body('rule_id').isUUID('all'),
            body('user_id').isUUID('all'),
            body('group_id').isUUID('all'),
        ]),
        validateMiddleware,
        Controller.delPermission
    );
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
