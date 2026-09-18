export = SystemSettingsService;
declare class SystemSettingsService extends Extensions {
    appendSettingToEnv(settings: any): Promise<void>;
    removeSettingFromEnv(settings: any): Promise<void>;
    getAllSettings(): Promise<any>;
    getChildren(id: any): Promise<any>;
    get(
        id: any,
        options: any
    ): Promise<{
        now: any;
        children: any;
    }>;
    post(name: any, parent: any): Promise<any>;
    put(
        id: any,
        body: any
    ): Promise<{
        result: boolean;
    }>;
    del(id: any): Promise<{
        result: boolean;
    }>;
    getServerInfo(): Promise<{
        [x: number]: {
            connectionsCount: any;
            ESB_NAME: any;
        };
    }>;
    getCpuProfile(timeout: any): Promise<any>;
}
import Extensions = require('../../../core/class/Extensions.class');
//# sourceMappingURL=SystemSettings.service.d.ts.map
