export = RlsCoreService;
declare class RlsCoreService extends Extensions {
    childrenGetters: {};
    mapping: {};
    /**
     * @decorator
     */
    transactional(_: any, functionParams: any, source: any): Promise<any>;
    addPermissions(
        table_name: any,
        idsForCreating: any,
        type: any,
        owner: any,
        owner_id: any,
        transaction: any
    ): Promise<import('../../../core/db/rls/rls').Rls[]>;
    delAllPermissions(table_name: any, transaction: any): Promise<void>;
    delPermissions(
        table_name: any,
        table_ids: any,
        type: any,
        owner: any,
        owner_id: any,
        transaction: any
    ): Promise<void>;
    getPermissions(
        table_name: any,
        table_id: any,
        owner: any,
        type: any,
        owner_id: any,
        transaction: any
    ): Promise<import('../../../core/db/rls/rls').Rls[]>;
    getChildrenNested(table_name: any, table_id: any, transaction: any): Promise<any>;
    addPermissionNested(
        table_name: any,
        table_id: any,
        type: any,
        owner: any,
        owner_id: any,
        transaction: any
    ): Promise<void>;
    delPermissionNested(
        table_name: any,
        table_id: any,
        type: any,
        owner: any,
        owner_id: any,
        transaction: any
    ): Promise<void>;
    addParentPermissionsNested(
        parentId: any,
        childId: any,
        table_name: any,
        options: {},
        transaction: any
    ): Promise<void[]>;
    delParentPermissionsNested(
        parentId: any,
        childId: any,
        table_name: any,
        transaction: any
    ): Promise<void[]>;
    getAccessUser(): Promise<{
        groups: string[];
        roles: string[];
        rules: string[];
    }>;
    setUserPermissions(
        table_name: any,
        table_id: any,
        types: any,
        permissions: any,
        transaction: any
    ): Promise<void>;
    getAccessStatus(
        table_name: any,
        table_id: any,
        transaction: any
    ): Promise<{
        isView: boolean;
        isRead: boolean;
        isWrite: boolean;
        isDelete: boolean;
    }>;
    delPermissionsByTableId(
        table_name: any,
        table_id: any,
        options?: {}
    ): Promise<{
        result: boolean;
    }>;
    delPermissionsByType(
        table_name: any,
        table_id: any,
        type: any,
        options?: {}
    ): Promise<{
        result: boolean;
    }>;
    delPermissionsByTypeAndOwner(
        table_name: any,
        table_id: any,
        type: any,
        owner: any,
        options?: {}
    ): Promise<{
        result: boolean;
    }>;
    checkAccessWrite(table_name: any, table_id: any, transaction: any): Promise<void>;
    checkAccessView(table_name: any, table_id: any, transaction: any): Promise<void>;
    checkAccessRead(table_name: any, table_id: any, transaction: any): Promise<void>;
    checkAccessDelete(table_name: any, table_id: any, transaction: any): Promise<void>;
    getAccessStatusMulti(table_name: any, ids: any, transaction: any): Promise<any[]>;
}
import Extensions = require('../../../core/class/Extensions.class');
//# sourceMappingURL=RlsCore.service.d.ts.map
