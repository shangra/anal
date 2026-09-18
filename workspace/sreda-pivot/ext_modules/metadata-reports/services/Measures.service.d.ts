export = MeasuresService;
declare class MeasuresService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: ({
            name: string;
            description: string;
            type: string;
            template: string;
            list?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            list: {
                uuid: string;
                text: string;
                string: string;
                integer: string;
                float: string;
                date: string;
                datetime: string;
                boolean: string;
                ref: string;
                default?: undefined;
                number?: undefined;
                money?: undefined;
                finance?: undefined;
                percent?: undefined;
                fractional?: undefined;
                exponential?: undefined;
                additional?: undefined;
            };
            template?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            template?: undefined;
            list?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            list: {
                default: string;
                number: string;
                money: string;
                finance: string;
                date: string;
                datetime: string;
                percent: string;
                fractional: string;
                exponential: string;
                text: string;
                additional: string;
                uuid?: undefined;
                string?: undefined;
                integer?: undefined;
                float?: undefined;
                boolean?: undefined;
                ref?: undefined;
            };
            template?: undefined;
        })[];
    }>;
    deleteMetadata(id: any, body: any): Promise<any>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
//# sourceMappingURL=Measures.service.d.ts.map