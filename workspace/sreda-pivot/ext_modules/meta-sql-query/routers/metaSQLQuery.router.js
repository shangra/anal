const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaSQLQuery.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

router.route('/:id').post(checkAccess(['Adminpanel', 'MetadataAdmin']), Controller.postQuery);

module.exports = router;
