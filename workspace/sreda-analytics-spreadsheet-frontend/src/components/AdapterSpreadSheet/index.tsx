// eslint-disable-next-line import/no-unresolved
import 'ui-kit/style.css';

import { createRef, RefObject, Suspense } from 'react';

import { PLUGIN_CURSOR_CELL_KEY } from '../SpreadSheetPlugins/PluginCursorCell/constants';
import { PLUGIN_HISTORY_KEY } from '../SpreadSheetPlugins/PluginHistory/constants';
import { PluginHistory } from '../SpreadSheetPlugins/PluginHistory/PluginHistory';
import { PLUGIN_METADATA_KEY } from '../SpreadSheetPlugins/PluginMetadata/constants';
import { PluginMetadata } from '../SpreadSheetPlugins/PluginMetadata/PluginMetadata';
import { IVisibleRanges } from '../SpreadSheetTables/CanvasTable/types';
import { ITableAPI } from '../TableAdapters/types';
import { Portal } from './components/Portal';
import { DEFAULT_SPREAD_SHEET_ID } from './constants';
import { Cell, Range } from './models';
import { Adapter, Plugin, PluginStatesMap, SpreadsheetAction } from './plugin';
import { IPlugin } from './plugin/Plugin';
import {
    AbstractAdapter,
    AdapterReactState,
    AdapterSpreadSheetProps,
    CellDataType,
    ColumnIndex,
    IButton,
    ICell,
    ICellConfig,
    ICellPluginsConfig,
    ICellStyles,
    ObjectIndexes,
    PluginEntriesMap,
    PluginRegistry,
    RegistryPluginState,
    RowIndex,
} from './types';
import { SparseMatrixHelper } from './utils';
import { Debouncer } from './utils/Debouncer';
import { MetadataManager } from './utils/MetadataManager';
import PluginConfigManager from './utils/PluginConfigManager';
import StyleManager from './utils/StyleManager';

export default class AdapterSpreadSheet extends AbstractAdapter {
    // ─── Обязательные поля интерфейса ─────────────────────────────────────────

    plugins: PluginEntriesMap;

    tableAPIRef: RefObject<ITableAPI> = createRef<ITableAPI>();

    styleManager: StyleManager = new StyleManager();

    pluginConfigManager: PluginConfigManager = new PluginConfigManager();

    metadataManager: MetadataManager = new MetadataManager();

    // ─── Мутабельные данные (читаются напрямую Canvas-ом) ────────────────────

    dataMatrix: Map<number, Map<number, ICell>> = new Map();

    // ─── Приватные поля ───────────────────────────────────────────────────────

    private _adapter!: Adapter;

    private _zoomDebouncer: Debouncer = new Debouncer();

    resizeObserver: ResizeObserver | null = null;

    resizeElement: RefObject<HTMLDivElement> = createRef();

    override state: AdapterReactState = {
        lastUpdate: Math.random() * Math.random(),
        mounted: false,
        // contextMenu хранится здесь для обратной совместимости с AbstractAdapter.
        // Реальное управление — через PluginContextMenu.
        contextMenu: { visible: false, x: 0, y: 0, items: [] },
        containerWidth: 1000,
        containerHeight: 500,
    };

    // ─────────────────────────────────────────────────────────────────────────

    constructor(props: AdapterSpreadSheetProps) {
        super(props);

        this.plugins = props.plugins;

        // ── Внешние плагины ───────────────────────────────────────────────────
        const plugins: Plugin<any, any, any>[] = [];
        Object.entries(this.plugins).forEach(([, entry]) => {
            (entry.component as any)._options = entry.options ?? {};
            plugins.push(entry.component as Plugin<any, any, any>);
        });

        // ── Adapter ──────────────────────────────────-------------------------
        this._adapter = new Adapter(plugins);
        this._adapter.injectContext({
            getCellAt: (cell) =>
                SparseMatrixHelper.getCell(this.dataMatrix, cell.coordinates.rowIndex, cell.coordinates.columnIndex),
            getData: () => this.dataMatrix,
            styleManager: this.styleManager,
            pluginConfigManager: this.pluginConfigManager,
            metadataManager: this.metadataManager,
            onUpdate: () => this._requestRender(),
            tableAPIRef: this.tableAPIRef,
        });
    }

    // ─── Dispatch ─────────────────────────────────────────────────────────────

    dispatch = (action: SpreadsheetAction, options: { skipHistory: boolean } = { skipHistory: false }): void => {
        this._adapter.dispatch(action, options);
    };

