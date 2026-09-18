export = InfoserviceRegistryClass;
declare class InfoserviceRegistryClass extends LevelClass<any, IMetadata> {
    constructor(props: any);
    id: string;
    props: {
        id: string;
        owner_id: any;
        class_id: string;
        class: string;
        name: string;
        description: string;
        crud: string[];
        routes: string;
    };
    subTree(item: any, options?: {}): Promise<[any, any, any]>;
    tableInfo(meta: any, id: any): Promise<{
        Fields: {};
        FieldsGUID: {};
        Keys: {};
        KeysGUID: {};
        Indexes: {};
        Refs: {};
    }>;
    readRef({ id, key }: {
        id: any;
        key: any;
    }, PKsData: any): Promise<{}>;
    getRefValues(refs: any, rows: any): Promise<{}>;
    getAllRefs(refs: any, rows: any): Promise<{}>;
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
    /**
     * получить коннектор
     * @param {any} item
     */
    getConnector(item: any): Promise<{
        connector: any;
        connectorData: any;
    }>;
}
import LevelClass = require("../../../metadata-cmp/services/metadata/source/LevelClass.class");
//# sourceMappingURL=InfoserviceRegistry.class.d.ts.map