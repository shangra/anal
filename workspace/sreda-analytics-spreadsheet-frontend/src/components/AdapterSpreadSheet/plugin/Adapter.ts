import { ISpreadSheet, ITableAPI } from '../../TableAdapters/types';
import { IMeasurementAPI } from '../measurement/types';
import { Cell } from '../models';
import {
    CellDataType,
    ContextMenuContext,
    IButton,
    ICell,
    ICellConfig,
    ICellPluginsConfig,
    ICellStyles,
    ObjectIndexes,
    PluginRegistry,
    RegistryPluginState,
    TContextMenuItem,
} from '../types';
import { toReadonlyMatrix } from '../utils';
import { MetadataManager } from '../utils/MetadataManager';
import PluginConfigManager from '../utils/PluginConfigManager';
import { SparseMatrixHelper } from '../utils/SparseMatrixHelper/SparseMatrixHelper';
import StyleManager from '../utils/StyleManager';
import { createTransaction, Transaction, TransactionBuilder, txMeta, VetoContext } from '.';
import { IPlugin, Plugin, PluginContext, PluginStatesMap } from './Plugin';
import { SpreadsheetAction } from './SpreadsheetAction';
import { VetoEntry } from './transaction/TransactionFilter';
import { TransactionLogger } from './transaction/TransactionLogger';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface AdapterAPI {
    dispatch: (action: SpreadsheetAction) => void;
    getCellStyle: (cell: ObjectIndexes) => ICellStyles;
    getCellDisplay: (cell: ObjectIndexes, raw: CellDataType) => CellDataType;
    getPlugin<K extends keyof PluginRegistry>(key: K): PluginRegistry[K] | undefined;
    getPlugin(key: string): IPlugin | undefined;
    getPluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;
    getPluginState<S>(key: string): S | undefined;
    /** @deprecated undo/redo теперь управляются через PluginHistory */
    undo?: () => void;
    /** @deprecated undo/redo теперь управляются через PluginHistory */
    redo?: () => void;
}

export type PluginContextInit = {
    tableAPIRef: React.RefObject<ITableAPI>;
    getCellAt: (cell: Cell) => ICell | null;
    getData: () => Map<number, Map<number, ICell>>;
    styleManager: StyleManager;
    pluginConfigManager: PluginConfigManager;
    metadataManager: MetadataManager;
    onUpdate: () => void;
    onPluginErrors?: (errors: Array<{ plugin: string; error: Error }>) => void;
};

// ─────────────────────────────────────────────────────────────────────────────

export class Adapter {
    private readonly plugins: Plugin<any, any, any>[];

    private readonly _displayOrder: Plugin<any, any, any>[];

    private state: PluginStatesMap;

    private _ctxInit: PluginContextInit | null = null;

    private readonly _log: TransactionLogger;

    // ── Transaction queue (замена рекурсии) ───────────────────────────────
    private _txQueue: Transaction[] = [];

    private _processing = false;

    // ── Grouping (root tx + all its children in the same drain cycle) ─────
    private _currentCycleId: string | null = null;

    // ── Dispatch batch tracking ───────────────────────────────────────────
    private _batchDepth = 0;

    private _batchStartId: string | null = null;

    private _batchStartTs = 0;

    private static readonly BATCH_WARN_THRESHOLD = 3;

    // ── Ping-pong detection ───────────────────────────────────────────────
    private _recentActionTypes: string[] = [];

    private static readonly PING_PONG_WINDOW = 8;

    private static readonly PING_PONG_THRESHOLD = 3;

    // ── Подписки ──────────────────────────────────────────────────────────
    private _listeners = new Set<() => void>();

    private _version = 0;

    // ── Стиль-кеш (инвалидируется при dispatch) ──────────────────────────
    private _styleCache = new Map<string, ICellStyles>();

