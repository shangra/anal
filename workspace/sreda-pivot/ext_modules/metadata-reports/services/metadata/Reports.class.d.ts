export = ReportsClass;
/**
 * @import { LevelClassI } from '../../../metadata-cmp/services/metadata/source/type/index'
 */
/**
 * @class ReportsClass
 * @extends {LevelClass}
 */
declare class ReportsClass extends LevelClass<any, IMetadata> {
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
    tableInfo(meta: any, id: any): Promise<{
        Fields: {};
        FieldsGUID: {};
        IFields: {};
        IFieldsGUID: {};
        Measures: {};
        MeasuresGUID: {};
        Dimensions: {};
        DimensionsGUID: {};
        Keys: {};
        KeysGUID: {};
        ForeignKeys: {};
        ForeignKeysGUID: {};
        Indexes: {};
        Refs: {};
        Infoservices: {};
    }>;
    /**
     * @param {LevelClassI} meta
     * @param {string} id
     * @returns
     */
    info(meta: LevelClassI, id: string): Promise<{
        Fields: {};
        FieldsGUID: {};
        Measures: {};
        MeasuresGUID: {};
        Dimensions: {};
        DimensionsGUID: {};
        Infoservices: {};
        InfoservicesGUID: {};
    }>;
    /**
     * @param {string} id
     * @param {Record<string, string | string[] | object>} options
     */
    read(id: string, options?: Record<string, string | string[] | object>): Promise<{
        result: any[];
        treeObject: {
            Fields: {};
            FieldsGUID: {};
            IFields: {};
            IFieldsGUID: {};
            Measures: {};
            MeasuresGUID: {};
            Dimensions: {};
            DimensionsGUID: {};
            Keys: {};
            KeysGUID: {};
            ForeignKeys: {};
            ForeignKeysGUID: {};
            Indexes: {};
            Refs: {};
            Infoservices: {};
        };
    }>;
}
import LevelClass = require("../../../metadata-cmp/services/metadata/source/LevelClass.class");
//# sourceMappingURL=Reports.class.d.ts.map