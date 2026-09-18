import React, { createRef } from 'react';
import { Button } from 'ui-kit';

import { Plugin, SpreadsheetAction, Transaction, TransactionBuilder } from '../../AdapterSpreadSheet/plugin';
import { ICell } from '../../AdapterSpreadSheet/types';
import PersistToolbar from './components/PersistToolbar';
import {
    DRP_FILE_EXTENSION,
    DRP_MIME_TYPE,
    PERSIST_ACTION,
    PLUGIN_PERSIST_KEY,
    XLSX_FILE_EXTENSION,
    XLSX_MIME_TYPE,
} from './constants';
import { DrpCodec } from './DrpCodec';
import { PluginPersistOptions, PluginPersistState } from './types';
import { XlsxExporter, XlsxExportOptions } from './XlsxExporter';

export class PluginPersist extends Plugin<typeof PLUGIN_PERSIST_KEY, PluginPersistState, PluginPersistOptions> {
    readonly key = PLUGIN_PERSIST_KEY;

    readonly initialState: PluginPersistState = {
        status: 'idle',
        errorMessage: null,
        lastFileName: null,
        lastOperationAt: null,
    };

    private readonly _fileInputRef = createRef<HTMLInputElement>();

    // ─── Reducer ──────────────────────────────────────────────────────────────

    override reducer(state: PluginPersistState, tr: Transaction): PluginPersistState {
        const { action } = tr;

        switch (action?.type) {
            case PERSIST_ACTION.SAVE_START:
                return { ...state, status: 'saving', errorMessage: null };

            case PERSIST_ACTION.LOAD_START:
                return { ...state, status: 'loading', errorMessage: null };

            case PERSIST_ACTION.XLSX_EXPORT_START:
                return { ...state, status: 'exporting_xlsx', errorMessage: null };

            case PERSIST_ACTION.SAVE_SUCCESS:
            case PERSIST_ACTION.LOAD_SUCCESS:
            case PERSIST_ACTION.XLSX_EXPORT_SUCCESS:
                return {
                    status: 'success',
                    errorMessage: null,
                    lastFileName: action.payload.fileName,
                    lastOperationAt: Date.now(),
                };

            case PERSIST_ACTION.SAVE_ERROR:
            case PERSIST_ACTION.LOAD_ERROR:
            case PERSIST_ACTION.XLSX_EXPORT_ERROR:
                return { ...state, status: 'error', errorMessage: action.payload.error };

            case PERSIST_ACTION.STATUS_RESET:
                return { ...state, status: 'idle', errorMessage: null };

            default:
                return state;
        }
    }

    override appendTransaction(): SpreadsheetAction | TransactionBuilder | null {
        return null;
    }

    // ─── Публичное API ────────────────────────────────────────────────────────

    /** Сохраняет таблицу в .drp файл и скачивает его. */
    save = async (e: React.MouseEvent<HTMLButtonElement>, fileName?: string, comment?: string): Promise<void> => {
        await this._performSave(fileName, comment);
    };

    /**
     * Экспортирует таблицу в .xlsx файл и скачивает его.
     *
     * @param fileName - имя файла без расширения
     * @param options  - переопределяет настройки из PluginPersistOptions.xlsxOptions
     */
    saveAsXlsx = async (
        e: React.MouseEvent<HTMLButtonElement>,
        fileName?: string,
        options?: XlsxExportOptions,
    ): Promise<void> => {
        await this._performXlsxExport(fileName, options);
    };

    /** Открывает системный диалог выбора .drp файла. */
    openFileDialog = (): void => {
        this._fileInputRef.current?.click();
    };

    /** Загружает состояние таблицы из File объекта (drag-and-drop, кастомный input). */
    loadFromFile = async (file: File): Promise<void> => {
        await this._performLoad(file);
    };

    // ─── DRP Save ─────────────────────────────────────────────────────────────

    private async _performSave(customFileName?: string, comment?: string): Promise<void> {
        const { compress = true, persistPluginStateKeys } = this.options;
        this.context.dispatch({ type: PERSIST_ACTION.SAVE_START });

        try {
            const cells = DrpCodec.serializeCells(this.context.getData());
            const styles = this.context.styleManager.export();
            const pluginConfigs = this.context.pluginConfigManager.export();
            const pluginStates = await DrpCodec.serializePluginStates(
                this.context.getPlugins(),
                (key) => this.context.getPluginState(key),
                persistPluginStateKeys,
            );
            const content = await DrpCodec.encode(
                { meta: DrpCodec.buildMeta(comment), cells, styles, pluginConfigs, pluginStates },
                compress,
            );
            const fileName = this._resolveFileName(customFileName, DRP_FILE_EXTENSION);

            this._triggerDownload(new Blob([content], { type: DRP_MIME_TYPE }), fileName);

            this.context.dispatch({ type: PERSIST_ACTION.SAVE_SUCCESS, payload: { fileName } });
            this.options.onSaveSuccess?.(fileName);
        } catch (error) {
            this._dispatchError(PERSIST_ACTION.SAVE_ERROR, error, 'save');
        }
    }

    // ─── XLSX Export ──────────────────────────────────────────────────────────