    constructor(
        plugins: Plugin<any, any, any>[],
        options: { loggerOptions?: { minLevel?: 'debug' | 'info' | 'warn' | 'error' } } = {},
    ) {
        // ── Валидация зависимостей ────────────────────────────────────────
        const pluginKeys = new Set(plugins.map((p) => p.key));
        for (const plugin of plugins) {
            for (const dep of plugin.dependencies) {
                if (!pluginKeys.has(dep)) {
                    throw new Error(
                        `Plugin "${plugin.key}" requires "${dep}" which is not registered. ` +
                            `Registered plugins: [${[...pluginKeys].join(', ')}]`,
                    );
                }
            }
        }

        // ── Топологическая сортировка по dependencies ─────────────────────
        this.plugins = this._topologicalSortPlugins(plugins);
        this.state = Object.fromEntries(this.plugins.map((p) => [p.key, p.initialState]));
        this._log = new TransactionLogger(options.loggerOptions);
        this._displayOrder = [...this.plugins].sort((a, b) => a.displayPriority - b.displayPriority);
    }

    /**
     * Топологическая сортировка плагинов по dependencies.
     */
    private _topologicalSortPlugins(plugins: Plugin<any, any, any>[]): Plugin<any, any, any>[] {
        const map = new Map(plugins.map((p) => [p.key, p]));
        const visited = new Set<string>();
        const result: Plugin<any, any, any>[] = [];

        const visit = (key: string): void => {
            if (visited.has(key)) return;
            visited.add(key);
            const plugin = map.get(key);
            if (!plugin) return;
            for (const dep of plugin.dependencies) visit(dep);
            result.push(plugin);
        };

        for (const p of plugins) visit(p.key);
        return result;
    }

    // ── Подписки ──────────────────────────────────────────────────────────

    subscribe = (listener: () => void): (() => void) => {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    };

    getVersion = (): number => this._version;

    private _notifyListeners(): void {
        this._version++;
        for (const listener of this._listeners) {
            try {
                listener();
            } catch {
                /* не ломаем остальных подписчиков */
            }
        }
    }

    // ── Инжекция контекста ────────────────────────────────────────────────

