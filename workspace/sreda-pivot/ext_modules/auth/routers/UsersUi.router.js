const router = sreda.restmodule.Router();
const Controller = require('../controllers/UsersUi.controller');
const uploadFile = require('../../middleware-rest-upload-file/services/uploadFile');
const validateMiddleware = require('../../middleware-rest-validate/services/validateMiddleware');
const { body, param, query } = require('express-validator');
const checkAccess = require('../../middleware-rest-check-access/services/checkAccess');
const isUserOwner = require('../middleware.local/isUserOwner');
const { loginRegExp, emailRegExp } = require('../src/constants');

// доступ к собственной информации пользователя
//----------------------------------------------------------------------------------------------------------------------
router
    .route('/private/users/:id/meta')
    .get(isUserOwner, Controller.getUserMeta);
//----------------------------------------------------------------------------------------------------------------------

router
    .route('/users*')
    .all(checkAccess(['UsersRead']))
    .post(checkAccess(['UsersWrite']))
    .put(checkAccess(['UsersWrite']))
    .delete(checkAccess(['UsersWrite']));

router
    .route('/roles*')
    .all(checkAccess(['RolesRead']))
    .post(checkAccess(['RolesWrite']))
    .put(checkAccess(['RolesWrite']))
    .delete(checkAccess(['RolesWrite']));

router
    .route('/rules*')
    .all(checkAccess(['RulesRead']))
    .post(checkAccess(['RulesWrite']))
    .put(checkAccess(['RulesWrite']))
    .delete(checkAccess(['RulesWrite']));

router
    .route('/groups*')
    .all(checkAccess(['GroupsRead']))
    .post(checkAccess(['GroupsWrite']))
    .put(checkAccess(['GroupsWrite']))
    .delete(checkAccess(['GroupsWrite']));

router
    .route('/public/users')
    .get(
        query('filter').optional().isJSON(),
        validateMiddleware,
        Controller.getUsers
    )
    .post(
        body('password').isString().notEmpty(),
        body('login').matches(loginRegExp),
        validateMiddleware,
        Controller.createUser
    );

router
    .route('/public/groups/:id/users')
    .get(Controller.getGroupUsers)
    .post(
        body('user_id').isUUID(4),
        validateMiddleware,
        Controller.addGroupUser
    )
    .delete(
        body('user_id').isUUID(4),
        validateMiddleware,
        Controller.delGroupUser
    );

// проверка наличия указанных прав у пользователя
//----------------------------------------------------------------------------------------------------------------------
router.route('*').all(checkAccess(['UserManager', 'Adminpanel']));

router.route('/matrix/rolerule').all(checkAccess(['MatrixRead']));
//----------------------------------------------------------------------------------------------------------------------

router
    .route('/groups/list/users')
    .post(
        body('groupIds.*').isUUID('all'),
        validateMiddleware,
        Controller.getGroupsUsers
    );

// валидация
//----------------------------------------------------------------------------------------------------------------------
router.use(
    ['/users/:id*', '/rules/:id*', '/roles/:id*', '/groups/:id*'],
    param('id').isUUID('all'),
    validateMiddleware
);
//----------------------------------------------------------------------------------------------------------------------

// маршруты
//----------------------------------------------------------------------------------------------------------------------

// rules
router
    .route('/rules')
    .get(
        query('filter').optional().isJSON(),
        validateMiddleware,
        Controller.getAllRules
    );

router.route('/rules/:id/meta').get(Controller.getRuleMeta);

// users
router.route('/users/:id/meta').get(Controller.getUserMeta);

// todo тесты валидация
router.route('/users/:id/block').post(Controller.blockUser);
router.route('/users/:id/unblock').post(Controller.unblockUser);

// todo тесты валидация
router.route('/attributes/allowed').get(Controller.getAllowedAttributes);

// todo тесты валидация
router
    .route('/users/:id/attribute/:attributeId')
    .post(Controller.setUserAttribute);

router
    .route('/users/:id')
    .get(Controller.getUser)
    .delete(Controller.deleteUser)
    .put(
        body('login').optional().matches(loginRegExp),
        body('password').optional().isString().notEmpty(),
        body('status').optional().isIn([0, 1, '0', '1']),
        body('name').optional().isString().notEmpty(),
        body('email').optional().matches(emailRegExp),
        body('details').optional().isString(),
        validateMiddleware,
        uploadFile,
        Controller.editUser
    );

