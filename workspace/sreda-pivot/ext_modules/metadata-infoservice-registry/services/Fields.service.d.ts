export = FieldsService;
declare class FieldsService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: ({
            name: string;
            description: string;
            type: string;
            template: string;
            list?: undefined;
            useParent?: undefined;
            link?: undefined;
            class?: undefined;
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
            useParent?: undefined;
            link?: undefined;
            class?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            template?: undefined;
            list?: undefined;
            useParent?: undefined;
            link?: undefined;
            class?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            useParent: boolean;
            link: string;
            class: typeof import("./InfoserviceRegistry.service");
            template?: undefined;
            list?: undefined;
        })[];
    }>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
//# sourceMappingURL=Fields.service.d.ts.map