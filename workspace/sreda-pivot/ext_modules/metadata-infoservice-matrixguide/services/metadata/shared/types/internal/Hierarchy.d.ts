import Alias from "./Alias";
import Field from "./Field";
import Ref from "./Ref";
import KeyField from "./KeyField";

interface HierarchyField {
    alias: Alias,
    field: Field
}

export default interface Hierarchy {
    fields: HierarchyField[],
    id: string,
    name: string,
    class: string,
    description: string,
    settings: {
        id: string,
        level: number,
        prevLevel: Ref,
        keyId: Ref,
        keyParent: Ref,
    },
    Keys: {
        name: string,
        description: string,
        id: string,
        fields: Record<string, KeyField>,
        settings: {
            id: string,
            fieldview: Ref,
            primarykey: boolean,
        }
    },
    isMaxVisibleLevel?: boolean,
}