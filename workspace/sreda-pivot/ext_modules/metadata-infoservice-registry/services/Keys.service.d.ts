export = KeysService;
declare class KeysService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: ({
            name: string;
            description: string;
            type: string;
            link?: undefined;
            class?: undefined;
            template?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            link: string;
            class: typeof FieldsService;
            template?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            template: string;
            link?: undefined;
            class?: undefined;
        })[];
    }>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
import FieldsService = require("./Fields.service");
//# sourceMappingURL=Keys.service.d.ts.map