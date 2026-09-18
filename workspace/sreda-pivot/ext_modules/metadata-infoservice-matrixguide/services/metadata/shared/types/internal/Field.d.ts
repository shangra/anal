import Ref from "./Ref";

export default interface Field {
    field: string,
    name: string,
    fieldValue?: Ref | string,
    description: string,
    id: string,
    class_id: string,
    type: string,
    onoff: boolean,
    ref?: Ref,
    virtual: boolean,
    value: string,
}