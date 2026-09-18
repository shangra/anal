import { IConnector } from "../../../../../metadata-connector/services/metadata/Connector.class";
import { Where } from "../../../../../../db/rls/types/WhereOptions";
import LevelClass, { IMultiRef, IMultiRefRaw } from "../LevelClass.class";
import { Transaction } from "sequelize";
import { IMetadata } from "../../../../db/models/metadata";
import { QueueAgent } from '../../../../../QueueAgent';

//TODO добавить типы
interface LevelClassI extends LevelClass {
    hydrateTreeObject(item: any): Promise<any>
    subTree(item, options): Promise<any>
    getItem(id: string): Promise<IMetadata>
    tableInfo(meta: LevelClassI, id: string, options?: { force?: boolean }): Promise<any>
    query?(id: string, options: Where): Promise<any>
    read(id: string, options: Where, options?: { returning?: boolean, transaction?: Transaction }): Promise<any>
    update?(id: string, body: object, options?: { where?: object, returning?: boolean, transaction?: Transaction, queue?: QueueAgent }): Promise<any>
    create?(id: string, body: object, options?: { returning?: boolean, transaction?: Transaction, queue?: QueueAgent }): Promise<any>
    drop?(id: string): Promise<any>
    synch?(id: string, fieldsSettings: any): Promise<any>
    model?(id: string): Promise<any>
    bulkCreate?(id: string, items: any[], options?: { returning?: boolean, transaction?: Transaction, queue?: QueueAgent }): Promise<any>
    bulkUpdate?(id: string, items: any[], options?: { returning?: boolean, transaction?: Transaction, queue?: QueueAgent }): Promise<any>
    getConnector(item: any): Promise<{ connector: IConnector, connectorData: object }>
    getCompositeFields(multiRef: IMultiRefRaw[], field: string): Promise<IMultiRef[]>
}

export default LevelClassI;