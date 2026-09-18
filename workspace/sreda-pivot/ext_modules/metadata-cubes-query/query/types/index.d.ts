import { Ifrom } from "../../../metadata-connector/services/metadata/Connector.class"
import { ISettings } from "../../select/types"

export interface SubQueryI {
    sql: string,
    name: string
}

export interface QueryOptions {
    sql: Ifrom,
    withOptions: SubQueryI[],
    volatileOptions: SubQueryI[],
    refsToParse?: Record<string, string>,
    options: ISettings,
}