const router = sreda.restmodule.Router();
const Controller = require('../controllers/SchemasManager.controller');
const checkAuth = require('../../middleware-rest-check-auth/services/checkAuth.js');
const { param, body, oneOf, query } = require('express-validator');

router.route('/:ownerId/available').get(checkAuth, Controller.getAllSchemas);

router.route('/:ownerId').post(checkAuth, Controller.createSchema);

router
    .route('/:ownerId/:schemaId')
    .get(checkAuth, Controller.getSchema)
    .put(checkAuth, Controller.editSchema)
    .delete(checkAuth, Controller.delSchema);

router
    .route('/permissions/:ownerId/:schemaId')
    .post(
        checkAuth,
        param('ownerId').isUUID(),
        param('schemaId').isUUID(),
        oneOf([body('user_id').isUUID('all')]),
        Controller.setPermissions
    );

router
    .route('/permissions/:ownerId/:schemaId')
    .put(
        checkAuth,
        param('ownerId').isUUID(),
        param('schemaId').isUUID(),
        oneOf([body('user_id').isUUID('all')]),
        Controller.putPermissions
    );

router
    .route('/permissions/:ownerId/:schemaId')
    .delete(
        checkAuth,
        param('ownerId').isUUID(),
        param('schemaId').isUUID(),
        oneOf([body('user_id').isUUID('all')]),
        Controller.delPermissions
    );

module.exports = router;