    injectContext(init: PluginContextInit): void {
        this._ctxInit = init;

        const adapter = this;

        const fullCtx: PluginContext = {
            dispatch: this.dispatch,
            getPlugin: this._getPlugin as PluginContext['getPlugin'],
            getPluginState: this._getPluginState as PluginContext['getPluginState'],
            getPlugins: () => this.plugins,
            getCellAt: init.getCellAt,
            getData: () => {
                if (process.env.NODE_ENV === 'production') {
                    return init.getData() as ReadonlyMap<number, ReadonlyMap<number, ICell>>;
                }
                return toReadonlyMatrix(init.getData());
            },
            styleManager: init.styleManager,
            pluginConfigManager: init.pluginConfigManager,
            metadataManager: init.metadataManager,
            transaction: () =>
                new TransactionBuilder(
                    init.getData(),
                    init.styleManager,
                    init.pluginConfigManager,
                    init.metadataManager,
                    (tr) => this._enqueue(tr),
                ),
            get table() {
                return init.tableAPIRef;
            },
            getMeasurementAPI: () => init.tableAPIRef?.current?.getMeasurementAPI?.() ?? null,
            getCellDisplayValue(rowIndex, columnIndex) {
                const cell = SparseMatrixHelper.getCell(init.getData(), rowIndex, columnIndex);
                if (!cell) return null;
                return adapter.getCellDisplay({ rowIndex, columnIndex }, cell.data ?? null) ?? null;
            },
            getCellComponents(rowIndex, columnIndex) {
                return init.getCellAt(new Cell({ rowIndex, columnIndex }))?.components ?? [];
            },
            getCellStyle(rowIndex, columnIndex) {
                return adapter.getCellStyle(new Cell({ rowIndex, columnIndex }));
            },
            getCellConfig(cell) {
                return init.getCellAt(cell)?.config ?? null;
            },
            getCellPluginConfig<K extends keyof ICellPluginsConfig>(cell: Cell, key: K) {
                // 1. User overrides (sparse, RLE-compressed) — наивысший приоритет.
                const override = init.pluginConfigManager.getPluginConfig(cell.rowIndex, cell.columnIndex, key);
                if (override !== undefined && override !== null) return override;

                // 2. Plugin-owned defaults (плотные структуры, provider fallback).
                //    Вызываем provideCellPluginConfig на каждом плагине, пока не найдём значение.
                //    Порядок — топосортированный (тот же, что pipeline транзакций).
                for (const plugin of adapter.plugins) {
                    if (!plugin.provideCellPluginConfig) continue;
                    const provided = plugin.provideCellPluginConfig(
                        { rowIndex: cell.rowIndex, columnIndex: cell.columnIndex },
                        key,
                    );
                    if (provided !== undefined && provided !== null) return provided as ICellPluginsConfig[K];
                }
                return null;
            },
            getAllCellPluginConfigs(cell: Cell): ICellPluginsConfig {
                // База — user overrides (весь объект из PluginConfigManager).
                const base = init.pluginConfigManager.getCell(cell.rowIndex, cell.columnIndex);
                const merged: ICellPluginsConfig = { ...base };

                // Добавляем provider-defaults для ключей, которых нет в user overrides.
                for (const plugin of adapter.plugins) {
                    if (!plugin.provideCellPluginConfig) continue;
                    // Плагин сам сообщает, какими ключами ICellPluginsConfig владеет.
                    const keys = (plugin as any).providedConfigKeys as (keyof ICellPluginsConfig)[] | undefined;
                    if (!keys?.length) continue;
                    for (const key of keys) {
                        if (merged[key] !== undefined) continue; // user override уже есть
                        const val = plugin.provideCellPluginConfig(
                            { rowIndex: cell.rowIndex, columnIndex: cell.columnIndex },
                            key,
                        );
                        if (val != null) merged[key] = val as ICellPluginsConfig[typeof key];
                    }
                }
                return merged;
            },
            snapshotDataMatrix: (): Map<number, Map<number, ICell>> => {
                const copy = new Map<number, Map<number, ICell>>();
                for (const [row, rowMap] of init.getData()) {
                    copy.set(row, new Map(rowMap));
                }
                return copy;
            },
            restoreDataMatrix: (snapshot: Map<number, Map<number, ICell>>): void => {
                const dataMatrix = init.getData() as Map<number, Map<number, ICell>>;
                dataMatrix.clear();
                for (const [row, rowMap] of snapshot) {
                    dataMatrix.set(row, new Map(rowMap));
                }
            },
            snapshotPluginStates: (): PluginStatesMap => ({ ...this.state }),
            restorePluginStates: (snap: PluginStatesMap): void => {
                const newState: PluginStatesMap = {};
                for (const plugin of this.plugins) {
                    newState[plugin.key] = snap[plugin.key] ?? plugin.initialState;
                }
                for (const key of Object.keys(snap)) {
                    if (!Object.hasOwn(newState, key)) {
                        newState[key] = snap[key];
                    }
                }
                this.state = newState;
            },
        };

        for (const plugin of this.plugins) {
            plugin._inject(fullCtx, (plugin as any)._options ?? {});
        }
    }

    // ── Dispatch + Transaction Queue ──────────────────────────────────────

    dispatch = (action: SpreadsheetAction, options: { skipHistory: boolean } = { skipHistory: false }): void => {
        const tr = createTransaction(action);
        if (options.skipHistory) txMeta.setSkipHistory(tr);
        this._enqueue(tr);
    };

    transaction = (): TransactionBuilder => {
        if (!this._ctxInit) {
            throw new Error('Adapter.transaction(): контекст не инициализирован.');
        }
        return new TransactionBuilder(
            this._ctxInit.getData(),
            this._ctxInit.styleManager,
            this._ctxInit.pluginConfigManager,
            this._ctxInit.metadataManager,
            (tr) => this._enqueue(tr),
        );
    };

    private _enqueue(tr: Transaction): void {
        this._txQueue.push(tr);

        // Track batch depth — increment for every dispatch in the current batch
        if (this._batchDepth) {
            this._batchDepth++;
        } else if (!this._processing) {
            // First dispatch of a new batch
            this._batchDepth = 1;
            this._batchStartId = tr.id;
            this._batchStartTs = performance.now();
            const actionType = tr.action?.type ?? '(data-only)';
            this._log.log('info', {
                txId: tr.id,
                event: 'batch:start',
                timestamp: Date.now(),
                payload: { actionType, skipHistory: txMeta.isSkipHistory(tr) },
            });
        }

        // Per-transaction enqueue log (debug-level)
        const isRoot = !tr.parentId;
        this._log.log('debug', {
            txId: tr.id,
            event: isRoot ? 'tx:enqueue:root' : 'tx:enqueue:child',
            timestamp: Date.now(),
            payload: {
                actionType: tr.action?.type ?? '(data-only)',
                isRoot,
                skipHistory: txMeta.isSkipHistory(tr),
                queueLength: this._txQueue.length,
                parentId: tr.parentId ?? null,
            },
        });

        if (!this._processing) {
            this._drain();
        }
    }

