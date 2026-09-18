import { SELECTED_ROWS_HOOK_NAME } from "components/MetadataForms/ElementsList/constants";

export interface IRowData {
    [key: string]: {
        value: string;
        sourceValue: string;
    };
}

export class HookKeyManager {
    static manageSelectedRows(
        modalUUID: string, 
        formId: string, 
        rows: IRowData[]
    ) {
        return {
            [`${modalUUID}__${formId}__SELECT`]: {
                [SELECTED_ROWS_HOOK_NAME]: Array.isArray(rows) ? rows : []
            }
        };
    }

    static selectRows(modalUUID: string, formId: string, rows: IRowData[]) {
        return this.manageSelectedRows(modalUUID, formId, rows);
    }

    static deselectAll(modalUUID: string, formId: string) {
        return this.manageSelectedRows(modalUUID, formId, []);
    }

    static getSelectedRowsKey(modalUUID: string, formId: string) {
        return `${modalUUID}__${formId}__SELECT`;
    }
}