export = KeysClass;
declare class KeysClass extends LevelClass<
    any,
    import('../../../../metadata-cmp/db/models/metadata').IMetadata
> {
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
        parent: any;
    };
    subTree(item: any, options?: {}): Promise<any[]>;
}
import LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
//# sourceMappingURL=Keys.class.d.ts.map
