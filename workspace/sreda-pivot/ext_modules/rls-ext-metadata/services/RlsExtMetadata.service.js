const RlsCoreServiceClass = require('../../rls-core/services/RlsCore.service');
const MetadataServiceClass = require('../../metadata-cmp/services/Metadata.service');
const ApiError = require('../../../core/exceptions/ApiError');
const httpContext = require('../../../core/services/http-context');

const RlsCoreService = new RlsCoreServiceClass();
const MetadataService = new MetadataServiceClass();

class RlsExtMetadataService {
    extensionChildrenGetters = 'metadata';

    extensionMapping = { metadata: 'Metadata' };

    async createMetadataAfter(innerResult) {
        if (!innerResult?.id) {
            return innerResult;
        }
        let sessionStorage = httpContext.get('sessionStorage');
        const parentId =
            innerResult.parent || '00000000-0000-0000-0000-000000000000';
        // добавляем все доступы родителя, если подключено расширение rlsCore

        const options = {
            filter: (item) => {
                const userGroups = Object.keys(sessionStorage?.user?.groups || {});
                const AllRead = '90499885-ae60-440b-a59f-cfd3958110cd';

                let result = true;
                //Отрезаем права AllRead
                if (item.type === 'view' && item.owner === 'rules' && item.owner_id === AllRead) {
                    result = false;
                }

                //Отрезаем все группы которые не принадлежат пользователю
                if (
                    item.type === 'view' &&
                    item.owner === 'groups' &&
                    !userGroups.includes(item.owner_id)
                ) {
                    result = false;
                }
                if (
                    item.type === 'write' &&
                    item.owner === 'groups' &&
                    !userGroups.includes(item.owner_id)
                ) {
                    result = false;
                }
                if (
                    item.type === 'delete' &&
                    item.owner === 'groups' &&
                    !userGroups.includes(item.owner_id)
                ) {
                    result = false;
                }

                return result;
            },
            append: (PermissionsList) => {
                const Administrator = '12e32c9d-6e4f-4d57-ae22-5cddaabf343c';
                const Permission = {
                    table_name: 'Metadata',
                    table_id: parentId,
                    owner: 'rules',
                    type: 'view',
                    owner_id: Administrator,
                };
                if (
                    !PermissionsList.find((item) => {
                        return (
                            item.table_name === Permission.table_name &&
                            item.table_id === Permission.table_id &&
                            item.owner === Permission.owner &&
                            item.type === Permission.type &&
                            item.owner_id === Permission.owner_id
                        );
                    })
                ) {
                    PermissionsList.push(Permission);
                }

                return PermissionsList;
            },
        };
        await RlsCoreService.addParentPermissionsNested(
            parentId,
            innerResult.id,
            'metadata',
            options
        );
        return innerResult;
    }

    async addMetadataBefore(innerResult, functionParams) {
        const metadataId = functionParams.metadata.owner_id;
        await RlsCoreService.checkAccessWrite('Metadata', metadataId);
        return innerResult;
    }

    // расширяет в модуле RlsCore список функций для получения вложенных элементов
    async extendChildrenGetter(innerResult, functionParams) {
        const { table_name, this: contextRlsCore } = functionParams;

        const methodName = table_name.toLowerCase();
        if (methodName !== this.extensionChildrenGetters) return innerResult;

        const currMethod = contextRlsCore.childrenGetters[methodName];
        if (currMethod && currMethod.binded !== MetadataService) {
            throw ApiError.BadRequest(
                `Ошибка при расширении childrenGetters, добавляемый метод уже определен (${this.extensionChildrenGetters})`
            );
        }

        const newMethod = MetadataService.getMetadataChildren.bind(MetadataService);
        newMethod.binded = MetadataService;

        contextRlsCore.childrenGetters[methodName] = newMethod;
        return innerResult;
    }

    async setMapping(innerResult, functionParams) {
        const mapping = functionParams.this.mapping ?? {};
        functionParams.this.mapping = { ...mapping, ...this.extensionMapping };
        return innerResult;
    }
}

module.exports = RlsExtMetadataService;