    protected _requestRender(callback?: () => void): void {
        super.setState(
            (prev: AdapterReactState) => ({ ...prev, lastUpdate: Math.random() }),
            () => callback?.(),
        );
    }

    // ─── Undo / Redo ──────────────────────────────────────────────────────────

    private _getHistory(): PluginHistory | undefined {
        return this._adapter.getPlugin(PLUGIN_HISTORY_KEY) as PluginHistory | undefined;
    }

    public get hasPast(): boolean {
        return this._getHistory()?.hasPast ?? false;
    }

    public get hasFuture(): boolean {
        return this._getHistory()?.hasFuture ?? false;
    }

    undo = (): void => {
        const history = this._getHistory();
        if (!history) return;
        history.undo();
        this._requestRender();
    };

    redo = (): void => {
        const history = this._getHistory();
        if (!history) return;
        history.redo();
        this._requestRender();
    };

    // ─── Plugin state API ─────────────────────────────────────────────────────

    getPlugin<K extends keyof PluginRegistry>(key: K): PluginRegistry[K] | undefined;

    getPlugin(key: string): IPlugin | undefined;

    getPlugin(key: string): IPlugin | undefined {
        return this._adapter.getPlugin(key);
    }

    getPluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;

    getPluginState<S>(key: string): S | undefined;

    getPluginState(key: string): unknown {
        return this._adapter.getPluginState(key);
    }

    snapshotState = (): PluginStatesMap => this._adapter.snapshot();

    restoreState = (snap: PluginStatesMap): void => {
        this._adapter.restore(snap);
        this._requestRender();
    };

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override componentDidMount(): void {
        if (this.resizeElement.current) {
            this.resizeObserver = new ResizeObserver((entries) => {
                const { width, height } = entries[0].contentRect;
                super.setState({ containerWidth: width, containerHeight: height });
            });
            this.resizeObserver.observe(this.resizeElement.current);
        }
        this._adapter.onMount();
        super.setState({ mounted: true });
    }

