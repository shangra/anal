const router = sreda.restmodule.Router();
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess.js');

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route(['/metadata*', '/meta/metadata*'])
    .all(checkAccess(['MetadataAccessRead', 'Adminpanel']))
    .post(checkAccess(['MetadataAccessWrite']))
    .put(checkAccess(['MetadataAccessWrite']))
    .delete(checkAccess(['MetadataAccessWrite']));

//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
