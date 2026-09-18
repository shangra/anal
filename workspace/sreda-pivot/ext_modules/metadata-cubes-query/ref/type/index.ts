import { IRefObj } from "../../../metadata-cmp/services/Metadata.service";
import { ISettings } from "../../select/types";

export interface IGetAllRefs {
    refs: Record<string, IRefObj>; // Ссылки.
    rows: object[] // Строки.
    parentId: string
    options: ISettings
}