export = MetaDDLDumpService;
declare class MetaDDLDumpService extends Extensions {
    postQuery(
        id: any,
        body: any
    ): Promise<{
        sql: string;
    }>;
}
import Extensions = require('../../../core/class/Extensions.class');
//# sourceMappingURL=MetaDDLDump.service.d.ts.map
