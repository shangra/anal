const RlsModel = require('./models/RlsCore.model');
const ApiError = require('../../../core/exceptions/ApiError');
const Extensions = require('../../../core/class/Extensions.class');
const httpContext = require('../../../core/services/http-context');
const connection = require('../../../core/db/connection');

class RlsCoreService extends Extensions {
    childrenGetters = {};

    mapping = {};

    /**
     * @decorator
     */
    async transactional(_, functionParams, source) {
        const { this: fthis, ...fargs } = functionParams;

        if (fargs.transaction) {
            return source.apply(fthis, Object.values(fargs));
        }

        fargs.transaction = await connection.transaction();
        try {
            const result = await source.apply(fthis, Object.values(fargs));
            await fargs.transaction.commit();
            return result;
        } catch (ex) {
            console.error(ex);
            await fargs.transaction.rollback();
            throw ex;
        }
    }

    async addPermissions(table_name, idsForCreating, type, owner, owner_id, transaction) {
        let capitalizedTable_name = this.mapping[table_name.toLowerCase()];
        if (!capitalizedTable_name) {
            console.warn('Отсутствует mapping для table_name');
            capitalizedTable_name = table_name;
        }
        const data = idsForCreating.map((id) => ({
            table_name: capitalizedTable_name,
            table_id: id,
            type,
            owner: owner.toLowerCase(),
            owner_id,
        }));
        const result = RlsModel.createPermissions(data, { transaction });

        return result;
    }

    async delAllPermissions(table_name, transaction) {
        await RlsModel.delPermission({
            where: {
                table_name: table_name,
            },
            transaction,
        });
    }

    async delPermissions(table_name, table_ids, type, owner, owner_id, transaction) {
        let capitalizedTable_name = this.mapping[table_name.toLowerCase()];
        if (!capitalizedTable_name) {
            console.warn('Отсутствует mapping для table_name');
            capitalizedTable_name = table_name;
        }
        await RlsModel.delPermission({
            where: {
                table_name: capitalizedTable_name,
                table_id: table_ids,
                type,
                owner: owner.toLowerCase(),
                owner_id,
            },
            transaction,
        });
    }

    async getPermissions(table_name, table_id, owner, type, owner_id, transaction) {
        let capitalizedTable_name = this.mapping[table_name.toLowerCase()];
        if (!capitalizedTable_name) {
            console.warn('Отсутствует mapping для table_name');
            capitalizedTable_name = table_name;
        }

        const options = {
            where: {
                table_name: capitalizedTable_name,
                owner: owner.toLowerCase(),
                table_id,
                type: type.toLowerCase(),
            },
            transaction,
        };
        if (owner_id) {
            options.where.owner_id = owner_id;
        }
        const result = RlsModel.getPermissions(options);
        return result;
    }

    // получение потомков выбранной сущности
    async getChildrenNested(table_name, table_id, transaction) {
        const methodName = table_name.toLowerCase();
        const method = this.childrenGetters[methodName];
        let children = [];
        if (method) {
            children = await method(table_id, [0, 1], transaction);
        } else {
            console.error('Не определен метод получения вложенных элементов в childrenGetters');
        }
        return children;
    }

    async addPermissionNested(table_name, table_id, type, owner, owner_id, transaction) {
        let idsForCreating = [table_id];
        const children = await this.getChildrenNested(table_name, table_id, transaction);
        if (children) {
            const childrenIds = children.map((child) => child.id);
            idsForCreating = [...idsForCreating, ...childrenIds];
        }
        // удаление добавляемого права, иначе возможна ошибка уникальности записи в Rls, если потомок уже обладал таким правом
        await this.delPermissions(table_name, idsForCreating, type, owner, owner_id, transaction);
        await this.addPermissions(table_name, idsForCreating, type, owner, owner_id, transaction);
    }

    async delPermissionNested(table_name, table_id, type, owner, owner_id, transaction) {
        const children = await this.getChildrenNested(table_name, table_id, transaction);
        if (children) {
            const childrenIds = children.map((child) => child.id);
            const idsForDeleting = [...childrenIds, table_id];
            return this.delPermissions(
                table_name,
                idsForDeleting,
                type,
                owner,
                owner_id,
                transaction
            );
        }
    }

    // записать все права на доступ родителя дочернему элементу и потомкам дочернего элемента
    async addParentPermissionsNested(parentId, childId, table_name, options = {}, transaction) {
        let capitalizedTable_name = this.mapping[table_name.toLowerCase()];
        // if (capitalizedTable_name === undefined) throw new Error('Отсутствует mapping для table_name');
        if (!capitalizedTable_name) {
            console.warn('Отсутствует mapping для table_name');
            capitalizedTable_name = table_name;
        }
        let parentPermissions = await RlsModel.getTableIdPermissions(
            parentId,
            capitalizedTable_name,
            { transaction }
        );

        //Внешние правила копирования прав
        if (options.filter) parentPermissions = parentPermissions.filter(options.filter);
        if (options.append) parentPermissions = options.append(parentPermissions);

        const promises = parentPermissions.map(({ table_name, type, owner, owner_id }) =>
            this.addPermissionNested(table_name, childId, type, owner, owner_id, transaction)
        );
        return Promise.all(promises);
    }

