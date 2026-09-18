const router = sreda.restmodule.Router();
const Controller = require('../controllers/Reports.controller');
const parseFloat = require('../../middleware-rest-decimal/service/expressDecimal');

router.route('/body/:id').post(
    parseFloat,
    Controller.getTableData
);
router.route('/body/:id/:answerId').get(Controller.getTableDataResults);

module.exports = router;
