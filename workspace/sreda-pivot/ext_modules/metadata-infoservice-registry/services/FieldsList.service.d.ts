export = FieldsListService;
declare class FieldsListService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: {
            name: string;
            description: string;
            type: string;
            link: string;
            class: typeof FieldsService;
        }[];
    }>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
import FieldsService = require("./Fields.service");
//# sourceMappingURL=FieldsList.service.d.ts.map