export = RlsExtSyncService;
declare class RlsExtSyncService extends Extensions {
    dropBefore(innerResult: any, functionParams: any): Promise<any>;
    syncAfter(innerResult: any, functionParams: any): Promise<any>;
    formAfter(innerResult: any): any;
    readBefore(innerResult: any, functionParams: any): Promise<any>;
    /**
     * @private
     * @param {string} id
     */
    private getRlsAndTable;
    /**
     * @private
     * @param {*} _
     * @param {{ id: string }} functionParams
     */
    private drop;
    /**
     * @private
     */
    private sync;
    /**
     * очистить рлс по таблице
     *
     * @private
     */
    private clearRls;
    /**
     * @private
     * @param {*} item
     * @returns
     */
    private addRls;
    recursiveAddRls(connector: any, table: any, limit?: number, offset?: number): Promise<void>;
    /**
     * @private
     * @param {*} item
     * @returns
     */
    private getConnect;
    /**
     * @private
     * @param {*} item
     * @returns
     */
    private dropView;
    /**
     * @private
     * @param {*} item
     * @returns
     */
    private createView;
    /**
     * @private
     * @param {*} item
     * @returns
     */
    private isRlsOn;
}
import Extensions = require("../../../core/class/Extensions.class");
//# sourceMappingURL=RlsExtSync.service.d.ts.map