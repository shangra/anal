export = RefsClass;
/**
 * @class  RefsClass
 */
declare class RefsClass extends Extensions {
    /**
     * @param {{ id: string | { link: string, value: string }, key?: string }} param0
     * @param {string[]} PKsData
     * @returns {Promise<Record<string, any>>}
     */
    readRef(
        {
            id,
            key,
        }: {
            id:
                | string
                | {
                      link: string;
                      value: string;
                  };
            key?: string;
        },
        PKsData: string[]
    ): Promise<Record<string, any>>;
    /**
     * TODO вынести
     * @param {*} refs
     * @param {object[]} rows
     * @returns {Record<string, Record<string, number>>}
     */
    getRefValue(row: any, ref: any, refsData: any): Record<string, Record<string, number>>;
    /**
     * @param {*} refs
     * @param {object[]} rows
     * @returns {Record<string, Record<string, number>>}
     */
    getRefValues(refs: any, rows: object[]): Record<string, Record<string, number>>;
    /**
     * @param {{ options: object, rows: object[], treeObject: { Fields: Record<string, IField>, Refs: object } }} param0
     * @returns
     */
    getRefs({
        options,
        rows,
        treeObject,
    }: {
        options: object;
        rows: object[];
        treeObject: {
            Fields: Record<string, IField>;
            Refs: object;
        };
    }): Promise<
        | {
              rows?: undefined;
              refs?: undefined;
          }
        | {
              rows: any[];
              refs: Record<string, Record<string, number>>;
          }
    >;
    /**
     * @param {*} refs
     * @param {*} rows
     * @returns
     */
    getAllRefs(refs: any, rows: any): Promise<Record<string, Record<string, number>>>;
    getFieldName(row: any, key: any): Promise<any>;
}
import Extensions = require('../../core/class/Extensions.class');
//# sourceMappingURL=refs.class.d.ts.map