router
    .route('/users')
    .get(
        query('filter').optional().isJSON(),
        validateMiddleware,
        Controller.getUsers
    )
    .post(
        body('password').isString().notEmpty(),
        body('login').matches(loginRegExp),
        validateMiddleware,
        Controller.createUser
    );

router
    .route('/users/:id/rules')
    .get(Controller.getUserRules)
    .post(body('rule_id').isUUID(4), validateMiddleware, Controller.addUserRule)
    .delete(
        body('rule_id').isUUID(4),
        validateMiddleware,
        Controller.delUserRule
    );

router
    .route('/users/:id/roles')
    .get(Controller.getUserRoles)
    .post(body('role_id').isUUID(4), validateMiddleware, Controller.addUserRole)
    .delete(
        body('role_id').isUUID(4),
        validateMiddleware,
        Controller.delUserRole
    );

// todo тесты валидация
router
    .route('/users/:id/groups')
    .get(Controller.getUserGroups)
    .post(
        body('group_id').isUUID(4),
        validateMiddleware,
        Controller.addUserGroup
    )
    .delete(
        body('group_id').isUUID(4),
        validateMiddleware,
        Controller.delUserGroup
    );

// roles
router
    .route('/roles/:id')
    .get(Controller.getRole)
    .put(
        body(['color', 'details']).optional().isString(),
        body('name').notEmpty().isString(),
        validateMiddleware,
        Controller.editRole
    )
    .delete(Controller.delRole);

router
    .route('/roles/:id/rules')
    .post(body('rule_id').isUUID(4), validateMiddleware, Controller.addRoleRule)
    .delete(
        body('rule_id').isUUID(4),
        validateMiddleware,
        Controller.delRoleRule
    );

router
    .route('/roles/:id/users')
    .post(body('user_id').isUUID(4), validateMiddleware, Controller.addRoleUser)
    .delete(
        body('user_id').isUUID(4),
        validateMiddleware,
        Controller.delRoleUser
    );

router.route('/roles/:id/rules').get(Controller.getRoleRules);

router.route('/roles/:id/users').get(Controller.getRoleUsers);

router.route('/roles/:id/meta').get(Controller.getRoleMeta);

router
    .route('/roles')
    .get(
        query('filter').optional().isJSON(),
        validateMiddleware,
        Controller.getAllRoles
    )
    .post(
        body(['color', 'details']).optional().isString(),
        body('name').isString().notEmpty(),
        validateMiddleware,
        Controller.createRole
    );

// groups
// todo тесты

router.route('/opengroups').get(Controller.getOpenGroups);

router
    .route('/groups/:id')
    .get(Controller.getGroup)
    .put(
        body(['description']).optional().isString(),
        body('name').optional().notEmpty().isString(),
        validateMiddleware,
        Controller.editGroup
    )
    .delete(Controller.delGroup);

router.route('/groups/:id/meta').get(Controller.getGroupMeta);

router
    .route('/groups')
    .get(
        query('filter').optional().isJSON(),
        validateMiddleware,
        Controller.getAllGroups
    )
    .post(Controller.createGroup);

router
    .route('/groups/:id/users')
    .get(Controller.getGroupUsers)
    .post(
        body('user_id').isUUID(4),
        validateMiddleware,
        Controller.addGroupUser
    )
    .delete(
        body('user_id').isUUID(4),
        validateMiddleware,
        Controller.delGroupUser
    );

// matrix
router
    .route('/matrix/rolerule')
    .get(
        query('xFilter').optional().isJSON(),
        validateMiddleware,
        Controller.getRoleRuleMatrix
    );
router
    .route('/matrix/userrole')
    .get(
        query('xFilter').optional().isJSON(),
        validateMiddleware,
        Controller.getUserRoleMatrix
    );
router
    .route('/matrix/usergroup')
    .get(
        query('xFilter').optional().isJSON(),
        validateMiddleware,
        Controller.getUserGroupMatrix
    );
router
    .route('/matrix/userrule')
    .get(
        query('xFilter').optional().isJSON(),
        validateMiddleware,
        Controller.getUserRuleMatrix
    );
//----------------------------------------------------------------------------------------------------------------------

module.exports = router;
