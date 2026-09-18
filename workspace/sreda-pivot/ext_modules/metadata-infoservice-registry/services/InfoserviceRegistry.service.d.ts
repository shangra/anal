export = InfoserviceRegistryService;
declare class InfoserviceRegistryService extends DefaultMetaObject {
    constructor();
    component: string;
    form(id: any): Promise<{
        form: ({
            name: string;
            description: string;
            type: string;
            template: string;
            useParent?: undefined;
            link?: undefined;
            class?: undefined;
        } | {
            name: string;
            description: string;
            type: string;
            useParent: boolean;
            link: string;
            class: typeof ConnectorClass;
            template?: undefined;
        })[];
    }>;
    create(body: any): Promise<void>;
    read(id: any, options?: {}): Promise<{
        rows: any;
        cols: any[];
        refs: {};
        count: number;
        offset: any;
        limit: any;
        options: {
            attributes: any;
            group: any[];
            where: {};
        };
        hierarchy: {};
        metadata: any;
    }>;
    update(id: any, body: any): Promise<void>;
    delete(id: any): Promise<void>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
import ConnectorClass = require("../../metadata-connector/services/metadata/Connector.class");
//# sourceMappingURL=InfoserviceRegistry.service.d.ts.map