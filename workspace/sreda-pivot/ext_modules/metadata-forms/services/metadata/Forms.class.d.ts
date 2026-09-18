export = FormsClass;
/** LOCAL * */
declare class FormsClass extends LevelClass<any, IMetadata> {
    constructor(props: any);
    id: string;
    props: {
        id: string;
        owner_id: string;
        class_id: string;
        class: string;
        name: string;
        description: string;
        crud: string[];
        routes: string;
    };
}
import LevelClass = require("../../../metadata-cmp/services/metadata/source/LevelClass.class");
//# sourceMappingURL=Forms.class.d.ts.map