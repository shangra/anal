export = parseDbmodelMetaService;
declare class parseDbmodelMetaService extends Extensions {
    formAfter(innerResult: any, functionInput: any): Promise<any>;
    parse(body: any): Promise<any[]>;
    getType(key: any, value: any): Promise<any>;
    getDescriptions(): Promise<{}>;
    getDescription(key: any, value: any): Promise<void>;
    autofillFromDB(id: any): Promise<{
        result: boolean;
    }>;
    fillFields(id: any, bodyFields: any): Promise<boolean>;
    autofill(id: any, body: any): Promise<{
        result: boolean;
    }>;
    /**
     * получить коннектор
     * @param {any} item
     */
    getConnector(item: any): Promise<{
        connector: any;
        connectorData: any;
    }>;
}
import Extensions = require("../../../core/class/Extensions.class");
//# sourceMappingURL=parseDbmodelMeta.service.d.ts.map