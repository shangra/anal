export = SystemSettingsController;
declare class SystemSettingsController {
    static getAll(req: any, res: any, next: any): Promise<void>;
    static get(req: any, res: any, next: any): Promise<void>;
    static post(req: any, res: any, next: any): Promise<void>;
    static put(req: any, res: any, next: any): Promise<void>;
    static del(req: any, res: any, next: any): Promise<void>;
    static getServerInfo(req: any, res: any, next: any): Promise<void>;
    static shutDownServer(req: any, res: any, next: any): Promise<void>;
    static getCpuProfile(req: any, res: any, next: any): Promise<void>;
}
//# sourceMappingURL=SystemSettings.controller.d.ts.map