    private _drain(): void {
        this._processing = true;
        const t0 = performance.now();

        let processedCount = 0;
        const MAX_QUEUE_SIZE = 100;

        try {
            while (this._txQueue.length > 0) {
                // Detect root of a new processing cycle → open group
                if (!this._currentCycleId) {
                    const root = this._txQueue[0];
                    this._currentCycleId = root.id;
                    this._log.groupOpen(root.id, root.action?.type ?? '(data-only)');
                }

                if (processedCount >= MAX_QUEUE_SIZE) {
                    this._log.log('error', {
                        txId: 'drain',
                        event: 'queue:overflow',
                        timestamp: Date.now(),
                        payload: { queueSize: this._txQueue.length, processed: processedCount },
                    });
                    this._txQueue.length = 0;
                    this._closeCurrentCycle();
                    this._resetBatch();
                    break;
                }

                const tr = this._txQueue.shift()!;

                // Log tx:start for the root transaction (inside the group)
                if (tr.id === this._currentCycleId) {
                    this._log.log('info', {
                        txId: tr.id,
                        event: 'tx:start',
                        timestamp: Date.now(),
                        payload: {
                            actionType: tr.action?.type ?? '(data-only)',
                            skipHistory: txMeta.isSkipHistory(tr),
                        },
                    });
                }

                if (tr.action?.type && this._detectPingPong(tr.action.type)) {
                    this._log.log('error', {
                        txId: tr.id,
                        event: 'ping-pong:detected',
                        timestamp: Date.now(),
                        payload: { recentTypes: [...this._recentActionTypes] },
                    });
                    this._txQueue.length = 0;
                    this._closeCurrentCycle();
                    this._resetBatch();
                    break;
                }

                const txStart = performance.now();
                this._applyTransactionSync(tr);
                const txDuration = +(performance.now() - txStart).toFixed(3);
                processedCount++;

                this._log.log('debug', {
                    txId: tr.id,
                    event: 'tx:end',
                    timestamp: Date.now(),
                    durationMs: txDuration,
                    payload: {
                        actionType: tr.action?.type ?? '(data-only)',
                        queueRemaining: this._txQueue.length,
                    },
                });

                // Close group when the last transaction of this cycle finishes
                if (this._txQueue.length === 0 && tr.id === this._currentCycleId) {
                    this._closeCurrentCycle();
                    this._resetBatch();
                }
            }
        } finally {
            this._processing = false;
            this._recentActionTypes.length = 0;
        }

        this._notifyListeners();
        this._ctxInit?.onUpdate();

        this._log.log('debug', {
            txId: 'drain',
            event: 'completed',
            timestamp: Date.now(),
            durationMs: +(performance.now() - t0).toFixed(2),
            payload: { transactionsProcessed: processedCount },
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private _closeCurrentCycle(): void {
        if (this._currentCycleId) {
            this._log.groupClose();
            this._currentCycleId = null;
        }
    }

    private _resetBatch(): void {
        if (this._batchDepth > 0 && this._batchStartId && this._batchStartTs) {
            const batchDuration = performance.now() - this._batchStartTs;
            this._log.log('info', {
                txId: this._batchStartId,
                event: 'batch:end',
                timestamp: Date.now(),
                durationMs: +batchDuration.toFixed(2),
                payload: {
                    totalTransactionsInBatch: this._batchDepth,
                    avgDurationMs: this._batchDepth > 0 ? (batchDuration / this._batchDepth).toFixed(3) : 0,
                },
            });

            if (this._batchDepth > Adapter.BATCH_WARN_THRESHOLD) {
                this._log.log('warn', {
                    txId: this._batchStartId,
                    event: 'batch:large',
                    timestamp: Date.now(),
                    payload: {
                        transactionCount: this._batchDepth,
                        suggestion: 'Consider batching dispatches in the same call stack',
                    },
                });
            }

            this._batchDepth = 0;
            this._batchStartId = null;
            this._batchStartTs = 0;
        }
    }

    private _detectPingPong(actionType: string): boolean {
        this._recentActionTypes.push(actionType);
        if (this._recentActionTypes.length > Adapter.PING_PONG_WINDOW) {
            this._recentActionTypes.shift();
        }

        const types = this._recentActionTypes;
        if (types.length < Adapter.PING_PONG_THRESHOLD * 2) return false;

        const [a, b] = [types[types.length - 2], types[types.length - 1]];
        if (a === b) return false;

        let matches = 0;
        for (let i = types.length - 1; i >= 1; i -= 2) {
            if (types[i] === b && types[i - 1] === a) matches++;
            else break;
        }

        return matches >= Adapter.PING_PONG_THRESHOLD;
    }

    // ── Two-Phase Filter ──────────────────────────────────────────────────

    private _runTwoPhaseFilter(tr: Transaction, _txId: string): VetoContext {
        const vetoes = new Map<string, VetoEntry>();
        for (const plugin of this.plugins) {
            const reason = plugin.collectVeto?.(tr, this.state[plugin.key]);
            if (reason) {
                vetoes.set(plugin.key, { reason, source: plugin.key });
            }
        }
        const ctx: VetoContext = { tr, state: this.state, vetoes };
        if (vetoes.size === 0) return ctx;

        for (const plugin of this.plugins) {
            if (ctx.vetoes.size === 0) break;
            plugin.resolveVetoes?.(ctx, this.state[plugin.key]);
        }
        return ctx;
    }

    // ── Применение одной транзакции ───────────────────────────────────────

    private _applyTransactionSync(tr: Transaction): void {
        const txId = tr.id;

        // ── Veto ──────────────────────────────────────────────────────
        const { vetoes } = this._runTwoPhaseFilter(tr, txId);
        if (vetoes.size > 0) {
            if (tr.getStylesSnapshot() && this._ctxInit) {
                this._ctxInit.styleManager.import(tr.getStylesSnapshot()!);
            }
            if (tr.getPluginConfigSnapshot() && this._ctxInit) {
                this._ctxInit.pluginConfigManager.import(tr.getPluginConfigSnapshot()!);
            }
            if (tr.getMetadataSnapshot() && this._ctxInit) {
                this._ctxInit.metadataManager.import(tr.getMetadataSnapshot()!);
            }
            return;
        }

        // ── Flush pending writes ──────────────────────────────────────
        if (tr.hasPendingWrites() && this._ctxInit) {
            for (const { rowIndex, columnIndex, cell } of tr.getPendingWrites()) {
                const dataMatrix = this._ctxInit.getData();
                if (cell === null) {
                    SparseMatrixHelper.deleteCell(dataMatrix, rowIndex, columnIndex);
                } else {
                    SparseMatrixHelper.setCell(dataMatrix, rowIndex, columnIndex, cell);
                }
            }
        }

        // ── Reducers ──────────────────────────────────────────────────
        const prevState = this.state;
        let nextState = prevState;
        const changedPlugins: string[] = [];

        for (const plugin of this.plugins) {
            const prev = nextState[plugin.key];
            const next = plugin.reducer(prev, tr);
            if (prev !== next) {
                nextState = { ...nextState, [plugin.key]: next };
                changedPlugins.push(plugin.key);
            }
        }

        // Extra actions
        for (const extraAction of tr.getExtraActions()) {
            const extraTr = createTransaction(extraAction, txId);
            const extraVeto = this._runTwoPhaseFilter(extraTr, txId);
            if (extraVeto.vetoes.size > 0) continue;

            for (const plugin of this.plugins) {
                const prev = nextState[plugin.key];
                const next = plugin.reducer(prev, extraTr);
                if (prev !== next) {
                    nextState = { ...nextState, [plugin.key]: next };
                }
            }
        }

        this.state = nextState;

        // ── Dev warning: unhandled action ─────────────────────────────
        if (
            process.env.NODE_ENV !== 'production' &&
            changedPlugins.length === 0 &&
            tr.action &&
            !tr.hasPendingWrites() &&
            !tr.getMetadataSnapshot()
        ) {
            console.warn(`[Adapter] Action "${tr.action.type}" was not handled by any reducer and has no data changes`);
        }

        // ── Инвалидация стиль-кеша ────────────────────────────────────
        this._styleCache.clear();

        // ── afterTransaction ──────────────────────────────────────────
        const afterErrors: Array<{ plugin: string; error: Error }> = [];
        for (const plugin of this.plugins) {
            try {
                plugin.afterTransaction?.(tr, prevState[plugin.key], this.state[plugin.key]);
            } catch (e) {
                afterErrors.push({ plugin: plugin.key, error: e as Error });
                this._log.log('error', {
                    txId,
                    event: 'afterTransaction:error',
                    timestamp: Date.now(),
                    payload: { plugin: plugin.key, error: String(e) },
                });
            }
        }
        if (afterErrors.length) {
            this._ctxInit?.onPluginErrors?.(afterErrors);
        }

        // ── appendTransaction → enqueue ───────────────────────────────
        for (const plugin of this.plugins) {
            const result = plugin.appendTransaction(tr, prevState[plugin.key], this.state[plugin.key]);
            if (!result) continue;

            const entries = Array.isArray(result) ? result : [result];

            for (const entry of entries) {
                let appendedTr: Transaction;

                if (entry instanceof TransactionBuilder) {
                    appendedTr = entry._buildForAppend();
                } else {
                    appendedTr = createTransaction(entry as SpreadsheetAction, txId);
                }

                if (txMeta.isSkipHistory(tr)) {
                    txMeta.setSkipHistory(appendedTr);
                }

                this._log.log('debug', {
                    txId: appendedTr.id,
                    event: 'tx:appended',
                    timestamp: Date.now(),
                    payload: {
                        parentTxId: txId,
                        actionType: appendedTr.action?.type ?? '(data-only)',
                        skipHistory: txMeta.isSkipHistory(appendedTr),
                        plugin: plugin.key,
                    },
                });

                this._txQueue.push(appendedTr);
            }
        }
    }

    // ── Агрегация с кешированием ─────────────────────────────────────────

    getCellStyle = (cell: ObjectIndexes): ICellStyles => {
        const key = `${cell.rowIndex}:${cell.columnIndex}`;
        const cached = this._styleCache.get(key);
        if (cached) return cached;

        const result: ICellStyles = {};
        for (const p of this.plugins) {
            const styles = p.getCellStyle(this.state[p.key], cell);
            if (styles) Object.assign(result, styles);
        }
        this._styleCache.set(key, result);
        return result;
    };

    getCellDisplay = (cell: ObjectIndexes, raw: CellDataType): CellDataType => {
        let value = raw;
        for (const plugin of this._displayOrder) {
            const result = plugin.getCellDisplay(this.state[plugin.key], cell, value);
            if (result !== undefined) value = result;
        }
        return value;
    };

    getTableAdapterProps(): Partial<ISpreadSheet> {
        const result: Partial<ISpreadSheet> = {};
        for (const plugin of this.plugins) {
            const props = plugin.getTableAdapterProps?.(this.state[plugin.key]) ?? {};
            Object.assign(result, props);
        }
        return result;
    }

    getContextMenuItems(ctx: ContextMenuContext): TContextMenuItem[] {
        return this.plugins.flatMap((p) => p.getContextMenuItems(this.state[p.key], ctx));
    }

    private _getPlugin = (key: string): IPlugin | undefined => this.plugins.find((p) => p.key === key);

    private _getPluginState = (key: string): unknown => this.state?.[key];

    getPlugin<K extends keyof PluginRegistry>(key: K): PluginRegistry[K] | undefined;

    getPlugin(key: string): IPlugin | undefined;

    getPlugin(key: string): IPlugin | undefined {
        return this._getPlugin(key);
    }

    getPluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;

    getPluginState<S>(key: string): S | undefined;

    getPluginState(key: string): unknown {
        return this._getPluginState(key);
    }

    snapshot = (): PluginStatesMap => ({ ...this.state });

    restore = (snap: PluginStatesMap): void => {
        this.state = { ...snap };
    };

    onMount = (): void => {
        for (const p of this.plugins) p.onMount?.();
    };

    onUnmount = (): void => {
        for (const p of this.plugins) p.onUnmount?.();
    };

    getPlugins = (): Plugin<any>[] => this.plugins;
}
