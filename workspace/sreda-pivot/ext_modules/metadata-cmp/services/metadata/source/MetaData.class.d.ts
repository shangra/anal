export = MetaData;
declare class MetaData extends LevelClass<any, import("../../../db/models/metadata").IMetadata> {
    constructor(props?: {});
    id: string;
    props: {
        id: string;
        name: string;
        description: string;
        crud: string[];
    };
    generateLevels(): Promise<{
        id: string;
        component: string;
        props: {
            id: string;
            name: string;
            description: string;
            crud: string[];
        };
        children: any[];
    }>;
    render(): Promise<this>;
}
import LevelClass = require("./LevelClass.class");
//# sourceMappingURL=MetaData.class.d.ts.map