export = ExplainRequestMetaModel;
declare class ExplainRequestMetaModel {
    /**
     * @param {string} id
     */
    static get(id: string): Promise<any>;
    /**
     * @param {object} body
     * @param {object} options
     * @returns {Promise<{ result: true }>}
     */
    static new(
        body: object,
        options: object
    ): Promise<{
        result: true;
    }>;
    /**
     * @param {string} id
     * @param {object} data
     * @returns {Promise<{ result: true }>}
     */
    static update(
        id: string,
        data: object
    ): Promise<{
        result: true;
    }>;
    static del(id: any): Promise<{
        result: boolean;
    }>;
}
//# sourceMappingURL=ExplainRequestMeta.model.d.ts.map
