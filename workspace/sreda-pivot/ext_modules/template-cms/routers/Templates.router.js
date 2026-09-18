const router = sreda.restmodule.Router();
const Controller = require('../controllers/Templates.controller');
const { param, body, query } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('*')
    .all(checkAccess(['Adminpanel']))
    // get маршруты - публичные и используются в pages и systemsettings, поэтому не ограничиваем правом "TemplatesManager"
    .get(checkAccess(['TemplatesRead']))
    .post(checkAccess(['TemplatesWrite', 'TemplatesManager']))
    .put(checkAccess(['TemplatesWrite', 'TemplatesManager']))
    .delete(checkAccess(['TemplatesWrite', 'TemplatesManager']));
//----------------------------------------------------------------------------------------------------------------------

// маршруты
//----------------------------------------------------------------------------------------------------------------------
router.route('/getlisttypes').get(Controller.getListTypes);

router
    .route('/copy')
    .post(
        body('id').isUUID(),
        body('name').isString().notEmpty(),
        validateMiddleware,
        Controller.copyTemplate
    );

router
    .route('/')
    // todo тесты валидация swagger
    .get(query('filter').optional().isJSON(), validateMiddleware, Controller.getAllTemplates)
    .post(
        body('name').isString().notEmpty(),
        body('parent').isUUID(),
        validateMiddleware,
        Controller.createTemplate
    );

router.use(['/:id*'], param('id').isUUID('all'), validateMiddleware);

router
    .route('/:id')
    .get(query('filter').optional().isJSON(), validateMiddleware, Controller.getTemplateMeta)
    .delete(
        param('id').not().isIn(['00000000-0000-0000-0000-000000000000']),
        validateMiddleware,
        Controller.delTemplate
    )
    .put(
        body('name').optional().isString().notEmpty(),
        body('data').optional().isString(),
        validateMiddleware,
        Controller.editTemplate
    );

router
    .route('/:id/params')
    .get(query('filter').optional().isJSON(), validateMiddleware, Controller.getTemplateParams);

router
    .route('/:id/params/:param_id')
    .put(
        param('param_id').isUUID('all'),
        body('params_type_id').isUUID(),
        validateMiddleware,
        Controller.setTemplateParamType
    );

router.route('/:id/restore').put(Controller.restoreTemplate);
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
