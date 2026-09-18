import StateManager from 'lite-react-statemanager';
import React from 'react';
import { NotificationsProvider } from 'ui-kit';
import { v4 as uuidv4 } from 'uuid';

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ContextMenuContext, IButton, ICellWithStyles, TContextMenuItem } from '../../AdapterSpreadSheet/types';
import { MenuIcon } from '../../PivotMenu/MenuIcon';
import { SberCat } from '../../ui/SberCat';
import { PIVOT_ACTION, PIVOT_PLUGIN_KEY } from './constants';
import { SredaPivotDataManager } from './DataManager';
import PivotTableService from './services/PivotTableService';
import { SettingIcon } from './services/PivotTableService/icons';
import { IPivotCellMetadata } from './services/PivotTableService/types';
import styles from './styles.module.css';
import {
    INewPluginPivotArgs,
    INewPluginPivotPluginData,
    INewPluginPivotSchemaInfo,
    NewPluginPivotOptions,
    NewPluginPivotState,
    TNewPluginPivotRange,
} from './types';

// ─── Константы ───────────────────────────────────────────────────────────────

const DEFAULT_ARGS: INewPluginPivotArgs = {
    columns: [],
    rows: [],
    values: [],
    filter: [],
    layers: [],
    totals: { indices: true, columns: false },
    isMask: false,
    isClassic: false,
};

const DEFAULT_STATE: NewPluginPivotState = {
    args: DEFAULT_ARGS,
    fields: [],
    schemaInfo: { name: '', isChanged: false },
};

// ─────────────────────────────────────────────────────────────────────────────

export class NewPluginPivot extends Plugin<typeof PIVOT_PLUGIN_KEY, NewPluginPivotState, NewPluginPivotOptions> {
    readonly key = PIVOT_PLUGIN_KEY;

    readonly initialState = { ...DEFAULT_STATE };

    /** Мутабельный сервис вне reducer-state. */
    private pivotService: PivotTableService | null = null;

    pluginRange!: TNewPluginPivotRange;

    prevPluginRange: TNewPluginPivotRange | null = null;

    // ── Геттеры опций ─────────────────────────────────────────────────────────

    private get pluginOptions(): NewPluginPivotOptions {
        return this.options as NewPluginPivotOptions;
    }

    private get cubeId(): string {
        return this.pluginOptions.cubeId;
    }

    private get server(): string {
        return (this.pluginOptions.server ?? '').replace(/\/+$/gm, '');
    }

    // ── Reducer ───────────────────────────────────────────────────────────────

    override reducer(state: NewPluginPivotState, tr: Transaction): NewPluginPivotState {
        switch (tr.action?.type) {
            case PIVOT_ACTION.SET_ARGS:
                return { ...state, args: tr.action.payload };

            case PIVOT_ACTION.SET_SCHEMA_INFO:
                return { ...state, schemaInfo: tr.action.payload };

            case PIVOT_ACTION.DROP:
                this.pivotService = null;
                return { ...DEFAULT_STATE };

            default:
                return state;
        }
    }

    // ─── СТАДИЯ 3: appendTransaction ─────────────────────────────────────────

