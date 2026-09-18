import StateManager from 'lite-react-statemanager';
import { ReactElement } from 'react';
import { Loader, NotificationsProvider } from 'ui-kit';
import { v4 as uuid } from 'uuid';

import type { VetoContext } from '../../AdapterSpreadSheet/plugin';
import { Plugin, PluginContext, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import {
    ContextMenuContext,
    IButton,
    ICellPluginsConfig,
    ICellWithStyles,
    ObjectIndexes,
    TContextMenuItem,
} from '../../AdapterSpreadSheet/types';
import CancelReqButton from '../../PivotMenu/CancelReqButton/cancelReqButton';
import { updateArrayByItemId } from '../../PivotMenu/helpers/params';
import { MenuIcon } from '../../PivotMenu/MenuIcon';
import { CubeLoader } from '../../ui/CubeLoader';
import { PLUGIN_CELL_FORMATTING_KEY } from '../PluginCellFormatting/constants';
import { PERSIST_ACTION } from '../PluginPersist';
import { CreatePivotTable } from './classes/CreatePivotTable';
import { GetTableData } from './classes/getTableData';
import {
    PluginPivotChunks,
    PluginPivotChunksChunkParentHeaders,
    PluginPivotChunksChunkParentHeadersForHash,
} from './classes/PluginPivotChunks';
import { PluginPivotConfigStore } from './classes/PluginPivotConfigStore';
import { PluginPivotData } from './classes/PluginPivotData';
import { RenderController } from './classes/RenderController';
import { UpdateData } from './classes/UpdateData';
import { PIVOT_ACTION, PIVOT_HEADER_ROWS_COUNT, PLUGIN_PIVOT_KEY, SCALES } from './constants';
import { SettingIcon } from './icons';
import { PluginPivotAdapterFacade } from './PluginPivotAdapterFacade';
import styles from './styles.module.css';
import {
    HistoryCacheType,
    IFetchOptions,
    IPluginPivotPluginData,
    PluginPivotArg,
    PluginPivotArgs,
    PluginPivotDataSettingsParams,
    PluginPivotDataSettingsParamsHeader,
    PluginPivotOptions,
    PluginPivotResponseData,
    PluginPivotSchemaInfo,
    PluginPivotState,
    TPluginRange,
} from './types';
import { getHashChunk, isColumnChunk, isIndexChunk, isIntersectionChunk, SCALE_FORMATTING_TYPES } from './utils';
import { isMergeVetoed } from './utils/isMergeVetoed';

export class PluginPivot extends Plugin<typeof PLUGIN_PIVOT_KEY, PluginPivotState, PluginPivotOptions> {
    readonly key = PLUGIN_PIVOT_KEY;

    readonly initialState: PluginPivotState = {
        args: {
            columns: [],
            rows: [],
            values: [],
            filter: [],
            fields: [],
            layers: [],
            rowsTotal: true,
            columnsTotal: false,
            recalculate: false,
            isMask: false,
            repeatHeaders: false,
            columnsAllValues: false,
            rowsAllValues: false,
            measureUnit: 'millions',
        },
        refs: {},
        pivotParams: {},
    };

    // ─── Операционное состояние (вне reducer) ─────────────────────────────────
    // Эти поля — изменяемое состояние, которое управляется вручную.
    // Они аналогичны dataMatrix в AdapterSpreadSheet.

    /** Фасад адаптера: транслирует вызовы IAdapter -> context operations */
    tableAdapter!: PluginPivotAdapterFacade;

    infoserviceId!: string;

    server!: string;

    pluginRange!: TPluginRange;

    /** Предыдущий размер таблицы — сохраняется перед сбросом плагина для очистки старых данных */
    prevPluginRange: TPluginRange | null = null;

    pluginPivotChunks!: PluginPivotChunks;

    pluginPivotData!: PluginPivotData;

    getTableData!: GetTableData;

    createPivotTable!: CreatePivotTable;

    renderController!: RenderController;

    updateData!: UpdateData;

    /**
     * Приватное O(1)-хранилище pivot-owned данных ячеек (формат + мета).
     * Заполняется в RenderController._renderTableImpl вместо записи в PluginConfigManager.
     * Читается через provideCellPluginConfig() → context.getCellPluginConfig() fallback.
     */
    readonly configStore = new PluginPivotConfigStore();

    /**
     * Ключи ICellPluginsConfig, которыми владеет PluginPivot как provider.
     * Используется в context.getAllCellPluginConfigs() для AutoFill и других потребителей.
     */
    readonly providedConfigKeys: (keyof ICellPluginsConfig)[] = [PLUGIN_CELL_FORMATTING_KEY, PLUGIN_PIVOT_KEY];

    history: (keyof HistoryCacheType['loadNewChunk'])[] = [];

    historyCache: HistoryCacheType = {
        loadRootChunk: {},
        loadNewChunk: {},
    };

    private currentSliceTraceId: string | null = null;

    /** Флаг отмены текущей операции recalculate */
    private _recalculateCancelFlag = false;

    // ─── Инжекция контекста (заменяет constructor) ────────────────────────────

    /**
     * Вызывается SpreadsheetAdapter после создания плагина.
     * Это точка входа для инициализации — контекст и опции доступны здесь.
     */
    override _inject(ctx: PluginContext, options: PluginPivotOptions): void {
        super._inject(ctx, options);
        this._initializeInternals(options);
    }

    /**
     * Общая логика инициализации операционного состояния.
     * Вызывается как при первом монтировании (_inject), так и при сбросе (dropPlugin).
     */
    private _initializeInternals(options: PluginPivotOptions): void {
        // @ts-expect-error
        this.tableAdapter = new PluginPivotAdapterFacade(this);

        this.infoserviceId = options.infoserviceId;
        this.server = (options?.server || '').replace(/\/+$/gm, '');

        this.pluginRange = {
            x: options?.pluginRange?.x ?? 0,
            y: options?.pluginRange?.y ?? 0,
            height: 1,
            width: 1,
        };

        this.pluginPivotChunks = new PluginPivotChunks(this);
        this.pluginPivotData = new PluginPivotData(this);
        this.getTableData = new GetTableData(this, options);
        this.createPivotTable = new CreatePivotTable(this, options);
        this.renderController = new RenderController(this);
        this.updateData = new UpdateData(this);

        this.history = [];
        this.historyCache = { loadRootChunk: {}, loadNewChunk: {} };
    }

    // ─── Backwards-compat: state getter ──────────────────────────────────────

    /**
     * Геттер для обратной совместимости с внутренними классами,
     * обращающимися к this.pluginPivot.state напрямую.
     */
    get state(): PluginPivotState {
        return this.getState();
    }

    // ─── Backwards-compat: setState wrapper ──────────────────────────────────

    /**
     * Обёртка для обратной совместимости с внутренними классами,
     * вызывающими this.pluginPivot.setState(...).
     *
     * Транслирует вызов setState в dispatch(PLUGIN_PIVOT_STATE_UPDATE).
     * Callback вызывается синхронно после dispatch (dispatch — синхронная операция).
     */
    setState(updater: (state: PluginPivotState) => PluginPivotState, callback?: () => void): void {
        const next = updater(this.getState());
        this.context.dispatch({ type: PIVOT_ACTION.STATE_UPDATE, payload: next });
        callback?.();
    }

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginPivotState, tr: Transaction): PluginPivotState {
        switch (tr.action?.type) {
            // Полное обновление стейта (используется через setState-обёртку)
            case PIVOT_ACTION.STATE_UPDATE:
                return tr.action.payload as PluginPivotState;

            default:
                return state;
        }
    }

    // ─── Veto ─────────────────────────────────────────────────────────────────

    override collectVeto(tr: Transaction, _state: PluginPivotState): string | null {
        // Реагируем на объединение ячеек
        const { action } = tr;
        if (action?.type !== 'JOINED_CELLS_SET') return null;

        const joinedCells = action.payload;
        if (!joinedCells?.length) return null;

        // Вычисляем актуальный range таблицы из загруженных данных.
        const indexKeys = this.pluginPivotData.state.index.meta.sortingUuid;
        const columnKeys = this.pluginPivotData.state.columns.meta.sortingUuid;

        if (!indexKeys.length || !columnKeys.length) return null;

        const dataHeight = this.pluginRange.height > 1 ? this.pluginRange.height : indexKeys.length;
        const dataWidth = this.pluginRange.width > 1 ? this.pluginRange.width : columnKeys.length;

        const tableRange: TPluginRange = {
            x: this.pluginRange.x,
            y: this.pluginRange.y,
            height: PIVOT_HEADER_ROWS_COUNT + dataHeight,
            width: dataWidth,
        };

        for (const jc of joinedCells) {
            if (isMergeVetoed(jc.range, tableRange)) {
                return 'Объединение ячеек в области сводной таблицы невозможно';
            }
        }

        return null;
    }

    override resolveVetoes(ctx: VetoContext, _state: PluginPivotState): void {
        // Показываем предупреждение только для объединения ячеек
        const { tr, vetoes } = ctx;
        const { action } = tr;
        if (action?.type !== 'JOINED_CELLS_SET') return;

        const pivotVeto = vetoes.get(PLUGIN_PIVOT_KEY);
        if (!pivotVeto) return;

        // eslint-disable-next-line no-restricted-globals
        alert(pivotVeto.reason);
        // Veto не снимаем — объединение в любом случае заблокировано
    }

    // ─── appendTransaction: реакция на события ───────────────────────────────

    /**
     * Стадия 3 транзакционного цикла.
     *
     * Используем queueMicrotask для отложенного запуска side-эффектов —
     * чтобы не запускать render-цикл посреди обработки транзакции.
     */
    override appendTransaction(
        tr: Transaction,
        _prevState: PluginPivotState,
        _nextState: PluginPivotState,
    ): SpreadsheetAction[] | SpreadsheetAction | null {
        if (tr.action?.type === PERSIST_ACTION.LOAD_SUCCESS) {
            queueMicrotask(() => void this.onMount());

            return null;
        }

        return null;
    }

    // ─── Provider: plugin-owned cell config defaults ──────────────────────────

    /**
     * Provider fallback — вызывается из context.getCellPluginConfig() когда
     * в PluginConfigManager нет user override для данной ячейки/ключа.
     *
     * O(1): Map<Map> lookup без итерации.
     * Не мутирует состояние — только читает configStore.
     */
    override provideCellPluginConfig(
        cell: ObjectIndexes,
        key: keyof ICellPluginsConfig,
    ): ICellPluginsConfig[keyof ICellPluginsConfig] | null {
        if (!this.configStore.isInArea(cell.rowIndex, cell.columnIndex)) return null;

        if (key === PLUGIN_CELL_FORMATTING_KEY) {
            const format = this.configStore.getFormat(cell.rowIndex, cell.columnIndex);
            return format != null ? { format } : null;
        }

        if (key === PLUGIN_PIVOT_KEY) {
            const pivot = this.configStore.getPivotMeta(cell.rowIndex, cell.columnIndex);
            return pivot ?? null;
        }

        return null;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override onMount(): void {
        this.tableAdapter.setCellsWithStyle(
            new Map<number, Map<number, ICellWithStyles>>([
                [
                    this.pluginRange.y,
                    new Map<number, ICellWithStyles>([
                        [
                            this.pluginRange.x,
                            {
                                components: [
                                    {
                                        positionRelativeToText: 'before',
                                        type: 'button',
                                        icon: SettingIcon,
                                        disabled: false,
                                        loading: false,
                                        onClick: this.openMenu,
                                        color: 'primary',
                                    } as IButton,
                                ],
                                data: null,
                                styles: {
                                    verticalAlign: 'center',
                                    horizontalAlign: 'center',
                                },
                            },
                        ],
                    ]),
                ],
            ]),
        );

        // void this.renderTable();
    }

    override onUnmount(): void {
        this.cancelPendingRenders();
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    override getContextMenuItems(_state: PluginPivotState, ctx: ContextMenuContext): TContextMenuItem[] {
        const { rowIndex, columnIndex } = ctx.cell.coordinates;
        const isCell = columnIndex !== -1 && rowIndex !== -1;
        if (!isCell) return [];

        const {
            args: { repeatHeaders },
        } = this.getState();

        const items: TContextMenuItem[] = [];
        if (
            ctx.cell.rowIndex >= this.pluginRange.y + PIVOT_HEADER_ROWS_COUNT &&
            ctx.cell.rowIndex < this.pluginRange.y + PIVOT_HEADER_ROWS_COUNT + this.pluginRange.height &&
            ctx.cell.columnIndex >= this.pluginRange.x &&
            ctx.cell.columnIndex < this.pluginRange.x + this.pluginRange.width
        ) {
            items.push({
                label: !repeatHeaders ? 'Повторять подписи элементов' : 'Компактный формат',
                disabled: false,
                action: () => {
                    this.setState(
                        (prevState) => ({
                            ...prevState,
                            args: {
                                ...prevState.args,
                                repeatHeaders: !prevState.args.repeatHeaders,
                            },
                        }),
                        () => {
                            void this.forceRenderTable();
                        },
                    );
                },
            });
        }

        const pconfig = this.context.getCellPluginConfig(ctx.cell, PLUGIN_PIVOT_KEY);
        if (pconfig) {
            const { data, index, columns } = pconfig;
            if (data) {
                items.push({ label: 'Drilldown', disabled: true, action: () => {} }, { divider: true });
            } else if (index || columns) {
                const type = index ? 'index' : 'columns';
                const { dbColumn, subtotals } = (index || columns)!;

                const newSubtotals = !subtotals;

                items.push({
                    label: `${newSubtotals ? 'Показать' : 'Скрыть'} промежуточные итоги`,
                    disabled: false,
                    action: () => {
                        this.setState(
                            (prevState) => {
                                const pp = pconfig.index ? 'rows' : 'columns';

                                const fi = prevState.args[pp].find((f) => f.name === pconfig[type]?.dbColumn);
                                if (!fi) return prevState;

                                const newArr = updateArrayByItemId(prevState.args[pp], fi.id, 'totalsOnoff', newSubtotals);

                                return {
                                    ...prevState,
                                    args: {
                                        ...prevState.args,
                                        [pp]: newArr,
                                    },
                                };
                            },
                            () => {
                                for (const key in this.pluginPivotData.state[type].data) {
                                    if (this.pluginPivotData.state[type].data[key].meta.dbColumn !== dbColumn) continue;
                                    this.pluginPivotData.state[type].data[key].meta.subtotals = newSubtotals;
                                }

                                void this.forceRenderTable();
                            },
                        );
                    },
                });
            }
        }

        return items;
    }

    // ─── Export / Import ──────────────────────────────────────────────────────

    /**
     * Экспорт состояния плагина для сериализации (DRP, снапшоты).
     *
     * Включает reducer-state + операционное состояние (history, historyCache).
     */
    override async export(): Promise<IPluginPivotPluginData> {
        const pluginState = this.getState();

        return {
            key: this.key,
            url: '',
            version: '0.2',
            options: this.options,
            state: structuredClone({
                // Reducer state
                ...pluginState,

                // Операционное состояние
                history: this.history,
                historyCache: this.historyCache,
                infoserviceId: this.infoserviceId,

                // Параметры таблицы читаем из PluginMetadata (а не из tableAdapter напрямую)
                tableParams: {
                    columnsCount: this.tableAdapter.getColumnsCount(),
                    rowsCount: this.tableAdapter.getRowsCount(),
                    columnsMeta: this.tableAdapter.getColumnsMetadata(),
                    rowsMeta: this.tableAdapter.getRowsMetadata(),
                },
            }),
        };
    }

    /**
     * Импорт состояния плагина.
     * Сигнатура соответствует новому контракту Plugin.import().
     */
    override async import(data: IPluginPivotPluginData): Promise<void> {
        const json = data.state ?? data;

        let history: (keyof HistoryCacheType['loadNewChunk'])[] = [];
        let historyCache: HistoryCacheType = { loadRootChunk: {}, loadNewChunk: {} };
        let args: PluginPivotArgs | undefined;

        if (json?.history) history = json.history;
        if (json?.historyCache) historyCache = json.historyCache;
        if (json?.args || json?.schemaSettings) {
            args = json.args ?? json.schemaSettings;
        }

        this.dropPlugin();

        if (args) {
            this.handleSetSchemaSettings(args);

            this.historyCache = historyCache;

            // TODO: Обратная совместимость
            if (historyCache.onClickGetData) {
                if (historyCache.onClickGetData?.args && historyCache.onClickGetData?.data) {
                    const { args: _args, data: _data } = historyCache.onClickGetData;
                    const params = this.getTableData.getBodyForCreatePivot(_args);
                    historyCache.loadRootChunk = { params, data: _data, options: { sliceTraceId: uuid() } };
                }
                delete historyCache.onClickGetData;
            }

            const historyCacheData = historyCache.loadRootChunk;

            if (historyCacheData?.params && historyCacheData?.data) {
                // TODO: Обратная совместимость
                historyCacheData.params.layers ??= this.getTableData.getCleanParams(
                    // @ts-ignore
                    historyCacheData.params.values?.[0]?.child?.[0]?.layers ?? [],
                );

                historyCacheData.options = { sliceTraceId: uuid() };

                await this.loadRootChunk(historyCacheData.params, historyCacheData.options, historyCacheData.data);

                for (const md5Docs of history) {
                    if (!historyCache.loadNewChunk?.[md5Docs]) continue;

                    const { headerKeys, args: _args, data: _data, dependencies } = historyCache.loadNewChunk[md5Docs];
                    let { parentHeader, params } = historyCache.loadNewChunk[md5Docs];

                    parentHeader ??= this.getParentHeader(headerKeys!);
                    params ??= _args!;

                    const newChunkKey = this.pluginPivotChunks.initializationChunk(parentHeader, dependencies);

                    // eslint-disable-next-line no-await-in-loop
                    await this.loadChunkData(
                        parentHeader,
                        newChunkKey,
                        params,
                        historyCacheData.options,
                        _data,
                        dependencies,
                        history,
                    );
                }

                await this.renderTable();
            }

            // Восстанавливаем параметры таблицы через dispatcher
            if (json.tableParams) {
                this.tableAdapter.updateTableParams({
                    rowsCount: json.tableParams.rowsCount,
                    columnsCount: json.tableParams.columnsCount,
                    rowsMeta: json.tableParams.rowsMeta,
                    columnsMeta: json.tableParams.columnsMeta,
                });
            }

            await this.renderTable();
        }
    }

    // ─── Сброс плагина ────────────────────────────────────────────────────────

    /**
     * Сбрасывает операционное состояние плагина и переинициализирует внутренние классы.
     *
     * В отличие от старой версии, не принимает `args: AdapterSpreadSheetPluginArgs` —
     * все настройки берутся из `this.options` (проинжектированных через _inject).
     */
    dropPlugin(): void {
        // Сохраняем предыдущий размер таблицы, чтобы _renderTableImpl мог удалить старые данные
        this.prevPluginRange = { ...this.pluginRange };

        const options = this.options as PluginPivotOptions;
        this._initializeInternals(options);
        this.cancelPendingRenders();

        this.setState(
            () => ({
                args: {
                    columns: [],
                    rows: [],
                    values: [],
                    filter: [],
                    fields: [],
                    layers: [],
                    rowsTotal: true,
                    columnsTotal: false,
                    recalculate: true,
                    repeatHeaders: false,
                    isMask: false,
                    columnsAllValues: false,
                    rowsAllValues: false,
                    measureUnit: 'millions',
                    subtotals: {},
                },
                refs: {},
                pivotParams: {},
            }),
            () => {
                void this.forceRenderTable(true, true);
            },
        );
    }

    // ─── Event handlers (вместо subscribesEvents) ─────────────────────────────

    private _onClear = async (): Promise<void> => {
        this.history = [];
        this.dropPlugin();
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    /**
     * В новой архитектуре render() не принимает аргументы.
     * Опции читаются из this.options (проинжектируются через _inject).
     */
    override render(): ReactElement {
        const options = this.options as PluginPivotOptions;
        const isFetching = this.pluginPivotChunks.hasLoadingChunk();

        const isRootLoading = this.pluginPivotChunks.state.chunks.root?.isLoading ?? false;

        return (
            <NotificationsProvider>
                <MenuIcon
                    onFetchStart={this.onFetchStart}
                    onFetchEnd={this.onFetchEnd}
                    classNameButton={styles.menuIcon}
                    infoserviceId={options.cubeId || options.infoserviceId || this.infoserviceId}
                    handleClickGetData={this.onClickGetData}
                    onChange={this.handleSetSchemaSettings}
                    masterInstance={this}
                    pivotParams={JSON.stringify(this.getState().args)}
                    server={this.server}
                    handleSchemaInfo={this.handleSchemaInfo}
                    isFetching={isFetching}
                    features={[
                        'layers',
                        'filter',
                        'columns',
                        'columns.totals',
                        'rows',
                        'rows.totals',
                        'values',
                        'recalculate',
                        'mask',
                        'columns.allValues',
                        'rows.allValues',
                    ]}
                />
                {isFetching && (
                    <div className={styles['root-loading__all']}>
                        <Loader className={styles.loader} size="small" />
                    </div>
                )}

                {isFetching && !isRootLoading && (
                    <CancelReqButton
                        onClick={() => {
                            this._recalculateCancelFlag = true;
                            this.getTableData.cancelCurrentRequest().finally(() => {
                                this.cancelPendingRenders();
                                this.forceRenderTable();
                            });
                        }}
                        className={styles.chunksBtn}
                    />
                )}

                {isRootLoading && (
                    <div className={styles['root-loading__container']}>
                        <CubeLoader />
                        <CancelReqButton
                            onClick={() => {
                                this._recalculateCancelFlag = true;
                                this.getTableData.cancelCurrentRequest().finally(() => {
                                    this.cancelPendingRenders();
                                    this.forceRenderTable();
                                });
                            }}
                        />
                    </div>
                )}
            </NotificationsProvider>
        );
    }

    // ─── Render control ───────────────────────────────────────────────────────

    renderTable = async (resetPluginSize = false, resetAdapterSize = false): Promise<void> =>
        this.renderController.renderTable(resetPluginSize, resetAdapterSize);

    forceRenderTable = async (resetPluginSize = false, resetAdapterSize = false): Promise<void> =>
        this.renderController.forceRenderTable(resetPluginSize, resetAdapterSize);

    flushRenderTable = async (): Promise<void> => this.renderController.flushRenderTable();

    cancelPendingRenders = (): void => this.renderController.cancelPendingRenders();

    // ─── History management ───────────────────────────────────────────────────

    removeFromHistory(chunkList: any, chunk: any): void {
        if (!chunk) return;

        const chunkKey = chunk.key;

        chunk.dependent.forEach((dependentChunkKey: string) => {
            const dependentChunk = chunkList[dependentChunkKey];
            this.removeFromHistory(chunkList, dependentChunk);
        });

        this.history = this.history?.filter((historyChunkKey) => historyChunkKey !== chunkKey);

        if (chunkKey === 'root') {
            this.historyCache.loadRootChunk = {};
        } else if (this.historyCache.loadNewChunk[chunkKey]) {
            delete this.historyCache.loadNewChunk[chunkKey];
        }
    }

    async removeChunk(chunkKey: string): Promise<void> {
        const chunkList = this.pluginPivotChunks.state.chunks;
        const chunk = chunkList[chunkKey];
        if (!chunk) return;

        this.removeFromHistory(chunkList, chunk);
        const deletedHeaders = this.pluginPivotChunks.removeChunk(chunkKey);
        this.pluginPivotData.removeChunkData(deletedHeaders);
        await this.forceRenderTable();
    }

    // ─── Data loading ─────────────────────────────────────────────────────────

    async recalculate(
        history: (keyof HistoryCacheType['loadNewChunk'])[],
        historyCache: HistoryCacheType,
        options: IFetchOptions,
    ): Promise<void> {
        try {
            for await (const md5Docs of history ?? []) {
                // Проверяем флаг отмены — прерываем цикл,
                // чтобы не загружать оставшиеся чанки
                if (this._recalculateCancelFlag) break;

                if (!historyCache?.loadNewChunk?.[md5Docs]) continue;

                const { headerKeys, args, dependencies } = historyCache.loadNewChunk[md5Docs];
                let { parentHeader, params: hparams } = historyCache.loadNewChunk[md5Docs];

                parentHeader ??= this.getParentHeader(headerKeys!);
                hparams ??= args!;

                if (parentHeader.columns && !this.pluginPivotData.state.columns.data[parentHeader.columns.key]) continue;
                if (parentHeader.index && !this.pluginPivotData.state.index.data[parentHeader.index.key]) continue;
                if (isIntersectionChunk(parentHeader)) continue;

                const params = structuredClone(hparams);
                const rootParams = this.pluginPivotChunks.state.chunks.root.params;
                const newParams = structuredClone(rootParams);

                delete params.where?.$and;
                delete params.where?.$or;
                newParams.where = { ...newParams.where, ...params.where };

                const columnIndex = newParams.columns!.findIndex(
                    (column: PluginPivotDataSettingsParamsHeader) => column.name === params.columns![0].name,
                );
                if (columnIndex === -1) continue;

                newParams.columns = newParams.columns!.slice(columnIndex);
                for (let i = 1; i < newParams.columns.length; i++) {
                    // @ts-ignore
                    delete newParams.where[newParams.columns[i].name];
                }

                const rowIndex = newParams.rows!.findIndex(
                    (row: PluginPivotDataSettingsParamsHeader) => params.rows![0].name === row.name,
                );
                if (rowIndex === -1) continue;

                newParams.rows = newParams.rows!.slice(rowIndex);
                for (let i = 1; i < newParams.rows.length; i++) {
                    // @ts-ignore
                    delete newParams.where[newParams.rows[i].name];
                }

                if (!parentHeader.index && parentHeader.columns) {
                    newParams.values =
                        params.values?.filter((value: PluginPivotDataSettingsParamsHeader) =>
                            newParams.values?.find(
                                (v: PluginPivotDataSettingsParamsHeader) => value.name === v.name || value.id === v.id,
                            ),
                        ) ?? [];
                    if (!newParams.values.length) continue;

                    newParams.layers =
                        params.layers?.filter((layer: PluginPivotDataSettingsParamsHeader) =>
                            newParams.layers?.find(
                                (l: PluginPivotDataSettingsParamsHeader) => layer.name === l.name || layer.id === l.id,
                            ),
                        ) ?? [];
                    if (!newParams.layers.length) continue;
                }

                await this.loadNewChunk(parentHeader, newParams, options, undefined, dependencies);
            }

            await this.renderTable();
        } catch (error) {
            this.pluginPivotChunks.clearPendingChunks();
        } finally {
            this._recalculateCancelFlag = false;

            await this.renderTable();
        }
    }

    onClickGetData = async (args: PluginPivotArgs, onLoadEnd?: () => void): Promise<void> => {
        const sliceTraceId = uuid();
        this.currentSliceTraceId = sliceTraceId;

        let callback = onLoadEnd;
        if (args.recalculate) {
            const history = structuredClone(this.history);
            const historyCache = structuredClone(this.historyCache);
            callback = () => this.recalculate(history, historyCache, { sliceTraceId }).finally(onLoadEnd);
        }

        this.handleSetSchemaSettings(args);

        this.history = [];
        this.historyCache = { loadRootChunk: {}, loadNewChunk: {} };

        const params = this.getTableData.getBodyForCreatePivot(args);
        await this.loadRootChunk(params, { sliceTraceId }, undefined, callback);
    };

    async loadRootChunk(
        params: PluginPivotDataSettingsParams,
        options: IFetchOptions,
        data: any = undefined,
        onLoadEnd: () => void = () => {},
    ) {
        if (!params?.columns?.length || !params?.rows?.length || !params?.values?.length || !params?.layers?.length) {
            onLoadEnd?.();
            this.pluginPivotChunks.setLoaded();
            this.renderTable();
            return;
        }

        this.pluginPivotData.removeState();
        this.pluginPivotChunks.removeState();

        const chunkKey = this.pluginPivotChunks.initializationChunk();

        this.pluginPivotChunks.setLoading();

        await this.forceRenderTable(true, true);

        if (!data) {
            data = await this.getTableData.getTableData(this.infoserviceId, params, options).catch(() => {
                this.removeChunk(chunkKey);
                this.historyCache.loadRootChunk = {};
            });
        }

        if (data) {
            this.historyCache.loadRootChunk = { params, data, options };
        }

        if (data?.data) {
            this.recordRefs(data);

            // TODO  :'( Ничего не возвращается, ничего не сохраняется, зато потом везде используется
            this.pluginPivotChunks.registerChunk(chunkKey, data as Required<PluginPivotResponseData>, params, options);
            this.pluginPivotData.buildChunk(chunkKey, data as Required<PluginPivotResponseData>);
        }

        this.pluginPivotChunks.setLoaded();

        await this.forceRenderTable();

        onLoadEnd?.();
    }

    getParentHeader = (headerKeys: PluginPivotChunksChunkParentHeadersForHash): PluginPivotChunksChunkParentHeaders =>
        ({
            ...(!!headerKeys?.columns && {
                columns: {
                    type: headerKeys.columns.type,
                    key: headerKeys.columns.key,
                    dbColumn: this.pluginPivotData.state.columns.data[headerKeys.columns.key].meta.dbColumn,
                    value: this.pluginPivotData.state.columns.data[headerKeys.columns.key].meta.dimension,
                    chunkKey: headerKeys.columns.chunkKey,
                },
            }),
            ...(!!headerKeys?.index && {
                index: {
                    type: headerKeys.index.type,
                    key: headerKeys.index.key,
                    dbColumn: this.pluginPivotData.state.index.data[headerKeys.index.key].meta.dbColumn,
                    value: this.pluginPivotData.state.index.data[headerKeys.index.key].meta.dimension,
                    chunkKey: headerKeys.index.chunkKey,
                },
            }),
        } as PluginPivotChunksChunkParentHeaders);

    async loadNewChunk(
        parentHeader: PluginPivotChunksChunkParentHeaders,
        params: PluginPivotDataSettingsParams,
        options: IFetchOptions,
        data: any = undefined,
        dependencies: string[] = [],
    ): Promise<void> {
        const newChunkKey = this.pluginPivotChunks.initializationChunk(parentHeader, dependencies);

        this.pluginPivotChunks.setLoading(newChunkKey);

        this.renderTable();

        await this.loadChunkData(parentHeader, newChunkKey, params, options, data, dependencies);

        this.pluginPivotChunks.setLoaded(newChunkKey);

        this.renderTable();
    }

    loadChunkData = async (
        parentHeader: PluginPivotChunksChunkParentHeaders,
        newChunkKey: string,
        params: PluginPivotDataSettingsParams,
        options: IFetchOptions,
        data?: any,
        dependencies: string[] = [],
        history: string[] = [],
        bubble = false,
    ) => {
        if (!data) {
            data = await this.getTableData.getTableData(this.infoserviceId, params, options).catch((e) => {
                this.removeChunk(newChunkKey);
                if (bubble) throw e;
            });
        }

        if (data) {
            this.historyCache.loadNewChunk = {
                ...this.historyCache.loadNewChunk,
                [newChunkKey]: { parentHeader, params, data, dependencies },
            };
            if (!this.history.includes(newChunkKey)) {
                this.history.push(newChunkKey);
            }
        }

        if (data?.data) {
            this.recordRefs(data);

            this.pluginPivotChunks.registerChunk(newChunkKey, data as Required<PluginPivotResponseData>, params, options);
            this.pluginPivotData.buildChunk(newChunkKey, data as Required<PluginPivotResponseData>);

            if (!isIntersectionChunk(parentHeader) && !history.length) {
                for (const chunkKey of Object.keys(this.pluginPivotChunks.state.chunks)) {
                    const chunk = this.pluginPivotChunks.state.chunks[chunkKey];

                    if (isColumnChunk(parentHeader) && chunk.parentHeader?.index) {
                        const searchKey = getHashChunk({
                            columns: parentHeader.columns,
                            index: chunk.parentHeader.index,
                        });

                        if (!this.pluginPivotChunks.state.chunks?.[searchKey]) {
                            const intersectionParentHeader = this.getParentHeader({
                                index: {
                                    type: chunk.parentHeader.index.type,
                                    key: chunk.parentHeader.index.key,
                                    chunkKey: chunk.parentHeader.index.chunkKey,
                                },
                                columns: parentHeader.columns,
                            });
                            const intersectionDependencies = [
                                newChunkKey,
                                parentHeader.columns?.chunkKey as string,
                                chunk.key,
                            ];
                            const intersectionChunkKey = this.pluginPivotChunks.initializationChunk(
                                intersectionParentHeader,
                                intersectionDependencies,
                            );
                            const intersectionParams: PluginPivotDataSettingsParams = {
                                ...params,
                                where: { ...params.where, ...chunk.params.where },
                            };
                            if (chunk.params.rows) intersectionParams.rows = chunk.params.rows;

                            // eslint-disable-next-line no-await-in-loop
                            await this.loadChunkData(
                                intersectionParentHeader,
                                intersectionChunkKey,
                                intersectionParams,
                                options,
                                undefined,
                                intersectionDependencies,
                                history,
                                true,
                            ).catch((e) => {
                                this.removeChunk(newChunkKey);
                                if (bubble) throw e;
                            });
                        }
                    }

                    if (isIndexChunk(parentHeader) && chunk.parentHeader?.columns) {
                        const searchKey = getHashChunk({
                            columns: chunk.parentHeader.columns,
                            index: parentHeader.index,
                        });

                        if (!this.pluginPivotChunks.state.chunks?.[searchKey]) {
                            const intersectionParentHeader = this.getParentHeader({
                                columns: {
                                    type: chunk.parentHeader.columns.type,
                                    key: chunk.parentHeader.columns.key,
                                    chunkKey: chunk.parentHeader.columns.chunkKey,
                                },
                                index: parentHeader.index,
                            });
                            const intersectionDependencies = [newChunkKey, parentHeader.index?.chunkKey as string, chunk.key];
                            const intersectionChunkKey = this.pluginPivotChunks.initializationChunk(
                                intersectionParentHeader,
                                intersectionDependencies,
                            );
                            const intersectionParams: PluginPivotDataSettingsParams = {
                                ...params,
                                // @ts-ignore
                                values: chunk.params.values,
                                where: { ...params.where, ...chunk.params.where },
                            };
                            if (chunk.params.columns) intersectionParams.columns = chunk.params.columns;

                            // eslint-disable-next-line no-await-in-loop
                            await this.loadChunkData(
                                intersectionParentHeader,
                                intersectionChunkKey,
                                intersectionParams,
                                options,
                                undefined,
                                intersectionDependencies,
                                history,
                                true,
                            ).catch((e) => {
                                this.removeChunk(newChunkKey);
                                if (bubble) throw e;
                            });
                        }
                    }
                }
            }
        }
    };

    // ─── State helpers ────────────────────────────────────────────────────────

    openMenu() {
        StateManager.setState({ MenuIcon: true });
    }

    onTableFilterClick = (fieldName: string, x: number, y: number, width: number, height: number): void => {
        return;
        StateManager.setState({ [`FilterModal_${fieldName}`]: { open: true, x, y, width, height } });
    };

    recordRefs(data: PluginPivotResponseData): void {
        const refs = data?.refs || {};

        this.setState((state) => ({
            ...state,
            refs: {
                ...state.refs,
                ...Object.keys(refs).reduce((prev, key) => {
                    if (state.refs[key]) {
                        prev[key] = { ...refs[key], ...state.refs[key] };
                    } else {
                        prev[key] = refs[key];
                    }
                    return prev;
                }, {} as Record<string, Record<string, string>>),
            },
        }));
    }

    getParamField(param: PluginPivotDataSettingsParamsHeader): PluginPivotArg | undefined {
        return this.getState().args.fields.find((field) => field.id === param?.id || field.name === param?.name);
    }

    handleSetSchemaSettings = (args: PluginPivotArgs): void => {
        const prevMeasureUnit = this.getState().args.measureUnit;
        const nextMeasureUnit = args.measureUnit;
        const pivotParamsArr: PluginPivotArg[] = [
            ...(args?.columns || []),
            ...(args?.values || []),
            ...(args?.rows || []),
            ...(args?.filter || []),
        ];

        const pivotParams = pivotParamsArr.reduce((acc, item) => {
            const readable = item.description ?? item.label;
            acc[item.name] = readable;

            if (item.child?.length) {
                item.child.forEach((child) => {
                    const childReadable = child.description ?? child.label;
                    acc[`${item.name}.${child.name}`] = `${readable}.${childReadable}`;
                });
            }
            return acc;
        }, {} as Record<string, string>);

        this.setState((state) => ({
            ...state,
            args: {
                // @ts-ignore
                rowsTotal: true,
                // @ts-ignore
                columnsTotal: false,
                // @ts-ignore
                recalculate: true,
                // @ts-ignore
                repeatHeaders: false,
                // @ts-ignore
                isMask: false,
                // @ts-ignore
                measureUnit: 'millions',
                ...args,
            },
            pivotParams,
        }));

        if (prevMeasureUnit !== nextMeasureUnit) {
            void this.forceRenderTable();
        }
    };

    // TODO: Ну, тут слов нет...
    getFilterUserValue = (field: string, value: string | number): string => {
        for (const block of ['columns', 'rows', 'filter', 'values'] as const) {
            for (const blockField of this.state.args[block] ?? []) {
                if (blockField.name === field) {
                    for (const filter of blockField.filter ?? []) {
                        if (filter.value === value) {
                            return (filter.label as string) || String(value);
                        }
                    }
                }
            }
        }

        return String(value);
    };

    onFetchStart = (): void => {
        this.pluginPivotChunks.setLoading();

        this.renderTable();
    };

    onFetchEnd = () => {
        this.pluginPivotChunks.setLoaded();

        this.renderTable();
    };

    handleSchemaInfo = (schemaInfo: PluginPivotSchemaInfo): void => {
        this.setState((state) => ({ ...state, schemaInfo }));

        const { name, isChanged } = schemaInfo;

        const state = this.getState();

        const { values } = schemaInfo;
        const { measureUnit } = schemaInfo;

        const schemaName = name && isChanged ? `*${name}` : name;
        const list = [
            [
                2,
                new Map<number, ICellWithStyles>([
                    [0, { data: 'Название схемы' }],
                    [
                        1,
                        {
                            data: schemaName,
                            styles: {
                                horizontalAlign: 'end',
                            },
                        },
                    ],
                ]),
            ],
        ];

        const isScaleFormat = values?.some((item: any) => item.format && SCALE_FORMATTING_TYPES.includes(item.format));
        const useMeasure = values?.some((item: any) => item.useMeasure);

        if (values || measureUnit) {
            list.push([
                3,
                new Map<number, ICellWithStyles>([
                    [0, { data: 'Ед. измерения' }],
                    [
                        1,
                        {
                            data: measureUnit && isScaleFormat && useMeasure ? SCALES[measureUnit] : '',
                            styles: {
                                horizontalAlign: 'end',
                            },
                        },
                    ],
                ]),
            ]);
        }

        this.tableAdapter.setCellsWithStyle(
            new Map<number, Map<number, ICellWithStyles>>(list as Array<[number, Map<number, ICellWithStyles>]>),
        );
    };
}