    override componentWillUnmount(): void {
        this.resizeObserver?.disconnect();
        this._adapter.onUnmount();
        this._zoomDebouncer.cancel();
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    getCellDisplayValue = (rowIndex: RowIndex, columnIndex: ColumnIndex): CellDataType | null => {
        const data = this.getCellAt(new Cell({ rowIndex, columnIndex }));
        if (!data) return null;
        const raw: CellDataType = data.data ?? null;
        return this._adapter.getCellDisplay({ rowIndex, columnIndex }, raw) ?? null;
    };

    getCellComponents = (rowIndex: RowIndex, columnIndex: ColumnIndex): IButton[] =>
        this.getCellAt(new Cell({ rowIndex, columnIndex }))?.components ?? [];

    getCellStyle = (rowIndex: RowIndex, columnIndex: ColumnIndex): ICellStyles =>
        this._adapter.getCellStyle({ rowIndex, columnIndex });

    getCellConfig = (cell: Cell): ICellConfig | null => this.getCellAt(cell)?.config ?? null;

    getCellPluginConfig = <K extends keyof ICellPluginsConfig>(cell: Cell, key: K): ICellPluginsConfig[K] | null =>
        this.pluginConfigManager.getPluginConfig(cell.coordinates.rowIndex, cell.coordinates.columnIndex, key) ?? null;

    // ─── Cell data ────────────────────────────────────────────────────────────

    getCellAt = (cell: Cell): ICell | null =>
        SparseMatrixHelper.getCell(this.dataMatrix, cell.coordinates.rowIndex, cell.coordinates.columnIndex);

    setCells = (data: Map<RowIndex, Map<ColumnIndex, ICell>>, offset?: { x: ColumnIndex; y: RowIndex }): void => {
        const ox = offset?.x ?? 0;
        const oy = offset?.y ?? 0;

        const writableData = new Map<RowIndex, Map<ColumnIndex, ICell>>();
        for (const [relRow, row] of data) {
            const absRow = oy + relRow;
            for (const [relCol, cell] of row) {
                const absCol = ox + relCol;
                if (SparseMatrixHelper.getCell(this.dataMatrix, absRow, absCol)?.config?.readonly) continue;
                if (!writableData.has(absRow)) writableData.set(absRow, new Map());
                writableData.get(absRow)!.set(absCol, cell);
            }
        }

        if (!writableData.size) return;

        this._adapter.transaction().setCells(writableData).commit();
    };

    clearCell = (cell: Cell): void => {
        if (this.getCellAt(cell)?.config?.readonly) return;
        this._adapter.transaction().deleteCell(cell.coordinates.rowIndex, cell.coordinates.columnIndex).commit(false);
    };

    // ── Fill handle event handlers ───────────────────────────────────────────

    onFillHandleMouseDown = (e: { cell: ObjectIndexes }): void =>
        this.dispatch({ type: 'FILL_HANDLE_MOUSE_DOWN', payload: { cell: e.cell } }, { skipHistory: true });

    onFillHandleMouseMove = (e: { cell: ObjectIndexes }): void =>
        this.dispatch({ type: 'FILL_HANDLE_MOUSE_MOVE', payload: { cell: e.cell } }, { skipHistory: true });

    onFillHandleMouseUp = (e: { cell: ObjectIndexes }): void =>
        this.dispatch({ type: 'FILL_HANDLE_MOUSE_UP', payload: { cell: e.cell } }, { skipHistory: true });

    // ─── Viewport ─────────────────────────────────────────────────────────────

    getVisibleRanges = (): IVisibleRanges | null => this.tableAPIRef.current?.getVisibleRanges?.() ?? null;

    isCellVisible = (rowIndex: number, columnIndex: number): boolean => {
        const ranges = this.getVisibleRanges();
        if (!ranges) return false;
        const { combined } = ranges;
        return (
            rowIndex >= combined.minRowIndex &&
            rowIndex <= combined.maxRowIndex &&
            columnIndex >= combined.minColumnIndex &&
            columnIndex <= combined.maxColumnIndex
        );
    };

    // ─── Resize handlers ─────────────────────────────────────────────────────

    onColumnsResize = (columns: Map<number, number>): void => {
        this._adapter.transaction().resizeColumns(columns).commit();
    };

    onRowExpandResize = (row: number): void => {
        (this._adapter.getPlugin(PLUGIN_METADATA_KEY) as PluginMetadata | undefined)?.autoFitRows([row]);
    };

    onColumnExpandResize = (column: number): void => {
        (this._adapter.getPlugin(PLUGIN_METADATA_KEY) as PluginMetadata | undefined)?.autoFitColumns([column]);
    };

    onRowResize = (rows: Map<number, number>): void => {
        this._adapter.transaction().resizeRows(rows).commit();
    };

    // ─── INSERT / DELETE строк и колонок ─────────────────────────────────────

    private _computeShouldShiftRows(_from: number): boolean {
        const mm = this.metadataManager;
        const overrides = mm.getRowsOverrides();
        const collapsedRows = Object.keys(overrides)
            .map(Number)
            .filter((idx) => overrides[idx]?.height === 0);

        if (collapsedRows.length === 0) return true;

        const cursorState = this._adapter.getPluginState(PLUGIN_CURSOR_CELL_KEY) as any;
        const clickedRow = cursorState?.ranges?.[0]?.cursor?.coordinates.rowIndex;

        if (clickedRow !== undefined) {
            const maxCollapsedRow = Math.max(...collapsedRows);
            if (clickedRow > maxCollapsedRow) return false;
        }

        return true;
    }

    private _computeShouldShiftColumns(_from: number): boolean {
        const mm = this.metadataManager;
        const overrides = mm.getColumnsOverrides();
        const collapsedCols = Object.keys(overrides)
            .map(Number)
            .filter((idx) => overrides[idx]?.width === 0);

        if (collapsedCols.length === 0) return true;

        const cursorState = this._adapter.getPluginState(PLUGIN_CURSOR_CELL_KEY) as any;
        const clickedCol = cursorState?.ranges?.[0]?.cursor?.coordinates.columnIndex;

        if (clickedCol !== undefined) {
            const maxCollapsedCol = Math.max(...collapsedCols);
            if (clickedCol > maxCollapsedCol) return false;
        }

        return true;
    }

    onRowInsert = (index: number, position: 'before' | 'after', count = 1): void => {
        const from = position === 'before' ? index : index + 1;
        const shouldShift = this._computeShouldShiftRows(from);
        this._adapter.transaction().insertRows(from, count, shouldShift).commit();
    };

    onRowDelete = (index: number, count = 1): void => {
        this._adapter.transaction().deleteRows(index, count).commit();
    };

    onColumnInsert = (index: number, position: 'before' | 'after', count = 1): void => {
        const from = position === 'before' ? index : index + 1;
        const shouldShift = this._computeShouldShiftColumns(from);
        this._adapter.transaction().insertColumns(from, count, shouldShift).commit();
    };

    onColumnDelete = (index: number, count = 1): void => {
        this._adapter.transaction().deleteColumns(index, count).commit();
    };

    onColumnsAutoFit = (columns: number[] = []): void => {
        (this._adapter.getPlugin(PLUGIN_METADATA_KEY) as PluginMetadata | undefined)?.autoFitColumns(columns);
    };

    onRowsAutoFit = (rows: number[] = []): void => {
        (this._adapter.getPlugin(PLUGIN_METADATA_KEY) as PluginMetadata | undefined)?.autoFitRows(rows);
    };

    onZooming = (zoom: number): void => {
        this._zoomDebouncer.cancel();
        this._zoomDebouncer.debounce(() => this.dispatch({ type: 'ZOOM_SET', payload: zoom }, { skipHistory: true }), 16);
    };

    onViewportChange = (): void => {};

    onScroll = (_d: any): void => {};

    toggleGroup = (id: string, type: 'row' | 'column'): void =>
        this.dispatch({ type: 'GROUP_TOGGLE', payload: { id, groupType: type } });

    // ─── TableAdapter event handlers ──────────────────────────────────────────

    onCellEnter = (event: any): void => {
        this.dispatch({ type: 'CELL_ENTER', payload: { cell: event.cell } }, { skipHistory: true });
    };

    onMouseDown = (event: any): void => {
        if (!event.cell) return;
        this.dispatch(
            {
                type: 'CELL_MOUSE_DOWN',
                payload: {
                    cell: event.cell,
                    ctrlKey: !!event.ctrlKey,
                    metaKey: !!event.metaKey,
                    shiftKey: !!event.shiftKey,
                },
            },
            { skipHistory: true },
        );
    };

    onClick = (_e: any): void => {};

    onDblClick = (event: any): void => {
        this.dispatch({ type: 'CELL_DBL_CLICK', payload: { cell: event.cell } }, { skipHistory: true });
    };

    onMouseUp = (_e: any): void => this.dispatch({ type: 'CELL_MOUSE_UP' }, { skipHistory: true });

    onCellLeave = (_e: any): void => {};

    onRootMouseDown = (_e: any): void => this.dispatch({ type: 'ROOT_MOUSE_DOWN' }, { skipHistory: true });

    onRootMouseUp = (_e: any): void => {};

    onRowsHeaderCellClick = (_e: any): void => {};

    onColumnsHeaderCellClick = (_e: any): void => {};

    onRowsHeaderCellLeave = (_e: any, _i: number): void => {};

    onColumnsHeaderCellLeave = (_e: any, _i: number): void => {};

    onRowsHeaderCellMouseDown = (e: any): void =>
        this.dispatch(
            {
                type: 'ROW_HEADER_MOUSE_DOWN',
                payload: { cell: e.cell, ctrlKey: !!e.ctrlKey, metaKey: !!e.metaKey, shiftKey: !!e.shiftKey },
            },
            { skipHistory: true },
        );

    onRowsHeaderCellEnter = (_e: any, rowIndex: number): void =>
        this.dispatch({ type: 'ROW_HEADER_CELL_ENTER', payload: { rowIndex } }, { skipHistory: true });

    onRowsHeaderCellMouseUp = (_e: any): void => this.dispatch({ type: 'ROW_HEADER_MOUSE_UP' }, { skipHistory: true });

    onColumnsHeaderCellMouseDown = (e: any): void =>
        this.dispatch(
            {
                type: 'COL_HEADER_MOUSE_DOWN',
                payload: { cell: e.cell, ctrlKey: !!e.ctrlKey, metaKey: !!e.metaKey, shiftKey: !!e.shiftKey },
            },
            { skipHistory: true },
        );

    onColumnsHeaderCellEnter = (_e: any, columnIndex: number): void =>
        this.dispatch({ type: 'COL_HEADER_CELL_ENTER', payload: { columnIndex } }, { skipHistory: true });

    onColumnsHeaderCellMouseUp = (_e: any): void => this.dispatch({ type: 'COL_HEADER_MOUSE_UP' }, { skipHistory: true });

    // ─── Context menu ─────────────────────────────────────────────────────────

    /**
     * onContextMenu — только диспатчит CONTEXT_MENU.
     * Отображение меню полностью управляется PluginContextMenu (plugin.render()).
     */
    onContextMenu = (event: { cell: ObjectIndexes; clientX: number; clientY: number }): void => {
        if (event.cell.columnIndex === -1 && event.cell.rowIndex === -1) return;
        this.dispatch(
            {
                type: 'CONTEXT_MENU',
                payload: { cell: new Cell(event.cell), x: event.clientX, y: event.clientY },
            },
            { skipHistory: true },
        );
    };

    // ─── Keyboard ─────────────────────────────────────────────────────────────

    onKeyDown = (event: React.KeyboardEvent): void => {
        // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z обрабатываются в PluginHistory через ON_KEY_DOWN.
        this.dispatch({ type: 'ON_KEY_DOWN', payload: { event } }, { skipHistory: true });
    };

    onKeyUp = (event: React.KeyboardEvent): void => {
        this.dispatch({ type: 'ON_KEY_UP', payload: { event } }, { skipHistory: true });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render() {
        const { id, className, style, themeOverride, tableAdapter: TableAdapter } = this.props;

        const portals = this.state.mounted
            ? Object.entries(this.plugins).map(([name, entry]) =>
                  entry.rootId ? (
                      <Suspense key={name}>
                          <Portal rootId={entry.rootId}>{entry.component.render?.()}</Portal>
                      </Suspense>
                  ) : null,
              )
            : null;

        const pluginProps = this._adapter.getTableAdapterProps();

        const { width, height } = this.props;
        const tableWidth = width ?? this.state.containerWidth;
        const tableHeight = height ?? this.state.containerHeight;

        const rowsMetadata = this.metadataManager.getRowsView();
        const columnsMetadata = this.metadataManager.getColumnsView();
        const rowsAmount = this.metadataManager.getRowsCount();
        const columnsAmount = this.metadataManager.getColumnsCount();

        return (
            <>
                {portals}
                <div
                    ref={this.resizeElement}
                    id={id ?? DEFAULT_SPREAD_SHEET_ID}
                    className={className}
                    style={{ width: '100%', height: '100%', flexShrink: '0', ...style }}
                >
                    {/** @ts-expect-error */}
                    <TableAdapter
                        {...pluginProps}
                        rowsAmount={rowsAmount}
                        columnsAmount={columnsAmount}
                        rowsMetadata={rowsMetadata}
                        columnsMetadata={columnsMetadata}
                        getCellDisplayValue={this.getCellDisplayValue}
                        getCellComponents={this.getCellComponents}
                        getCellStyle={this.getCellStyle}
                        getCellPluginConfig={this.getCellPluginConfig}
                        hasColumnsHeader
                        hasRowsHeader
                        width={tableWidth}
                        height={tableHeight}
                        lastupdate={this.state.lastUpdate}
                        tableAPIRef={this.tableAPIRef}
                        themeOverride={themeOverride}
                        onViewportChange={this.onViewportChange}
                        onKeyUp={this.onKeyUp}
                        onKeyDown={this.onKeyDown}
                        onClick={this.onClick}
                        onDblClick={this.onDblClick}
                        onMouseDown={this.onMouseDown}
                        onMouseUp={this.onMouseUp}
                        onCellEnter={this.onCellEnter}
                        onCellLeave={this.onCellLeave}
                        onContextMenu={this.onContextMenu}
                        onRootMouseDown={this.onRootMouseDown}
                        onRootMouseUp={this.onRootMouseUp}
                        onRowsHeaderCellEnter={this.onRowsHeaderCellEnter}
                        onRowsHeaderCellMouseDown={this.onRowsHeaderCellMouseDown}
                        onRowsHeaderCellClick={this.onRowsHeaderCellClick}
                        onRowsHeaderCellMouseUp={this.onRowsHeaderCellMouseUp}
                        onRowsHeaderCellLeave={this.onRowsHeaderCellLeave}
                        onColumnsHeaderCellEnter={this.onColumnsHeaderCellEnter}
                        onColumnsHeaderCellMouseDown={this.onColumnsHeaderCellMouseDown}
                        onColumnsHeaderCellClick={this.onColumnsHeaderCellClick}
                        onColumnsHeaderCellMouseUp={this.onColumnsHeaderCellMouseUp}
                        onColumnsHeaderCellLeave={this.onColumnsHeaderCellLeave}
                        onFillHandleMouseDown={this.onFillHandleMouseDown}
                        onFillHandleMouseMove={this.onFillHandleMouseMove}
                        onFillHandleMouseUp={this.onFillHandleMouseUp}
                        onRowsResize={this.onRowResize}
                        onColumnsResize={this.onColumnsResize}
                        onRowExpandResize={this.onRowExpandResize}
                        onColumnExpandResize={this.onColumnExpandResize}
                        onColumnsAutoFit={this.onColumnsAutoFit}
                        onRowsAutoFit={this.onRowsAutoFit}
                        onScroll={this.onScroll}
                        onZooming={this.onZooming}
                        onToggleGroup={this.toggleGroup}
                    />
                </div>
            </>
        );
    }
}
