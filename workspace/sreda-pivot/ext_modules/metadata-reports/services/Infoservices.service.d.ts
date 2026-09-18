export = InfoservicesService;
declare class InfoservicesService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: {
            name: string;
            description: string;
            useParent: boolean;
            type: string;
            link: {
                type: string;
            };
        }[];
    }>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
//# sourceMappingURL=Infoservices.service.d.ts.map