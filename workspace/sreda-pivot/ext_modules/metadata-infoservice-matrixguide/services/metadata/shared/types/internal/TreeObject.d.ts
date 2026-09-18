import Field from "./Field";
import Key from "./Key";
import { IHierarchy } from "../../../InfoserviceMatrixGuide.class";

export default interface TreeObject {
    SysFields: Record<string, Field>;
    Fields: Record<string, Field>;
    AllFields: Record<string, Field>;
    FieldsGUID: Record<string, Field>;
    AllFieldsGUID: Record<string, Field>;
    Keys: Record<string, Key>;
    KeysGUID: Record<string, Key>;
    Refs: Record<string, Field>;
    Hierarchy: Record<string, IHierarchy>
}

export interface IHierarchySettings {
    ViewField: Field,
    IdField: Field,
    ParentField: Field,
    fieldhierarchydefault: object,
    order: [string, string][],
}