    // удалить все права на доступ родителя дочернему элементу и потомкам дочернего элемента
    async delParentPermissionsNested(parentId, childId, table_name, transaction) {
        let capitalizedTable_name = this.mapping[table_name.toLowerCase()];
        // if (capitalizedTable_name === undefined) throw new Error('Отсутствует mapping для table_name');
        if (!capitalizedTable_name) {
            console.warn('Отсутствует mapping для table_name');
            capitalizedTable_name = table_name;
        }
        const parentPermissions = await RlsModel.getTableIdPermissions(
            parentId,
            capitalizedTable_name,
            { transaction }
        );
        const promises = parentPermissions.map(({ table_name, type, owner, owner_id }) =>
            this.delPermissionNested(table_name, childId, type, owner, owner_id, transaction)
        );
        return Promise.all(promises);
    }

    async getAccessUser() {
        const { user } = httpContext.get('sessionStorage');
        const permissions = {
            groups: Object.keys(user.groups),
            roles: Object.keys(user.roles),
            rules: Object.keys(user.ruleLogs),
        };
        return permissions;
    }
    async setUserPermissions(table_name, table_id, types, permissions, transaction) {
        const allPromise = types
            .map((type) => {
                return Object.keys(permissions).map((owner) => {
                    return permissions[owner].map((owner_id) => {
                        return this.addPermissionNested(
                            table_name,
                            table_id,
                            type,
                            owner,
                            owner_id,
                            transaction
                        );
                    });
                });
            })
            .flat(Infinity);
        await Promise.all(allPromise);
    }

    async getAccessStatus(table_name, table_id, transaction) {
        const { user } = httpContext.get('sessionStorage');
        let capitalizedTable_name = this.mapping[table_name.toLowerCase()];
        // if (capitalizedTable_name === undefined) throw new Error('Отсутствует mapping для table_name');
        if (!capitalizedTable_name) {
            console.warn('Отсутствует mapping для table_name');
            capitalizedTable_name = table_name;
        }
        const allUserAccess = { ...user.ruleLogs, ...user.groups, ...user.roles, [user.id]: true };
        const permissions = await RlsModel.getPermissions({
            where: {
                table_name: capitalizedTable_name,
                table_id,
            },
            raw: true,
            transaction,
        });
        const viewPerms = permissions.filter((perm) => perm.type === 'view');
        const readPerms = permissions.filter((perm) => perm.type === 'read');
        const writePerms = permissions.filter((perm) => perm.type === 'write');
        const deletePerms = permissions.filter((perm) => perm.type === 'delete');

        const isView = viewPerms.some((perm) => {
            const owner = perm.owner_id;
            return !!allUserAccess[owner];
        });
        const isRead = readPerms.some((perm) => {
            const owner = perm.owner_id;
            return !!allUserAccess[owner];
        });
        const isWrite = writePerms.some((perm) => {
            const owner = perm.owner_id;
            return !!allUserAccess[owner];
        });
        const isDelete = deletePerms.some((perm) => {
            const owner = perm.owner_id;
            return !!allUserAccess[owner];
        });

        const result = { isView, isRead, isWrite, isDelete };

        return result;
    }

    async delPermissionsByTableId(table_name, table_id, options = {}) {
        await RlsModel.delPermission({
            ...options,
            where: {
                table_name,
                table_id,
            },
        });
        return { result: true };
    }

    async delPermissionsByType(table_name, table_id, type, options = {}) {
        await RlsModel.delPermission({
            ...options,
            where: {
                table_name,
                table_id,
                type,
            },
        });
        return { result: true };
    }

    async delPermissionsByTypeAndOwner(table_name, table_id, type, owner, options = {}) {
        await RlsModel.delPermission({
            ...options,
            where: {
                table_name,
                table_id,
                owner,
                type,
            },
        });
        return { result: true };
    }

    async checkAccessWrite(table_name, table_id, transaction) {
        const { isWrite } = await this.getAccessStatus(table_name, table_id, transaction);
        if (!isWrite) throw ApiError.AccessRestricted('Доступ закрыт');
    }

    async checkAccessView(table_name, table_id, transaction) {
        const { isView } = await this.getAccessStatus(table_name, table_id, transaction);
        if (!isView) throw ApiError.AccessRestricted('Доступ закрыт');
    }

    async checkAccessRead(table_name, table_id, transaction) {
        const { isRead } = await this.getAccessStatus(table_name, table_id, transaction);
        if (!isRead) throw ApiError.AccessRestricted('Доступ закрыт');
    }

    async checkAccessDelete(table_name, table_id, transaction) {
        const { isDelete } = await this.getAccessStatus(table_name, table_id, transaction);
        if (!isDelete) throw ApiError.AccessRestricted('Доступ закрыт');
    }

    async getAccessStatusMulti(table_name, ids, transaction) {
        const promises = ids.map(
            (table_id) =>
                new Promise((resolve) => {
                    this.getAccessStatus(table_name, table_id, transaction).then((status) =>
                        resolve({ [table_id]: status })
                    );
                })
        );
        return Promise.all(promises);
    }
}

module.exports = RlsCoreService;