    private async _performXlsxExport(customFileName?: string, optionOverrides?: XlsxExportOptions): Promise<void> {
        const xlsxOptions: XlsxExportOptions = {
            ...this.options.xlsxOptions,
            ...optionOverrides,
        };

        this.context.dispatch({ type: PERSIST_ACTION.XLSX_EXPORT_START });

        try {
            const blob = await XlsxExporter.export(this.context, {
                ...xlsxOptions,
                reportName: xlsxOptions.reportName ?? this.options.defaultFileName,
            });
            const fileName = this._resolveFileName(customFileName, XLSX_FILE_EXTENSION);

            this._triggerDownload(blob, fileName);

            this.context.dispatch({
                type: PERSIST_ACTION.XLSX_EXPORT_SUCCESS,
                payload: { fileName },
            });
            this.options.onXlsxExportSuccess?.(fileName);
        } catch (error) {
            this._dispatchError(PERSIST_ACTION.XLSX_EXPORT_ERROR, error, 'xlsx');
        }
    }

    // ─── DRP Load ─────────────────────────────────────────────────────────────

    private async _performLoad(file: File): Promise<void> {
        this.context.dispatch({ type: PERSIST_ACTION.LOAD_START });

        // Снапшот для отката при ошибке
        const rollback = {
            styles: this.context.styleManager.export(),
            pluginConfigs: this.context.pluginConfigManager.export(),
            pluginStates: this.context.snapshotPluginStates(),
            dataMatrix: this.context.snapshotDataMatrix(),
        };

        try {
            const buffer = await file.arrayBuffer();
            const payload = await DrpCodec.decode(buffer);
            DrpCodec.validate(payload);

            const tx = this.context.transaction().clearAll();

            this.context.styleManager.import(payload.styles);
            this.context.pluginConfigManager.import(payload.pluginConfigs);

            const cellMap = DrpCodec.deserializeCells(payload.cells);
            if (cellMap.size > 0) {
                tx.setCells(cellMap as Map<number, Map<number, ICell>>);
            }

            tx.withAction({ type: 'HISTORY/CLEAR' }).commit(true);

            const restoredStates = DrpCodec.deserializePluginStates(payload.pluginStates);

            if (Object.keys(restoredStates).length > 0) {
                this.context.restorePluginStates(restoredStates);

                // Вызываем import() для плагинов, у которых он есть,
                // чтобы восстановить операционное состояние (pluginPivotData, historyCache и т.д.)
                for (const plugin of this.context.getPlugins()) {
                    const key = plugin.key as string;
                    if (restoredStates[key] && typeof (plugin as any).import === 'function') {
                        // eslint-disable-next-line no-await-in-loop
                        await (plugin as any).import({ key, state: restoredStates[key] });
                    }
                }
            }

            this.context.dispatch(
                { type: PERSIST_ACTION.LOAD_SUCCESS, payload: { fileName: file.name } },
                { skipHistory: true },
            );

            this.options.onLoadSuccess?.(file.name);
        } catch (error) {
            // Откат — восстанавливаем состояние до начала загрузки
            try {
                this.context.styleManager.import(rollback.styles);
                this.context.pluginConfigManager.import(rollback.pluginConfigs);
                this.context.restorePluginStates(rollback.pluginStates);
                this.context.restoreDataMatrix(rollback.dataMatrix);
            } catch {
                /* откат упал — состояние неконсистентно, сообщаем об ошибке */
            }

            this._dispatchError(PERSIST_ACTION.LOAD_ERROR, error, 'load');
        }
    }

    // ─── Общие утилиты ────────────────────────────────────────────────────────

    private _triggerDownload(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }

    private _resolveFileName(custom: string | undefined, ext: string): string {
        const base = custom ?? this.options.defaultFileName ?? 'document';
        const clean = base.replace(/\.(drp|xlsx)$/i, '');

        const timestamp = !custom ? `${this._formatTimestamp(Date.now())}` : '';

        return `${clean} ${timestamp}${ext}`;
    }

    private _formatTimestamp(ts: number): string {
        return new Date(ts)
            .toLocaleString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
            .replace(/\./g, '-');
    }

    private _dispatchError(actionType: string, error: unknown, operation: 'save' | 'load' | 'xlsx'): void {
        const message = error instanceof Error ? error.message : String(error);
        this.context.dispatch({ type: actionType as any, payload: { error: message } });
        this.options.onError?.(error instanceof Error ? error : new Error(message), operation);
    }

    private _formatTime(ts: number): string {
        return new Date(ts).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    // ─── DOM handlers ─────────────────────────────────────────────────────────

    private _handleSaveClick = (): void => {
        void this._performSave();
    };

    private _handleXlsxClick = (): void => {
        void this._performXlsxExport();
    };

    private _handleLoadClick = (): void => {
        if (this._fileInputRef.current) this._fileInputRef.current.value = '';
        this._fileInputRef.current?.click();
    };

    private _handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) void this._performLoad(file);
    };

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override async export() {
        return { key: this.key, state: this.getState() };
    }

    override async import() {
        this.context.dispatch({ type: PERSIST_ACTION.STATUS_RESET });
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        return (
            <PersistToolbar
                onOpenFileClick={this.openFileDialog}
                onSaveDrp={this._handleSaveClick}
                onSaveXlsx={this._handleXlsxClick}
                onFileSelected={(file) => void this._performLoad(file)}
            />
        );
    }
}
