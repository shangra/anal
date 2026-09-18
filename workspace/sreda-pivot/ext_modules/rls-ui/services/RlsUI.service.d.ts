export = RlsUIService;
declare class RlsUIService extends Extensions {
    getAllPermissions(
        table_name: any,
        table_id: any,
        queryType: any
    ): Promise<{
        users: any;
        roles: any;
        rules: any;
        groups: any;
    }>;
    getAdmittedUsers(table_name: any, table_id: any, type: any): Promise<any>;
    getAdmittedRoles(table_name: any, table_id: any, type: any): Promise<any>;
    getAdmittedRules(table_name: any, table_id: any, type: any): Promise<any>;
    getAdmittedGroups(table_name: any, table_id: any, type: any): Promise<any>;
    getPermissionsMeta(
        table_name: any,
        table_id: any,
        owner: any,
        type: any
    ): Promise<any>;
    getEntityAllTypePermissions(
        table_name: any,
        table_id: any,
        owner: any
    ): Promise<any[]>;
}
import Extensions = require('../../../core/class/Extensions.class');
//# sourceMappingURL=RlsUI.service.d.ts.map