    override appendTransaction(
        tr: Transaction,
        _prevState: NewPluginPivotState,
        _nextState: NewPluginPivotState,
    ): SpreadsheetAction | SpreadsheetAction[] | null {
        switch (tr.action?.type) {
            case PIVOT_ACTION.ON_FETCH_START: {
                const containerRef = this.context.table?.current;

                if (containerRef && 'style' in containerRef && containerRef.style) {
                    (containerRef.style as CSSStyleDeclaration).cursor = 'pointer';
                }
                return null;
            }

            case PIVOT_ACTION.ON_FETCH_END: {
                const containerRef = this.context.table?.current;
                if (containerRef && 'style' in containerRef && containerRef.style) {
                    (containerRef.style as CSSStyleDeclaration).cursor = 'default';
                }
                return null;
            }
        }

        return null;
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    override getContextMenuItems(_state: NewPluginPivotState, ctx: ContextMenuContext): TContextMenuItem[] {
        const { rowIndex, columnIndex } = ctx.cell.coordinates;
        const isCell = columnIndex !== -1 && rowIndex !== -1;
        if (!isCell) return [];

        const cellData: IPivotCellMetadata = this.context.getCellPluginConfig(
            ctx.cell,
            PIVOT_PLUGIN_KEY,
        ) as IPivotCellMetadata;
        if (!cellData) return [];

        const items: TContextMenuItem[] = [];
        if (cellData.type === 'measure') {
            items.push({ label: 'Дрилл-тру', disabled: true, action: () => {} }, { divider: true });
        } else if (cellData.type === 'dimension' && cellData.dimension) {
            const { dimension } = cellData;
            items.push({
                label: `${dimension.subtotalHidden ? 'Показать' : 'Скрыть'} промежуточные итоги уровня ${dimension.label}`,
                disabled: false,
                action: () =>
                    this.pivotService?.setSubtotalVisibility(dimension.name, dimension.axis, !dimension.subtotalHidden),
            });
        }
        return items;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override onMount(): void {
        this.pluginRange = {
            x: this.pluginOptions.pluginRange?.x ?? 0,
            y: this.pluginOptions.pluginRange?.y ?? 0,
            height: 1,
            width: 1,
        };
        this.prevPluginRange = null;
        this._createRootButton(/* skipHistory = */ true);
    }

    override onUnmount(): void {
        this.pivotService = null;
    }

    // ── Построение UI-ячеек ──────────────────────────────────────────────────

    private _buildRootButtonData(): Map<number, Map<number, ICellWithStyles>> {
        return new Map([
            [
                0,
                new Map<number, ICellWithStyles>([
                    [
                        0,
                        {
                            components: [
                                {
                                    positionRelativeToText: 'before',
                                    type: 'button',
                                    icon: SettingIcon,
                                    disabled: false,
                                    loading: false,
                                    onClick: () => StateManager.setState({ MenuIcon: true }),
                                    color: 'primary',
                                } as IButton,
                            ],
                            data: null,
                            styles: { horizontalAlign: 'center' },
                        },
                    ],
                ]),
            ],
        ]);
    }

    private _buildSchemaInfoRows(): Map<number, Map<number, ICellWithStyles>> {
        const { schemaInfo } = this.getState();
        const name = schemaInfo.isChanged ? `*${schemaInfo.name}` : schemaInfo.name;

        return new Map([
            [
                0,
                new Map<number, ICellWithStyles>([
                    [0, { data: 'Название схемы', components: [], config: { readonly: true } }],
                    [1, { data: name, components: [], config: { readonly: true } }],
                ]),
            ],
        ]);
    }

    // ── Операции с данными таблицы (через TransactionBuilder) ─────────────

    private _createRootButton(skipHistory = false): void {
        const { x, y } = this.pluginRange;

        this.context.transaction().setCellsWithStyle(this._buildRootButtonData(), { x, y }).commit(skipHistory);
    }

    private _handleDrop(): void {
        this.context.transaction().withAction({ type: PIVOT_ACTION.DROP }).clearAll().commit();
    }

    private _patchCell = (rowIndex: number, columnIndex: number, cell: ICellWithStyles): void => {
        const cellData = new Map([[0, new Map([[0, cell]])]]);
        this.context.transaction().setCellsWithStyle(cellData, { x: columnIndex, y: rowIndex }).commit(true);
    };

    private _renderPivot = (pivotTable: Map<number, Map<number, ICellWithStyles>>): void => {
        const { x, y } = this.pluginRange;

        const rootButtonData = this._buildRootButtonData();
        const rootBtnRow = rootButtonData.get(0);
        const schemaRows = this._buildSchemaInfoRows();
        const schemaCount = schemaRows.size;
        const totalRows = (rootBtnRow?.size || 0) + 1 + schemaCount + 2 + pivotTable.size;

        const firstPivotRow = pivotTable.size > 0 ? pivotTable.get(1) : undefined;
        const totalCols = Math.max(rootBtnRow?.size ?? 0, firstPivotRow?.size ?? 0);

        if (this.prevPluginRange) {
            const { y: prevY, x: prevX } = this.prevPluginRange;
            const prevEndY = prevY + this.prevPluginRange.height - 1;
            const prevEndX = prevX + this.prevPluginRange.width - 1;
            const prevRange = new Range(
                new Cell({ rowIndex: prevY, columnIndex: prevX }),
                new Cell({ rowIndex: prevEndY, columnIndex: prevEndX }),
            );

            this.context
                .transaction()
                .deleteRange(prevRange)
                .clearRangeStyles(prevRange)
                .clearPluginConfigRange(prevRange)
                .commit(/* skipHistory */ true);
        }

        this.prevPluginRange = { ...this.pluginRange };
        this.pluginRange = { x, y, width: totalCols, height: totalRows };

        const tx = this.context.transaction();

        tx.setCellsWithStyle(rootButtonData, { x, y });

        const schemaOffset = { x, y: 2 + y };
        tx.setCellsWithStyle(schemaRows, schemaOffset);

        const pivotOffset = { x, y: 2 + y + schemaCount + 1 };
        tx.setCellsWithStyle(pivotTable, pivotOffset);

        tx.commit();
    };

    private _openFilter = (field: string) => {
        StateManager.setState({ [`FilterModal_${field}`]: true });
    };

    // ── Публичные методы ─────────────────────────────────────────────────────

    /**
     * FIX [P1]: Always reuse the existing PivotTableService when one exists.
     *
     * Classic layout changes are applied via `setClassicLayout()` — this
     * is a pure rendering flag that does NOT require service recreation.
     * Previously, changing `isClassic` caused a brand-new service to be
     * created, destroying ALL drill-down state, hierarchy trees, and
     * subtotal configurations.
     *
     * FIX [P2]: Classic layout is set atomically before the build/rebuild.
     */
    onClickGetData = async (args: INewPluginPivotArgs, onLoadEnd?: () => void): Promise<void> => {
        const requestId = uuidv4();
        // Обновляем args в reducer-state
        this.context.dispatch({ type: PIVOT_ACTION.SET_ARGS, payload: args });

        if (!args?.columns?.length || !args?.rows?.length || !args?.values?.length || !args?.layers?.length) {
            onLoadEnd?.();
            return;
        }

        const dataManager = new SredaPivotDataManager(this.cubeId, args, this.server, this.pluginOptions.reqLimit);

        dataManager.setOnFetchStartCallback((v) => {
            this.context.dispatch({
                type: PIVOT_ACTION.ON_FETCH_START,
                payload: { ...v, requestId },
            });
        });

        dataManager.setOnFetchEndCallback((v) => {
            this.context.dispatch({
                type: PIVOT_ACTION.ON_FETCH_END,
                payload: { ...v, requestId },
            });
        });

        dataManager.setOnFetchErrorCallback((v) => {
            this.context.dispatch({
                type: 'PLUGIN_FETCH_ERROR/EVENT',
                payload: { ...v, requestId },
            });
        });

        if (this.pivotService) {
            this.pivotService.setClassicLayout(args.isClassic ?? false);
            this.pivotService.setOnCellPatchCallback(this._patchCell);
            this.pivotService.rebuildWithNewParams(dataManager).finally(() => onLoadEnd?.());
        } else {
            this.pivotService = new PivotTableService(dataManager, true);
            this.pivotService.setOnTableBuildCallback(this._renderPivot);
            this.pivotService.setOnFilterClickCallback(this._openFilter);
            this.pivotService.setOnCellPatchCallback(this._patchCell);
            this.pivotService.build(args.isClassic ?? false).finally(() => onLoadEnd?.());
        }
    };

    /**
     * Применяет новую схему без запуска загрузки данных.
     */
    handleSetArgs = (args: INewPluginPivotArgs): void => {
        this.context.dispatch({ type: PIVOT_ACTION.SET_ARGS, payload: args });
    };

    /**
     * Обновляет мета-информацию о схеме (название и флаг изменений).
     */
    handleSchemaInfo = (schemaInfo: INewPluginPivotSchemaInfo): void => {
        this.context.dispatch({ type: PIVOT_ACTION.SET_SCHEMA_INFO, payload: schemaInfo });
    };

    onFetchStart = (): void => {
        /* hook для loading-state */
    };

    // ── Сериализация ──────────────────────────────────────────────────────────

    override async export(): Promise<INewPluginPivotPluginData> {
        const state = this.getState();

        const enrichedState: NewPluginPivotState = {
            ...state,
            pivotServiceState: this.pivotService?.exportState(),
        };

        return { key: this.key, url: '', version: '2.0', options: this.options, state: enrichedState };
    }

    override async import(data: INewPluginPivotPluginData): Promise<void> {
        let { state } = data;
        // @ts-expect-error
        state ??= data;

        this._handleDrop();
        this._createRootButton();

        if (state.args) {
            this.context.dispatch({ type: PIVOT_ACTION.SET_ARGS, payload: state.args });
        }

        if (state.schemaInfo) {
            this.context.dispatch({ type: PIVOT_ACTION.SET_SCHEMA_INFO, payload: state.schemaInfo });
        }

        if (
            state.args?.columns?.length &&
            state.args?.rows?.length &&
            state.args?.values?.length &&
            state.args?.layers?.length
        ) {
            await this.onClickGetData(state.args);

            if (state.pivotServiceState && this.pivotService) {
                this.pivotService.importStateFromJSON(JSON.stringify(state.pivotServiceState));
            }
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const state = this.getState();
        const options = this.pluginOptions;

        return (
            <NotificationsProvider>
                <MenuIcon
                    disableIcon
                    onFetchStart={this.onFetchStart}
                    classNameButton={styles.menuIcon}
                    infoserviceId={options.cubeId}
                    handleClickGetData={this.onClickGetData}
                    onChange={this.handleSetArgs}
                    masterInstance={this}
                    pivotParams={JSON.stringify(state.args)}
                    server={this.server}
                    handleSchemaInfo={this.handleSchemaInfo}
                    isFetching={false}
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
                        'classic',
                        'static.layers',
                        'static.values',
                    ]}
                />
            </NotificationsProvider>
        );
    }
}
