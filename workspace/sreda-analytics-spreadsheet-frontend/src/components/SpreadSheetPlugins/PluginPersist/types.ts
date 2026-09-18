import { PluginConfigSnapshot, StylesSnapshot } from '../../AdapterSpreadSheet/plugin/transaction/Transaction';
import { PERSIST_ACTION, PLUGIN_PERSIST_KEY } from './constants';
import { PluginPersist } from './PluginPersist';
import { XlsxExportOptions } from './XlsxExporter';

// ─── Plugin state ─────────────────────────────────────────────────────────────

export type PersistOperationStatus = 'idle' | 'saving' | 'loading' | 'exporting_xlsx' | 'error' | 'success';

export interface PluginPersistState {
    status: PersistOperationStatus;
    errorMessage: string | null;
    lastFileName: string | null;
    lastOperationAt: number | null;
}

// ─── Plugin options ───────────────────────────────────────────────────────────

export interface PluginPersistOptions {
    /**
     * Имя файла по умолчанию (без расширения).
     * @default 'document'
     */
    defaultFileName?: string;

    /**
     * Сжимать .drp payload с gzip.
     * @default true
     */
    compress?: boolean;

    /**
     * Ключи плагинов для включения в .drp (undefined = все).
     */
    persistPluginStateKeys?: string[];

    /**
     * Настройки экспорта XLSX.
     * Применяются при каждом вызове saveAsXlsx() если не переопределены явно.
     */
    xlsxOptions?: XlsxExportOptions;

    onSaveSuccess?: (fileName: string) => void;
    onLoadSuccess?: (fileName: string) => void;
    onXlsxExportSuccess?: (fileName: string) => void;
    onError?: (error: Error, operation: 'save' | 'load' | 'xlsx') => void;
}

// ─── DRP File Format ──────────────────────────────────────────────────────────

export interface DrpMeta {
    savedAt: number;
    generator: string;
    version: string;
    comment?: string;
}

export interface DrpCellEntry {
    row: number;
    col: number;
    cell: unknown;
}

export interface DrpPayload {
    meta: DrpMeta;
    cells: DrpCellEntry[];
    styles: StylesSnapshot;
    pluginConfigs: PluginConfigSnapshot;
    pluginStates: Record<string, unknown>;
}

export interface DrpFileWrapper {
    __drp: string;
    encoding: 'none' | 'gzip+base64';
    data: string;
    checksum: string;
}

// ─── Module augmentation ──────────────────────────────────────────────────────

type PersistActionMap = {
    [PERSIST_ACTION.SAVE_START]: undefined;
    [PERSIST_ACTION.SAVE_SUCCESS]: { fileName: string };
    [PERSIST_ACTION.SAVE_ERROR]: { error: string };
    [PERSIST_ACTION.LOAD_START]: undefined;
    [PERSIST_ACTION.LOAD_SUCCESS]: { fileName: string };
    [PERSIST_ACTION.LOAD_ERROR]: { error: string };
    [PERSIST_ACTION.XLSX_EXPORT_START]: undefined;
    [PERSIST_ACTION.XLSX_EXPORT_SUCCESS]: { fileName: string };
    [PERSIST_ACTION.XLSX_EXPORT_ERROR]: { error: string };
    [PERSIST_ACTION.STATUS_RESET]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PersistActionMap {}
}

interface PluginPersistPluginRegistry {
    [PLUGIN_PERSIST_KEY]: PluginPersist;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginPersistPluginRegistry {}
}
