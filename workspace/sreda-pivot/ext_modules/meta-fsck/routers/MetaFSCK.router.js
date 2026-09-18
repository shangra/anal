const router = sreda.restmodule.Router();
const Controller = require('../controllers/MetaFSCK.controller');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');

router
    .route('/:id')
    .post(checkAccess(['Adminpanel', 'MetadataAdmin']), Controller.postQuery);

module.exports = router;
