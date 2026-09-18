export = MetadataService;
/**
 * @typedef {string | { value?: string, link: string }} Ref
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * @typedef {import('./metadata/source/type').default} LevelClassI
 */
declare class MetadataService extends Extensions {
    /**
     * @constructor
     */
    constructor(options?: {});
    MetadataModel: any;
    id: string;
    component: string;
    /**
     * Для перегрузки подключаемыми классами
     *
     * @returns {Promise<Record<string, string>>}
     */
    getClassesMetadata(): Promise<Record<string, string>>;
    /**
     * @param {string} parent
     * @returns
     */
    getMetadataParent(parent: string): Promise<any>;
    /**
     * @param {WhereOptions} getOptions
     * @param {{ force?: boolean; transaction?: Transaction }} [options]
     * @returns
     */
    getMetadataByOptions(getOptions: WhereOptions, options?: {
        force?: boolean;
        transaction?: Transaction;
    }): Promise<any>;
    /**
     * @param {string} class_id
     * @param {string} parent
     */
    getMetadataLinks(class_id: string, parent: string): Promise<any>;
    /**
     * @param {string} id
     * @param {object} [options]
     * @returns
     */
    getMetadata(id: string, options?: object): Promise<any>;
    /**
     * @param {string[]} ids
     * @param {object} options
     * @param {*} defaultClass
     * @returns {Promise<Record<string, LevelClassI>>}
     */
    getParentInstanceByIds(ids: string[], options: object, defaultClass: any): Promise<Record<string, LevelClassI>>;
    /**
     * @param {string} refId
     * @param {object} [options]
     * @param {object} [defaultClass]
     * @return {Promise<LevelClassI>} options
     */
    getParentInstance(refId: string, options?: object, defaultClass?: any): Promise<LevelClassI>;
    /**
     * @param {Ref} ref
     * @param {object} options
     * @param {any} [defaultClass]
     * @returns {Promise<LevelClassI>}
     */
    getInstance(ref: Ref, options: object, defaultClass?: any): Promise<LevelClassI>;
    getMetadataClass(): Promise<{}>;
    getMetadatasV3(options?: {}): Promise<any>;
    getMetadatasV2(options?: {}): Promise<any>;
    /**
     * @deprecated
     * @param {object} options
     * @returns
     */
    getMetadatas(options?: object): Promise<any>;
    /**
     * @param {string} metadataId
     * @param {number} markdel
     * @returns
     */
    getMetadataChildren(metadataId: string, markdel?: number): Promise<any>;
    getTreeChildrenV3(metadata_id: any, options?: {}): Promise<any>;
    /**
     * @param {string} metadata_id
     * @param {object} options
     * @returns
     */
    getTreeChildrenV2(metadata_id: string, options?: object): Promise<any>;
    /**
     * @deprecated
     * @param {string} metadata_id
     * @returns
     */
    getTreeChildren(metadata_id: string, options?: {}): Promise<any>;
    /**
     * @param {object} metadata
     * @param {any} transaction
     * @returns
     */
    setMetadata(metadata: object, transaction: any): Promise<any>;
    /**
     * @param {string} id
     * @param {object} metadata
     * @param {any} transaction
     * @returns
     */
    updMetadata(id: string, metadata: object, transaction: any): Promise<any>;
    /**
     * @param {string} id
     * @param {object} [options]
     * @returns
     */
    delMetadata(id: string, options?: object): Promise<any>;
    /**
     * @param {string[]} id
     * @returns
     */
    getItems(id: string[]): Promise<any>;
    /**
     *
     * @param {string} id
     * @returns
     */
    getItem(id: string): Promise<any>;
    /**
     * @param {string} class_id
     * @param {string} parent
     * @returns
     */
    getRanksByParent(class_id: string, parent: string): Promise<any>;
    /**
     *
     * @param {string} class_id
     * @param {string} parent
     * @param {any[]} ranks
     * @returns
     */
    setRanks(class_id: string, parent: string, ranks: any[]): Promise<any[]>;
    /**
     * @param {string} name
     * @returns {string}
     */
    sanitizedName(name: string): string;
    /**
     * @param {Record<string, string>} ext
     * @param {string} classId
     * @returns
     */
    getClassInstance(ext: Record<string, string>, classId: string): any;
    /**
     * вытащим метаданные и если их нужно раскрыть вытащим вместе с деревом
     */
    getItemOrTree(instance: any, metadata: any, options: any): Promise<any>;
    #private;
}
declare namespace MetadataService {
    export { Ref, WhereOptions, LevelClassI };
}
import Extensions = require("../../../core/class/Extensions.class");
import { Transaction } from "sequelize/types/transaction";
type Ref = string | {
    value?: string;
    link: string;
};
type WhereOptions = import("sequelize").WhereOptions;
type LevelClassI = import("./metadata/source/type").default;
//# sourceMappingURL=Metadata.service.d.ts.map