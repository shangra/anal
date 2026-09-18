import Field from "./Field";
import Ref from "./Ref";

interface KeyField {
    field: string,
    virtual: boolean,
    fieldValue: string,
    name: string,
    description: string,
    value: Ref
}

export default KeyField;