export = ExplainRequestModel;
declare class ExplainRequestModel {
    /**
     * @param {string} id
     */
    static get(id: string): Promise<any>;
    /**
     * @param {object} body
     */
    static new(body: object): Promise<any>;
    /**
     * @param {string} id
     * @param {object} data
     * @returns {Promise<{result: true}>}
     */
    static update(
        id: string,
        data: object
    ): Promise<{
        result: true;
    }>;
    /**
     * @param {string} id
     * @returns {Promise<{result: true}>}
     */
    static del(id: string): Promise<{
        result: true;
    }>;
}
//# sourceMappingURL=ExplainRequest.model.d.ts.map
