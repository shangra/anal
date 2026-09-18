export = MetadataModel;
declare class MetadataModel {
    static getLinks(class_id: any, owner_id?: any): Promise<any>;
    static get(where: any, options: object): Promise<any>;
    static getItem(id: any, options: object): Promise<any>;
    static getChild(parent: any): Promise<any>;
    static add(parent: any, class_id: any, class_name: any, name: any, description: any, manifest: any, transaction: any): Promise<any>;
    static upd(id: any, name: any, description: any, manifest: any, transaction: any): Promise<any>;
    static updRank(id: any, rank: any): Promise<any>;
    static del(id: any, transaction: any): Promise<any>;
    static getMetadataWithFamily(metadataId: any): Promise<any>;
    /**
     * @param {string} class_id
     * @param {string} owner_id
     * @param {string} name
     * @param {string} [id]
     */
    static getDuplicate(class_id: string, owner_id: string, name: string, id?: string): Promise<any>;
    static getFieldsInfo(where?: {}): Promise<any>;
}
//# sourceMappingURL=Metadata.model.d.ts.map