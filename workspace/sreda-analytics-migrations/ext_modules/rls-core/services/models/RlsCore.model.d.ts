export = RlsCoreModel;
declare class RlsCoreModel {
    static getPermissions(options: any): Promise<Rls[]>;
    static getTableName(tableName: any, options?: {}): Promise<any>;
    static createPermissions(data: any, options?: {}): Promise<Rls[]>;
    static delPermission(options: any): Promise<number>;
    static getTableIdPermissions(table_id: any, table_name: any, options?: {}): Promise<Rls[]>;
}
import { Rls } from '../../../../core/db/rls/rls';
//# sourceMappingURL=RlsCore.model.d.ts.map
