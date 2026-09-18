export const PLUGIN_PERSIST_KEY = 'PluginPersist' as const;

/** MIME-тип собственного формата .drp */
export const DRP_MIME_TYPE = 'application/x-drp' as const;
export const DRP_FILE_EXTENSION = '.drp' as const;
export const DRP_FORMAT_VERSION = '1.0.0' as const;
export const DRP_GENERATOR = 'AdapterSpreadSheet' as const;

/** MIME-тип XLSX (OOXML) */
export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const;
export const XLSX_FILE_EXTENSION = '.xlsx' as const;

export const PERSIST_ACTION = {
    SAVE_START: 'PERSIST/SAVE_START',
    SAVE_SUCCESS: 'PERSIST/SAVE_SUCCESS',
    SAVE_ERROR: 'PERSIST/SAVE_ERROR',
    LOAD_START: 'PERSIST/LOAD_START',
    LOAD_SUCCESS: 'PERSIST/LOAD_SUCCESS',
    LOAD_ERROR: 'PERSIST/LOAD_ERROR',
    XLSX_EXPORT_START: 'PERSIST/XLSX_EXPORT_START',
    XLSX_EXPORT_SUCCESS: 'PERSIST/XLSX_EXPORT_SUCCESS',
    XLSX_EXPORT_ERROR: 'PERSIST/XLSX_EXPORT_ERROR',
    STATUS_RESET: 'PERSIST/STATUS_RESET',
} as const;
