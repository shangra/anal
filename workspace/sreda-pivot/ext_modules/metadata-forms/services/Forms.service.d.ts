export = FormsService;
declare class FormsService extends DefaultMetaObject {
    constructor();
    component: string;
    form(): Promise<{
        form: {
            name: string;
            description: string;
            type: string;
        }[];
    }>;
    /**
     * @param {object} body
     */
    create(body: object): Promise<void>;
    /**
     * @param {string} id
     * @param {object} options
     * @returns
     */
    read(id: string, options?: object): Promise<any>;
    /**
     * @param {string} id
     * @param {object} body
     */
    update(id: string, body: object): Promise<void>;
    /**
     * @param {string} id
     */
    delete(id: string): Promise<void>;
}
import DefaultMetaObject = require("../../metadata-cmp/services/DefaultMetaObject.service");
//# sourceMappingURL=Forms.service.d.ts.map