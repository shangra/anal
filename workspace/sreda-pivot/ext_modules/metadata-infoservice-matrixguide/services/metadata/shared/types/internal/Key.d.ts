import Field from "./Field";
import KeyField from "./KeyField";
import Ref from "./Ref";

export default interface Key {
    name: string,
    description: string,
    id: string,
    fields: Record<string, KeyField>,
    settings: {
        id: string,
        primarykey: false,
        fieldview: Ref
    }
}