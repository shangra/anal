export = InfoserviseListService;
declare class InfoserviseListService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: ({
            name: string;
            description: string;
            type: string;
            link: string;
            class: typeof InfoserviceService;
            parent?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            parent: string;
            link: {
                parent: string;
                field: string[];
            };
            class?: undefined;
        })[];
    }>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
import InfoserviceService = require("./Infoservices.service");
//# sourceMappingURL=InfoserviseList.service.d.ts.map