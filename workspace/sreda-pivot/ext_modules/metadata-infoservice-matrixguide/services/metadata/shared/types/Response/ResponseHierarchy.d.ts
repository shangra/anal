import Field from "../internal/Field";

export default interface ResponseHierarchy {
    on: boolean;
    parentFilter: {
        $is?: string | null;
        $eq?: string | null;
    };
    parentField: Field;
    codeField: Field;
}