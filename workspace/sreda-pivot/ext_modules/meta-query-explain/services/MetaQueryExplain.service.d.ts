export = MetaQueryExplainService;
declare class MetaQueryExplainService extends Extensions {
    get(id: any): Promise<any>;
    getMeta(id: any): Promise<any>;
    del(id: any): Promise<{
        result: true;
    }>;
    init(inner: any, fargs: any, original: any): Promise<any>;
    addConsole(innerResult: any, functionParams: any, originalMethod: any): Promise<any>;
}
import Extensions = require('../../../core/class/Extensions.class');
//# sourceMappingURL=MetaQueryExplain.service.d.ts.map
