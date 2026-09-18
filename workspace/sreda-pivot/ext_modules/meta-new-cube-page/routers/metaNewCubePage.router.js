const router = sreda.restmodule.Router();
const Controller = require('../controllers/metaNewCubePage.controller');

router.route('/:id').get(Controller.get);
router.route('/:id').post(Controller.postCube);

module.exports = router;
