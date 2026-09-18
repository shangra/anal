export = MemorySaveExtHelpersService;
declare class MemorySaveExtHelpersService extends Extensions {
    /**
     * перегружаемый метод
     *
     * @returns {Promise<string>}
     */
    getUserRoles(): Promise<string>;
    /**
     * перегружаемый метод
     */
    getCache(innerResult: any, functionParams: any, originalMethod: any): Promise<any>;
}
import Extensions = require('../../../core/class/Extensions.class');
//# sourceMappingURL=MemorySaveExtHelpers.service.d.ts.map
