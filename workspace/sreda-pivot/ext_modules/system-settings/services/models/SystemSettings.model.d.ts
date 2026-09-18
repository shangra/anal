export = SystemSettingsModel;
declare class SystemSettingsModel {
    static get(id: any, options?: {}): Promise<any>;
    static getChildren(id: any, options?: {}): Promise<any>;
    static getAllSettings(): Promise<any>;
    static new(body: any): Promise<any>;
    static update(
        id: any,
        data: any
    ): Promise<{
        result: boolean;
    }>;
    static del(id: any): Promise<{
        result: boolean;
    }>;
}
//# sourceMappingURL=SystemSettings.model.d.ts.map
