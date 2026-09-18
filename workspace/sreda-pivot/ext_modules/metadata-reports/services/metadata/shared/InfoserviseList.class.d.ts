export = FizFieldsListClass;
declare class FizFieldsListClass extends LevelClass<any, IMetadata> {
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
}
import LevelClass = require("../../../../metadata-cmp/services/metadata/source/LevelClass.class");
//# sourceMappingURL=InfoserviseList.class.d.ts.map