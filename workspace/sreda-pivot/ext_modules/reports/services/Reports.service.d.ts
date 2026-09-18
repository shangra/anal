export = ReportService;
declare class ReportService extends Extensions {
    getAnswerKey(answerId: any): Promise<string>;
    setResultTableData(id: any, answerId: any, params: any): Promise<{
        status: string;
        table: {};
        totalRows: number;
    }>;
    getTableData(id: any, body: any): Promise<{
        status: string;
        answerId: string;
    }>;
    /**
     * метод перезаписан через хуки
     * @param {string} id
     * @param {string} answerId
     * @param {SequelizeFindOptions} body
     */
    readTableData(id: string, answerId: string, body: SequelizeFindOptions): Promise<{
        status: string;
        answerId: string;
    }>;
    getTableDataResults(id: any, answerId: any): Promise<any>;
}
declare namespace ReportService {
    export { SequelizeFindOptions };
}
import Extensions = require("../../../core/class/Extensions.class");
type SequelizeFindOptions = import("sequelize").FindOptions;
//# sourceMappingURL=Reports.service.d.ts.map