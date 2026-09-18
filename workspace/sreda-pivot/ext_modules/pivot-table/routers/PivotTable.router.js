const router = sreda.restmodule.Router();
const Controller = require('../controllers/PivotTable.controller');
const parseFloat = require('../../middleware-rest-decimal/service/expressDecimal');
const { body } = require('express-validator');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');

router.route('/body/new/:id').post(
    parseFloat,
    Controller.get
);

router.route('/body/:id').post(Controller.getOldTableData);
router.route('/body/:id/:answerId').get(Controller.getTableDataResults);

router.route('/body/query/cancel').post(
    body('answerIds').isArray().notEmpty(),
    validateMiddleware,
    Controller.cancelRequest);

// запрос параметров для меню сводной таблицы
router.route('/menu/:id').get(Controller.getMenuParameters);
// дозапрос параметров меню при глубокой вложенности элементов
router.route('/menu/:id/children').get(Controller.getMenuChildParams);


module.exports = router;
