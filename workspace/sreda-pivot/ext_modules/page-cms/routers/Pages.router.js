// const router = require('express').Router();
const router = sreda.restmodule.Router();
const Controller = require('../controllers/Pages.controller');
const { param, body, oneOf, query } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('*')
    .post(checkAccess(['PagesWrite']))
    .put(checkAccess(['PagesWrite']))
    .delete(checkAccess(['PagesWrite']));
//----------------------------------------------------------------------------------------------------------------------

router
    .route('/public/params/:paramId')
    .put(
        param('paramId').isUUID('all'),
        validateMiddleware,
        Controller.editPublicPageParamById
    );

router
    .route('/public/:id/pname/:paramName')
    .put(
        body('value').isString(),
        validateMiddleware,
        Controller.editPublicPageParamByName
    );

router
    .route('/public/:id/pname/:paramName')
    .get(validateMiddleware, Controller.getPageParamsByName);

// вынесенно из админпанели так как создание страницы требуется для старта процесса с стороны клиента
router
    .route('/')
    .post(
        body(['parentUri']).isString(),
        oneOf([
            body('description').isString().notEmpty(),
            body('name').notEmpty().matches('^[a-z0-9_]+$', 'g'),
        ]),
        body('parent').isUUID(),
        body('template').isUUID().optional(),
        query('resetParams').isBoolean().optional(),
        validateMiddleware,
        Controller.createPage
    );

router
    .route('/:id')
    .delete(
        param('id').isUUID('all'),
        param('id').not().isIn(['00000000-0000-0000-0000-000000000000']),
        validateMiddleware,
        Controller.delPage
    )
    // todo добавить изменение uri у вложенных страниц при перемещении родителя
    .put(
        param('id').isUUID('all'),
        body(['name']).optional().notEmpty(),
        body(['name', 'description', 'uri', 'content_type'])
            .optional()
            .isString(),
        body(['active']).optional().isInt(),
        body(['parent', 'template', 'link']).optional().isUUID(),
        body('params').optional().isArray(),
        validateMiddleware,
        Controller.editPage
    );

router
    .route('*')
    .get(checkAccess(['PagesRead']))
    .post(checkAccess(['Adminpanel', 'PagesManager']))
    .put(checkAccess(['Adminpanel', 'PagesManager']))
    .delete(checkAccess(['Adminpanel', 'PagesManager']));

// маршруты
//----------------------------------------------------------------------------------------------------------------------
// todo добавить изменение uri, доступа у вложенных страниц при копировании
router.route('/copy').post(Controller.copyPage);

router
    .route('/generateUri')
    .get(query('description').isString(), Controller.generateUri);

router
    .route('/params/:paramId')
    .put(
        param('paramId').isUUID('all'),
        body().isObject(),
        body('value').isString(),
        validateMiddleware,
        Controller.editPageParamById
    );

router
    .route('/')
    // todo тесты валидация swagger
    .get(
        query('filter').optional().isJSON(),
        validateMiddleware,
        Controller.getAllPages
    );

// валидация id для всех роутов ниже
//----------------------------------------------------------------------------------------------------------------------
router.use(['/:id*'], param('id').isUUID('all'), validateMiddleware);
//----------------------------------------------------------------------------------------------------------------------

router
    .route('/:id')
    .get(
        query('filter').optional().isJSON(),
        query('withSubChildren').optional().isString(),
        query('withRls').optional().isBoolean(),
        validateMiddleware,
        Controller.getPageMeta
    );

// Вторая версия роута получения страницы с потомками
router
    .route('/:id/v2')
    .get(
        query('filter').optional().isJSON(),
        query('force').optional().toBoolean().isBoolean(),
        validateMiddleware,
        Controller.getPageMetaV2
    );

router
    .route('/:id/params/:paramId')
    .put(
        param('paramId').isUUID('all'),
        body('value').isString(),
        validateMiddleware,
        Controller.editPageParam
    );

router
    .route('/:id/template/:template_id/params')
    .get(
        query('filter').optional().isJSON(),
        param('template_id').isUUID('all'),
        validateMiddleware,
        Controller.getPageParamsByTemplate
    );

// todo тесты swagger
router.route('/:id/restore').put(Controller.restorePage);
//----------------------------------------------------------------------------------------------------------------------

// todo тесты swagger
router.route('/:id/rank').put(Controller.setRanks);

// router.route('/:id/withChildren')
//     .get(
//         query('filter').optional().isJSON(),
//         validateMiddleware,
//         Controller.getPageMetaWithSubChildren)

module.exports = router;
