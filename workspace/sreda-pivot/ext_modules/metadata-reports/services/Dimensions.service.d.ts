export = DimensionsService;
declare class DimensionsService extends DefaultMetaObject {
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
            };
            template?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            template?: undefined;
            list?: undefined;
        })[];
    }>;
    deleteMetadata(id: any, body: any): Promise<any>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
//# sourceMappingURL=Dimensions.service.d.ts.map