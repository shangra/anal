export = ReportsService;
declare class ReportsService extends DefaultMetaObject {
    constructor();
    component: string;
    form(id: any): Promise<{
        form: any[];
        buttons: any[];
    }>;
    create(body: any): Promise<void>;
    /**
     * @param {string} id
     * @param {Record<string, string | string[]>} options
     */
    read(id: string, options?: Record<string, string | string[]>): Promise<{
        result: any[];
        treeObject: {
            Fields: {};
            FieldsGUID: {};
            IFields: {};
            IFieldsGUID: {};
            Measures: {};
            MeasuresGUID: {};
            Dimensions: {};
            DimensionsGUID: {};
            Keys: {};
            KeysGUID: {};
            ForeignKeys: {};
            ForeignKeysGUID: {};
            Indexes: {};
            Refs: {};
            Infoservices: {};
        };
    }>;
    update(id: any, body: any): Promise<void>;
    delete(id: any): Promise<void>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
//# sourceMappingURL=Reports.service.d.ts.map