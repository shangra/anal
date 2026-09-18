const router = sreda.restmodule.Router();
const Controller = require('../controllers/PagesUi.controller');
const { param, body } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');

// маршруты
//----------------------------------------------------------------------------------------------------------------------
router
    .route('/breadcrumbs/:id')
    .get(
        param('id').isUUID(),
        validateMiddleware,
        Controller.getPageBreadCrumbs
    );
// todo тесты на active в query параметрах
router
    .route('/meta/:id')
    .get(param('id').isUUID(), validateMiddleware, Controller.getPageMeta);
router
    .route('/render/:id')
    .post(
        param('id').isUUID(),
        body('*.name').isString().notEmpty(),
        body('*.value').isString(),
        body('*.paramtype').optional().isString().notEmpty(),
        validateMiddleware,
        Controller.renderTemplate
    );
router
    .route('/render')
    .post(
        body('content_type').isString().notEmpty(),
        body('Template.form').isString().notEmpty(),
        body('PagesParams').optional(),
        body('PagesParams.*.name').isString().notEmpty(),
        body('PagesParams.*.value').isString(),
        body('PagesParams.*.paramtype').isString().notEmpty(),
        body('UrlParams').isArray(),
        validateMiddleware,
        Controller.render
    );
router.route('/*').get(Controller.getPage);
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
