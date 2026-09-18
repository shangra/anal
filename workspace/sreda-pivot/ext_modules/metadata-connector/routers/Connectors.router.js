const router = sreda.restmodule.Router();

const Controller = require('../controllers/Connectors.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');
const checkAuth = require('../../middleware-rest-check-auth/services/checkAuth');

const { body } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');

const connectorChain = [
    body('name')
        .isString()
        .withMessage('В поле "Имя" указано некорректное значение')
        .trim()
        .notEmpty()
        .withMessage('Не указано обязательное поле "Имя"'),
    body('settings.dialect')
        .isString()
        .withMessage('В поле "Диалект" указано некорректное значение')
        .trim()
        .notEmpty()
        .withMessage('Не указано обязательное поле "Диалект"'),
    validateMiddleware,
];

router.route('/metadata').all(checkAccess(['Adminpanel', 'MetadataAdmin']));
router.route('/metadata/:id').all(checkAccess(['Adminpanel', 'MetadataAdmin']));

router.route('/metadata').get(Controller.metadata);
router.route('/metadata').post(connectorChain, Controller.createMetadata);
router.route('/metadata/:id').get(Controller.metadataItem);
router.route('/metadata/:id').put(connectorChain, Controller.updateMetadata);
router.route('/metadata/:id').patch(connectorChain, Controller.patchMetadata);
router.route('/metadata/:id').delete(Controller.deleteMetadata);

router.route('/').all(checkAuth);
router.route('/').post(Controller.create);
router.route('*').all(checkAccess(['MetadataRead']));
router.route('/:id').get(Controller.read);
router.route('/:id').put(Controller.update);
router.route('/:id').delete(Controller.delete);
router.route('/:id/test').get(Controller.test);

module.exports = router;
