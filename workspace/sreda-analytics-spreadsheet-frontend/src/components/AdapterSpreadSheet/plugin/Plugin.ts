import React from 'react';

import { ISpreadSheet, ITableAPI } from '../../TableAdapters/types';
import { IMeasurementAPI } from '../measurement/types';
import { Cell } from '../models';
import {
    CellDataType,
    ColumnIndex,
    ContextMenuContext,
    IButton,
    ICell,
    ICellConfig,
    ICellPluginsConfig,
    ICellStyles,
    ObjectIndexes,
    PluginRegistry,
    RegistryPluginState,
    RowIndex,
    TContextMenuItem,
} from '../types';
import { MetadataManager } from '../utils/MetadataManager';
import PluginConfigManager from '../utils/PluginConfigManager';
import StyleManager from '../utils/StyleManager';
import { SpreadsheetAction } from './SpreadsheetAction';
import { Transaction } from './transaction/Transaction';
import { TransactionBuilder } from './transaction/TransactionBuilder';
import { VetoContext } from './transaction/TransactionFilter';

export interface IPlugin<K = unknown, S = unknown> {
    readonly key: K;
    readonly initialState: S;
}

export interface PluginStatesMap {
    [key: string]: any;
}

export interface PluginContext {
    dispatch: (action: SpreadsheetAction, options?: { skipHistory: boolean }) => void;
    transaction: () => TransactionBuilder;
    table: React.RefObject<ITableAPI> | null;
    getCellAt: (cell: Cell) => ICell | null;
    getData: () => ReadonlyMap<number, ReadonlyMap<number, ICell>>;
    styleManager: StyleManager;
    pluginConfigManager: PluginConfigManager;
    metadataManager: MetadataManager;
    getPlugin<K extends keyof PluginRegistry>(key: K): PluginRegistry[K] | undefined;
    getPlugin(key: string): IPlugin | undefined;
    getPluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;
    getPluginState(key: string): {} | undefined;
    getPlugins: () => IPlugin[];
    getMeasurementAPI(): IMeasurementAPI | null;
    getCellDisplayValue(rowIndex: number, columnIndex: number): CellDataType | null;
    getCellComponents(rowIndex: RowIndex, columnIndex: ColumnIndex): IButton[];
    getCellStyle(rowIndex: RowIndex, columnIndex: ColumnIndex): ICellStyles;
    getCellConfig(cell: Cell): ICellConfig | null;
    getCellPluginConfig<K extends keyof ICellPluginsConfig>(cell: Cell, key: K): ICellPluginsConfig[K] | null;
    /**
     * Возвращает полный (merged) ICellPluginsConfig для ячейки:
     * user overrides из PluginConfigManager + plugin-owned defaults через provideCellPluginConfig.
     * Используется там, где нужен весь объект конфига (например, AutoFill).
     */
    getAllCellPluginConfigs(cell: Cell): ICellPluginsConfig;
    snapshotDataMatrix(): Map<number, Map<number, ICell>>;
    restoreDataMatrix(snapshot: Map<number, Map<number, ICell>>): void;
    snapshotPluginStates(): PluginStatesMap;
    restorePluginStates(snap: PluginStatesMap): void;
}

export abstract class Plugin<K extends string, S extends {} = {}, O extends {} = {}> implements IPlugin<K, S> {
    declare readonly __key: K;

    declare readonly __state: S;

    declare readonly __options: O;

    abstract readonly key: K;

    abstract readonly initialState: S;

    // Adapter проверит наличие при инициализации.
    readonly dependencies: string[] = [];

    readonly displayPriority: number = 100;

    protected options: O = {} as O;

    protected context!: PluginContext;

    private _injected = false;

    _inject(ctx: PluginContext, options: O = {} as O): void {
        this.context = ctx;
        this.options = options;
        this._injected = true;
    }

    protected requireContext(): PluginContext {
        if (!this._injected) {
            throw new Error(
                `Plugin "${this.key}": context not injected. ` +
                    `Ensure injectContext() was called before using plugin methods.`,
            );
        }
        return this.context;
    }

    protected getState(): S {
        if (!this._injected) return this.initialState;
        return (this.context.getPluginState(this.key as string) as S | undefined) ?? this.initialState;
    }

    // ─── Этапы обработки транзакции ──────────────────────────────────────────

    collectVeto?(tr: Transaction, _state: S): string | null;

    resolveVetoes?(ctx: VetoContext, _state: S): void;

    abstract reducer(state: S, tr: Transaction): S;

    appendTransaction(
        _tr: Transaction,
        _prevState: S,
        _nextState: S,
    ):
        | SpreadsheetAction
        | SpreadsheetAction[]
        | TransactionBuilder
        | TransactionBuilder[]
        | (SpreadsheetAction | TransactionBuilder)[]
        | null {
        return null;
    }

    // Хук для side-effects ПОСЛЕ применения транзакции.
    // appendTransaction должен быть чистой функцией (без мутаций, setTimeout и т.д.).
    // Побочные эффекты (фокус, _liveValue) переносятся сюда.
    afterTransaction?(_tr: Transaction, _prevState: S, _nextState: S): void;

    // Вызывается после undo/redo.
    // Плагины с мутабельным состоянием вне reducer ОБЯЗАНЫ реализовать этот метод.
    onHistoryRestore?(_restoredState: S): void;

    // ─── Пропсы / Селекторы ──────────────────────────────────────────────────

    getTableAdapterProps?(_state: S): Partial<ISpreadSheet> {
        return {};
    }

    getCellStyle(_state: S, _cell: ObjectIndexes): ICellStyles {
        return {};
    }

    getCellDisplay(_state: S, _cell: ObjectIndexes, _raw: CellDataType): string | undefined {
        return undefined;
    }

    /**
     * Provider fallback для per-cell плагинных конфигов, которыми плагин владеет
     * приватно (плотные структуры) и не пишет в PluginConfigManager.
     *
     * Вызывается из context.getCellPluginConfig() ТОЛЬКО если PluginConfigManager
     * не вернул значения (т.е. пользовательский override отсутствует).
     *
     * ⚠️  Реализация ДОЛЖНА быть O(1) и не мутировать никакое состояние —
     * вызывается на каждый рендер Canvas (потенциально сотни вызовов за фрейм).
     *
     * @returns Значение конфига или null/undefined, если плагин не является
     *          владельцем данной ячейки/ключа.
     */
    provideCellPluginConfig?(
        _cell: ObjectIndexes,
        _key: keyof ICellPluginsConfig,
    ): ICellPluginsConfig[keyof ICellPluginsConfig] | null | undefined;

    getContextMenuItems(_state: S, _ctx: ContextMenuContext): TContextMenuItem[] {
        return [];
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    onMount?(): void;

    onUnmount?(): void;

    render?(): React.ReactElement | null | undefined;

    export?(): Promise<{ key: string; state: S }>;

    import?(data: { key: string; state: S }): Promise<void>;
}
