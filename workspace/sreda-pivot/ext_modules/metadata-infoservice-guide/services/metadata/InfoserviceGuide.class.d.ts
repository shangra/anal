export = InfoServiceGuidClass;
/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').Ifrom} Ifrom
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type/index').default} LevelClassI
 */
/**
 * @implements {LevelClassI}
 */
declare class InfoServiceGuidClass
    extends LevelClass<any, import('../../../metadata-cmp/db/models/metadata').IMetadata>
    implements LevelClassI
{
    constructor(props: any);
    id: string;
    props: {
        id: string;
        owner_id: any;
        class_id: string;
        class: string;
        name: string;
        description: string;
        crud: string[];
        routes: string;
    };
    subTree(item: any, options?: {}): Promise<[any, any, any]>;
    console(msg: any, meta: any): void;
    /**
     * @param {LevelClassI} meta
     * @param {string} id
     * @returns
     */
    tableInfo(
        meta: LevelClassI,
        id: string
    ): Promise<{
        Fields: {};
        FieldsGUID: {};
        Keys: {};
        KeysGUID: {};
        Indexes: {};
        Refs: {};
        AllFields: {};
        AllFieldsGUID: {};
    }>;
    /**
     * @param {string} id
     * @param {object} options
     * @returns
     */
    query(id: string, options?: object): any;
    /**
     * @param {string} id
     * @param {object} inputOptions
     * @returns
     */
    read(id: string, inputOptions: object): any;
    /**
     * @private
     *
     * @param {IConnector} connector
     * @param {Ifrom | string} from
     * @param {*} options
     * @returns {Promise<Ifrom>}
     */
    private findSQL;
    /**
     * @private
     *
     * @param {object} treeObject
     * @param {string[]} attributes
     * @param {string} parentFieldId
     * @returns
     */
    private getColumns;
    /**
     *
     * @param {string} table
     * @param {string} sqlalias
     * @returns {Ifrom | string}
     */
    getSubQuery(table: string, sqlalias: string): Ifrom | string;
    hasIlike(where: any): boolean;
    /**
     * получить коннектор
     * @param {any} item
     */
    getConnector(item: any): Promise<{
        connector: any;
        connectorData: import('../../../metadata-cmp/db/models/metadata').IMetadata;
    }>;
}
declare namespace InfoServiceGuidClass {
    export { IConnector, Ifrom, WhereOptions, LevelClassI };
}
import LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');
type IConnector =
    import('../../../metadata-connector/services/metadata/Connector.class').IConnector;
type Ifrom = import('../../../metadata-connector/services/metadata/Connector.class').Ifrom;
type WhereOptions = import('sequelize').WhereOptions;
type LevelClassI = import('../../../metadata-cmp/services/metadata/source/type/index').default;
//# sourceMappingURL=InfoserviceGuide.class.d.ts.map
