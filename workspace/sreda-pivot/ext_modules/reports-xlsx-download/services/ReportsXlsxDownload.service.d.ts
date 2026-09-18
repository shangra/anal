export = ReportsXlsxDownloadService;
declare class ReportsXlsxDownloadService extends Extensions {
    postjson(infoserviceId: any, body: any): Promise<{
        result: any[][];
        data: {
            status: string;
            table: {};
            totalRows: number;
        };
    }>;
    funcToDescription(func: any): any;
    postxlsx(infoserviceId: any, body: any): Promise<ExcelJS.Buffer>;
}
import Extensions = require("../../../core/class/Extensions.class");
import ExcelJS = require("exceljs");
//# sourceMappingURL=ReportsXlsxDownload.service.d.ts.map