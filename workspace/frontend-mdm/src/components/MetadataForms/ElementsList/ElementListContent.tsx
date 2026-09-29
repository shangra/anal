import { Component, type ReactNode } from 'react';
import { attachListSettingsRevision, applySortToRows, getActiveListView } from '../../../helpers/listSettings';
import {
    createSelectedEntitySubscriber,
    getSelectedEntity,
    subscribeSelectedEntity,
    unsubscribeSelectedEntity,
    type SelectedEntityData,
} from '../../../helpers/selected-entity.helper';
import HooksManager from '../../../helpers/lite-react-hooks';
import { createEditForm } from '../Buttons/Edit/edit.helper';
import $windows from '../../ui/windows.helper';
import { HookKeyManager } from './utils/HookKeyManager';
import {
    handleTableSelection,
    selectAllRows,
    type SelectionState,
} from './ReactWindowWrapperCombined/utils/tableSelectionHelper';
import { tableNavigation } from './ReactWindowWrapperCombined/utils/tableNavigation';
import { ReactWindowWrapper } from './ReactWindowWrapperCombined';
import { transformRowsForHook } from './ReactWindowWrapperCombined/utils/transformRowsForHook';
import { DataTable } from './ReactWindowWrapperCombined/DataTable';
import { updateColumnSortState } from './utils/tableSort.utils';
import type DataManager from '../DataManager';
import { MetaInput } from '../MetaInput';
import { TableShell } from './components/TableShell';
import type { CellInteractionPayload, CellRenderMetadata } from './ReactWindowWrapperCombined/types';
import {
    ELEMENT_LIST_SUBSCRIBER,
    LISTS_ENTITY_TITLE,
    RELOAD_LOCAL_KEY,
    ROOT_PARENT_UUID,
    ROW_ID_FIELD_NAME,
} from './constants';
import type {
    IActiveCell,
    ICell,
    IColumnConfig,
    IData,
    IDataColumn,
    IElementsListProps,
    IElementsListState,
    ITableState,
} from './types';
import { applyColumnConfigToCols, getTableConfigKey, loadColumnConfig, saveColumnConfig } from './utils/columnConfig';
import { updateCellValueInTableData } from './utils/cellEdit';
import { toDataTableViewModel, toReactWindowTableData } from './utils/tableViewAdapters';
import { transformStateForRender } from './utils/transformStateForRender';

export class ElementsListContent extends Component<IElementsListProps, IElementsListState> {
    dataManager: DataManager;

    formId: string;

    stateKey: string;

    reloadWithPaginationResetKey: string;

    reloadWithoutPaginationResetKey: string;

    reloadLocalKey: string;

    constructor(props: Readonly<IElementsListProps>) {
        super(props);

        this.dataManager = props.DataManager;
        this.dataManager.hookChangeFieldData(props.name ?? 'list', this);
        if (props.name && props.name !== 'list') {
            this.dataManager.hookChangeFieldData('list', this);
        }
        this.formId = this.dataManager.formId;
        this.stateKey = this.dataManager.modalUUID ?? 'list';
        this.reloadWithPaginationResetKey = `${this.dataManager.modalUUID}__reload_with_pagination_reset`;
        this.reloadWithoutPaginationResetKey = `${this.dataManager.modalUUID}__reload_without_pagination_reset`;
        this.reloadLocalKey = RELOAD_LOCAL_KEY;

        this.state = {
            data: null,
            table: null,
            hierarchyHistory: [ROOT_PARENT_UUID],
            infiniteScroll: {
                limit: this.dataManager.options.limit ?? 200,
                offset: this.dataManager.options.offset ?? 0,
                pages: this.dataManager.pages ?? 0,
                currentPage: 1,
            },
            selectRows: [],
            lastSelectedRow: null,
            rowIndexToId: {},
            loading: true,
            editableCell: null,
            listSettingsRevision: 0,
            selectedEntity: getSelectedEntity(),
            originalOrder: null as Record<number, string> | null,
        };
    }

    private detachListSettingsRevision: (() => void) | null = null;

    componentDidMount(): void {
        this.detachListSettingsRevision = attachListSettingsRevision(this, ELEMENT_LIST_SUBSCRIBER);

        HooksManager.subscribeHook({
            [this.reloadWithPaginationResetKey]: {
                [this.reloadLocalKey]: () => this.handleReload(true),
            },
        });
        HooksManager.subscribeHook({
            [this.reloadWithoutPaginationResetKey]: {
                [this.reloadLocalKey]: this.handleReload,
            },
        });
    }

    componentWillUnmount(): void {
        this.detachListSettingsRevision?.();
        HooksManager.unsubscribeHook({
            [this.reloadWithPaginationResetKey]: [this.reloadLocalKey],
        });
        HooksManager.unsubscribeHook({
            [this.reloadWithoutPaginationResetKey]: [this.reloadLocalKey],
        });
    }

    componentDidUpdate(prevProps: IElementsListProps, prevState: IElementsListState): void {
        if (prevState.listSettingsRevision !== this.state.listSettingsRevision) {
            if (this.state.data && this.state.table && this.state.originalOrder) {
                const view = getActiveListView();

                // Если сортировка пуста, восстанавливаем исходный порядок
                if (view.activeSortRules.length === 0) {
                    const sortedRows = this.restoreOriginalOrder(this.state.data.rows);

                    const transformed = this.transformStateForRenderProps({
                        ...this.state.data,
                        rows: sortedRows,
                    });

                    this.setState((prev) => {
                        if (!prev.table || !prev.data) return null;
                        return {
                            table: {
                                ...prev.table,
                                cols: this.applySavedColumnWidths(transformed.cols),
                                columnsCount: transformed.cols.length,
                                data: transformed.data,
                                rowCount: transformed.data.length,
                            },
                            data: { ...prev.data, rows: sortedRows },
                        };
                    });
                    return;
                }

                // Применяем сортировку
                const rows = this.state.data.rows as Record<string, unknown>[];
                const sortedRows = applySortToRows(rows, view);

                // Update table data with sorted rows
                const transformed = this.transformStateForRenderProps({
                    ...this.state.data,
                    rows: sortedRows,
                });

                this.setState((prev) => {
                    if (!prev.table || !prev.data) return null;
                    return {
                        table: {
                            ...prev.table,
                            cols: this.applySavedColumnWidths(transformed.cols),
                            columnsCount: transformed.cols.length,
                            data: transformed.data,
                            rowCount: transformed.data.length,
                        },
                        data: { ...prev.data, rows: sortedRows },
                    };
                });
            }
        }
    }

    private restoreOriginalOrder(rows: Record<string, unknown>[]): Record<string, unknown>[] {
        if (!this.state.originalOrder) return rows;
        const idToRow = new Map<string, Record<string, unknown>>();
        rows.forEach((row) => {
            const id = (row.id as string) ?? String(row);
            idToRow.set(id, row);
        });

        const ordered: Record<string, unknown>[] = [];
        for (const key of Object.keys(this.state.originalOrder)
            .map(Number)
            .sort((a, b) => a - b)) {
            const id = this.state.originalOrder![key];
            const row = idToRow.get(id);
            if (row) {
                ordered.push(row);
            }
        }

        return ordered;
    }

    changeMasterData(list: Record<string, unknown>[]): void {
        if (!Array.isArray(list)) return;

        const costil: IData = {
            cols: [...((this.dataManager.meta.list?.cols as IData['cols']) ?? [])],
            refs: { ...(this.dataManager.meta.list?.refs ?? {}) },
            rows: [...list],
            count: this.dataManager.meta.list?.count ?? list.length,
        };

        // Сохраняем исходный порядок до сортировки
        const originalOrder: Record<number, string> = {};
        costil.rows.forEach((row, index) => {
            const id = (row.id as string) ?? `row-${index}`;
            originalOrder[index] = id;
        });

        // Apply sort from list settings
        const view = getActiveListView();
        const sortedRows = applySortToRows(list, view);

        this.setState({ loading: true }, () => {
            this.initializeState({ ...costil, rows: sortedRows }, originalOrder);
            this.setState((prev) => ({
                infiniteScroll: {
                    ...prev.infiniteScroll,
                    pages: this.dataManager.pages ?? 1,
                },
            }));
        });
    }

    initializeState = (data: IData, originalOrder?: Record<number, string>): void => {
        if (Object.keys(data).length === 0) {
            this.setState({ data: null, table: null, loading: false, originalOrder: null });
            return;
        }

        const savedConfig = loadColumnConfig(
            getTableConfigKey(this.formId, this.props.name),
            this.props.mergedColumns,
            Boolean(this.getHierarchyFlag()),
        );

        const tableData = this.transformStateForRenderProps(data);
        let colsWithSort = applyColumnConfigToCols(
            tableData.cols,
            savedConfig,
            Boolean(this.getHierarchyFlag()),
        );

        if (this.dataManager.currentSort) {
            colsWithSort = updateColumnSortState(
                colsWithSort,
                this.dataManager.currentSort.column,
                this.dataManager.currentSort.direction,
            );
        }

        this.setState(
            {
                data,
                table: {
                    data: tableData.data,
                    cols: colsWithSort,
                    columnsCount: tableData.cols.length,
                    rowCount: tableData.data.length,
                    activeCell: null,
                    columnConfig: savedConfig ?? undefined,
                    meta: { prevEditableCell: null },
                },
                rowIndexToId: tableData.indexToId,
                loading: false,
                originalOrder: originalOrder ?? null,
            },
            () => this.setDefaultSelection(),
        );
    };

    private publishSelection(selectedIndexes: number[]): void {
        if (!this.state.data) return;

        const selectedDataRows = selectedIndexes.map((index) => this.state.data!.rows[index]);
        this.dataManager.selectedRows = selectedDataRows;

        HooksManager.setHook(HookKeyManager.selectRows(this.stateKey, this.formId, transformRowsForHook(selectedDataRows)));
    }

    changeRow = (rowIndex: number, isMultipleSelect = false): void => {
        if (!this.state.data) return;

        let newSelectedRows: number[];
        if (isMultipleSelect) {
            const isAlreadySelected = this.state.selectRows.includes(rowIndex);
            newSelectedRows = isAlreadySelected
                ? this.state.selectRows.filter((index) => index !== rowIndex)
                : [...this.state.selectRows, rowIndex];
        } else {
            newSelectedRows = [rowIndex];
        }

        this.setState({ selectRows: newSelectedRows });
        this.publishSelection(newSelectedRows);
    };

    handleSelection = (event: React.MouseEvent, rowIndex: number): void => {
        if (!this.state.table?.data || !this.state.data) return;

        const currentState: SelectionState = {
            selectedRows: this.state.selectRows,
            lastSelectedRow: this.state.lastSelectedRow,
        };

        const newState = handleTableSelection(rowIndex, currentState, {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
        });

        this.setState({
            lastSelectedRow: newState.lastSelectedRow,
            selectRows: newState.selectedRows,
        });
        this.publishSelection(newState.selectedRows);
    };

    deselectAllRows = (): void => {
        this.setState({
            selectRows: [],
            table: this.state.table ? { ...this.state.table, activeCell: null } : null,
        });
        this.dataManager.selectedRows = [];
        HooksManager.setHook(HookKeyManager.deselectAll(this.stateKey, this.formId));
    };

    handleActiveCellChange = (activeCell: IActiveCell | null): void => {
        if (!activeCell) return;
        this.setState((prev) => ({
            table: prev.table ? { ...prev.table, activeCell } : null,
        }));
        this.changeRow(activeCell.rowIndex);
    };

    getHierarchyFlag = (): boolean => Boolean(this.dataManager?.metadata?.manifest?.settings?.hierarchical);

    transformStateForRenderProps = (data: IData) =>
        transformStateForRender({
            data,
            mergedColumns: this.props.mergedColumns,
            visibleColumnNames: this.props.columns,
            getFieldType: (fieldName) => this.dataManager.metadata.treeObject?.Fields?.[fieldName]?.type ?? '',
        });

    private applySavedColumnWidths(cols: ITableState['cols']): ITableState['cols'] {
        const savedConfig = loadColumnConfig(
            getTableConfigKey(this.formId, this.props.name),
            this.props.mergedColumns,
            Boolean(this.getHierarchyFlag()),
        );
        return applyColumnConfigToCols(cols, savedConfig, Boolean(this.getHierarchyFlag()));
    }

    fetchData = async (parentId: string): Promise<IData | undefined> => {
        const where = { ...(this.dataManager.options.where ?? {}) };
        delete where.id;
        where.parent = parentId;

        this.dataManager.options = {
            ...this.dataManager.options,
            where,
            limit: this.dataManager.options.limit ?? this.state.infiniteScroll.limit ?? 200,
            offset: 0,
            withHierarchy: true,
            order: undefined,
        };

        await this.dataManager.ReloadData();
        const listMeta = this.dataManager.meta.list;
        const listRows = Array.isArray(this.dataManager.data.list) ? this.dataManager.data.list : [];
        return {
            cols: (listMeta?.cols as IDataColumn[]) ?? this.state.data?.cols ?? [],
            refs: { ...(listMeta?.refs ?? {}) },
            rows: [...listRows],
            count: (listMeta?.count as number | undefined) ?? listRows.length,
        };
    };

    private applyHierarchyListData = (data: IData, extra?: Partial<IElementsListState>): void => {
        if (!data.rows) data.rows = [];
        const originalOrder: Record<number, string> = {};
        data.rows.forEach((row, index) => {
            originalOrder[index] = (row.id as string) ?? `row-${index}`;
        });
        const view = getActiveListView();
        data.rows = applySortToRows(data.rows, view);
        const tableData = this.transformStateForRenderProps(data);
        this.setState((prevState) => ({
            ...prevState,
            data,
            table: {
                data: tableData.data,
                cols: this.applySavedColumnWidths(tableData.cols),
                columnsCount: tableData.cols.length,
                rowCount: tableData.data.length,
                activeCell: null,
                meta: { prevEditableCell: null },
            },
            rowIndexToId: tableData.indexToId,
            selectRows: [],
            originalOrder,
            ...extra,
        }));
    };

    onHierarchyExpand = async (rowIndex: number): Promise<void> => {
        const parentId = this.state.rowIndexToId[rowIndex];
        if (!this.state.table || !parentId) return;

        this.dataManager.currentSort = null;
        const data = await this.fetchData(parentId);
        if (!data) return;
        this.applyHierarchyListData(data, {
            hierarchyHistory: [...this.state.hierarchyHistory, parentId],
        });
    };

    onHierarchyReduce = async (): Promise<void> => {
        const hierarchyHistory = [...this.state.hierarchyHistory];
        hierarchyHistory.pop();
        const prevParent = hierarchyHistory[hierarchyHistory.length - 1];
        this.dataManager.currentSort = null;

        const data = await this.fetchData(prevParent);
        if (!data) return;
        this.applyHierarchyListData(data, { hierarchyHistory });
    };

    onSort = async (columnName: string, order?: 'ASC' | 'DESC'): Promise<void> => {
        if (!this.state.table || !this.state.data) return;

        const currentCols = this.state.table.cols;
        const newOrder: 'ASC' | 'DESC' =
            order ??
            (this.dataManager.currentSort?.column === columnName && this.dataManager.currentSort?.direction === 'ASC'
                ? 'DESC'
                : 'ASC');

        this.setState((prev) => ({
            table: prev.table
                ? {
                      ...prev.table,
                      cols: updateColumnSortState(currentCols, columnName, newOrder),
                  }
                : null,
            infiniteScroll: {
                ...prev.infiniteScroll,
                currentPage: 1,
            },
        }));

        this.dataManager.currentSort = {
            column: columnName,
            direction: newOrder,
        };

        const hierarchyLength = this.state.hierarchyHistory.length;
        const hierarchyParent = hierarchyLength > 1 ? this.state.hierarchyHistory[hierarchyLength - 1] : undefined;

        const tempOptions = {
            ...this.dataManager.options,
            order: [[columnName, newOrder]],
            offset: 0,
        } as typeof this.dataManager.options;

        if (hierarchyParent && hierarchyParent !== ROOT_PARENT_UUID) {
            tempOptions.withHierarchy = true;
            tempOptions.where = {
                ...tempOptions.where,
                parent: hierarchyParent,
            };
        } else if (this.getHierarchyFlag()) {
            tempOptions.withHierarchy = true;
            tempOptions.where = {
                ...tempOptions.where,
                parent: ROOT_PARENT_UUID,
            };
        }

        this.dataManager.options = tempOptions;
        try {
            await this.dataManager.ReloadData();
        } catch (error) {
            console.error('Sorting error:', error);
            this.setState((prev) => ({
                table: prev.table ? { ...prev.table, cols: currentCols } : null,
            }));
        }
    };

    loadPage = (page: number): void => {
        if (page < 1 || this.state.loading) return;
        this.setState({ loading: true });

        const offset = (page - 1) * this.state.infiniteScroll.limit;
        this.dataManager.options = {
            ...this.dataManager.options,
            offset,
        };

        this.setState((prev) => ({
            infiniteScroll: {
                ...prev.infiniteScroll,
                offset,
                currentPage: page,
                hasPrev: page > 1,
                hasNext: page < prev.infiniteScroll.pages,
            },
        }));

        this.dataManager.ReloadData().finally(() => {
            this.setState({ loading: false });
        });
    };

    loadNext = (): void => {
        const { currentPage, pages } = this.state.infiniteScroll;
        if (currentPage < pages) this.loadPage(currentPage + 1);
    };

    loadPrev = (): void => {
        const { currentPage } = this.state.infiniteScroll;
        if (currentPage > 1) this.loadPage(currentPage - 1);
    };

    handleReload = (resetPagination = false): void => {
        this.setState({ loading: true }, () => {
            const finish = (): void => {
                this.setState({ loading: false });
            };

            if (this.getHierarchyFlag()) {
                const parentId =
                    this.state.hierarchyHistory[this.state.hierarchyHistory.length - 1] ?? ROOT_PARENT_UUID;
                void this.fetchData(parentId)
                    .then((data) => {
                        if (data) this.applyHierarchyListData(data);
                    })
                    .finally(finish);
                return;
            }

            const newOptions = {
                ...this.dataManager.options,
                limit: this.state.infiniteScroll.limit,
                offset: resetPagination ? 0 : this.dataManager.options.offset,
            };

            if (this.dataManager.currentSort) {
                newOptions.order = [[this.dataManager.currentSort.column, this.dataManager.currentSort.direction]];
            }

            this.dataManager.options = newOptions;
            void this.dataManager.ReloadData()
                .then(() => {
                    const list = Array.isArray(this.dataManager.data?.list) ? this.dataManager.data.list : [];
                    this.changeMasterData(list);
                })
                .finally(finish);
        });
    };

    handleColumnConfigChange = (newConfig: (IColumnConfig | IColumnConfig[])[]): void => {
        this.setState((prev) => ({
            table: prev.table ? { ...prev.table, columnConfig: newConfig } : null,
        }));
        saveColumnConfig(getTableConfigKey(this.formId, this.props.name), newConfig);
    };

    /** Применяет значение к состоянию списка и к данным DataManager (тот же путь, что и у MetaInput). */
    private applyListCellValue = (rowIndex: number, field: string, value: unknown): void => {
        const list = this.dataManager.data?.list;
        if (Array.isArray(list) && list[rowIndex]) {
            list[rowIndex][field] = value;
        }

        this.setState((prev) => {
            const { data, table } = prev;
            if (!data || !table || !data.rows[rowIndex]) return null;

            const rows = [...data.rows];
            rows[rowIndex] = { ...rows[rowIndex], [field]: value };

            return {
                data: { ...data, rows },
                table: {
                    ...table,
                    data: updateCellValueInTableData(table.data as (ICell | ICell[])[][], {
                        rowIndex,
                        field,
                        value,
                    }) as ITableState['data'],
                },
            };
        });
    };

    private getRowEntityId = (rowIndex: number): string => {
        const primaryKey = this.dataManager.primaryKey ?? ROW_ID_FIELD_NAME;
        const row = this.state.data?.rows?.[rowIndex] as Record<string, unknown> | undefined;
        const id = this.state.rowIndexToId[String(rowIndex)] ?? row?.[primaryKey];
        return id == null ? '' : String(id);
    };

    private showCellSaveError = (error: unknown): void => {
        const err = error as {
            message?: string;
            stack?: string;
            response?: {
                status?: number | string;
                data?: { errors?: unknown[]; message?: string };
            };
        };
        console.error('ElementsList: error while saving cell value', error);

        const responseErrors = Array.isArray(err?.response?.data?.errors) ? err?.response?.data?.errors : [];
        const message = err?.response?.data?.message ?? err?.message;
        const errors = responseErrors.length > 0 ? responseErrors : message ? [message] : [];

        this.dataManager?.showErrorModal?.(
            String(err?.response?.status ?? 'Error'),
            errors,
            err?.stack ?? '',
            'Не удалось сохранить значение ячейки',
        );
    };

    private saveListCellValue = async (
        rowIndex: number,
        field: string,
        value: string,
        elementId: string,
        previousValue: unknown
    ): Promise<void> => {
        const primaryKey = this.dataManager.primaryKey ?? ROW_ID_FIELD_NAME;
        try {
            await this.dataManager.UpdateRecords({ [primaryKey]: elementId, [field]: value });
        } catch (error) {
            this.applyListCellValue(rowIndex, field, previousValue);
            this.showCellSaveError(error);
        }
    };

    /**
     * Инлайн-правка ячейки в режиме списка: значение применяется сразу, затем отправляется
     * на сервер PUT-ом с частичным record. При ошибке значение откатывается, детали — в модалке.
     */
    handleListCellChange = (rowId: string, field: string, value: string): void => {
        const rowIndex = Number(rowId);
        if (!field || !Number.isInteger(rowIndex) || rowIndex < 0) return;

        const previousValue = this.state.data?.rows?.[rowIndex]?.[field];
        const elementId = this.getRowEntityId(rowIndex);

        this.applyListCellValue(rowIndex, field, value);

        if (!elementId) {
            this.applyListCellValue(rowIndex, field, previousValue);
            console.warn(`ElementsList: не определён id строки ${rowIndex}, изменение не сохранено`);
        } else {
            void this.saveListCellValue(rowIndex, field, value, elementId, previousValue);
        }
    };

    openEditForm = (): void => {
        try {
            const formConfig = createEditForm(this.dataManager);
            $windows.open(formConfig.title, formConfig.content, formConfig.options);
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    };

    handleDoubleClick = (): void => this.openEditForm();

    handleEnterKeydown = (): void => {
        if (!this.dataManager?.selectedRows?.length) {
            console.warn('No rows selected for editing');
            return;
        }
        this.openEditForm();
    };

    renderCellContent = (cellData: ICell | ICell[], _metadata: CellRenderMetadata): ReactNode => {
        const cell = Array.isArray(cellData) ? cellData[0] : cellData;
        if (!cell) return null;

        const { columnName, rowIndex } = cell;
        const cellKey = `${rowIndex}-${columnName}`;
        const isEditable = this.state.editableCell === cellKey;

        return (
            <MetaInput
                DataManager={this.dataManager}
                field={`list.${rowIndex}.${columnName}`}
                readOnly={!isEditable}
                table
                fullWidth
                border={false}
                onChange={() => {}}
            />
        );
    };

    handleCellClick = (event: React.MouseEvent, payload: CellInteractionPayload): void => {
        if (!this.state.table) return;

        const row = this.state.table.data[payload.rowIndex] as (ICell | ICell[])[] | undefined;
        const cellOrGroup = row?.[payload.columnIndex];
        const cell = Array.isArray(cellOrGroup)
            ? cellOrGroup[payload.colInGroupIndex ?? 0]
            : cellOrGroup;
        const columnName = cell && 'columnName' in cell ? String(cell.columnName) : '';
        const currentClickCellKey = `${payload.rowIndex}-${columnName}`;

        if (this.state.editableCell === currentClickCellKey) {
            return;
        }

        this.setState((prev) => ({
            table: prev.table
                ? {
                      ...prev.table,
                      activeCell: {
                          rowIndex: payload.rowIndex,
                          columnIndex: payload.columnIndex,
                          sourceEvent: { type: 'mouse' },
                      },
                  }
                : null,
            editableCell: null,
        }));
        this.changeRow(payload.rowIndex);
        this.handleSelection(event, payload.rowIndex);
    };

    handleKeyDown = (event: React.KeyboardEvent, _cellData: ICell | ICell[] | null): void => {
        if (!this.state.table) return;

        const { data, cols, rowCount, columnsCount, activeCell } = this.state.table;
        if (!activeCell) return;

        if (event.code === 'Enter') {
            this.handleEnterKeydown();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            const rowIndex = [
                ...new Set(
                    data
                        .flat()
                        .map((cell) =>
                            Array.isArray(cell) ? cell[0]?.rowIndex : 'rowIndex' in cell ? cell.rowIndex : undefined,
                        )
                        .filter((x): x is number => x != null),
                ),
            ];

            const newSelectionState = selectAllRows(rowIndex);
            this.setState({
                lastSelectedRow: newSelectionState.lastSelectedRow,
                selectRows: newSelectionState.selectedRows,
            });
            this.publishSelection(rowIndex);
            return;
        }

        if (event.code === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (event.code === 'Tab') {
            event.preventDefault();
            const flatData = data.flat();
            const newActiveCell = tableNavigation.getNextCell(
                activeCell,
                rowCount,
                columnsCount,
                flatData,
                cols,
            );

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: {
                    type: 'keyboard',
                    direction: event.shiftKey ? 'left' : 'right',
                },
            });
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
            const direction = event.code.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';

            const newActiveCell = tableNavigation.getCellByDirection(
                activeCell,
                direction,
                rowCount,
                columnsCount,
                data.flat(),
            );

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: { type: 'keyboard', direction },
            });
        }
    };

    setDefaultSelection = (): void => {
        const { table } = this.state;
        if (!table || table.data.length === 0 || table.cols.length === 0) return;

        this.setState({
            table: {
                ...table,
                activeCell: { rowIndex: 0, columnIndex: 0 },
            },
        });
        this.changeRow(0);
    };

    private getSelectedEntityFromStore(): SelectedEntityData {
        return getSelectedEntity();
    }

    private getShellProps() {
        const { DataManager: _dm, ...propsWithoutDataManager } = this.props;
        return {
            logName: 'MetadadaForms_ElementsList_ElementsListContent',
            logProps: propsWithoutDataManager,
            logState: this.state,
        };
    }

    private renderFlatTable(table: ITableState): ReactNode {
        const { currentPage, pages } = this.state.infiniteScroll;
        const data = toReactWindowTableData(table.data as (ICell | ICell[])[][]);

        return (
            <TableShell {...this.getShellProps()}>
                <ReactWindowWrapper
                    cols={table.cols}
                    data={data}
                    activeCell={table.activeCell}
                    renderMetaInput={this.renderCellContent}
                    onKeyDown={this.handleKeyDown}
                    hasExpendedHierarchy={this.state.hierarchyHistory.length > 1}
                    onHierarchyExpand={this.onHierarchyExpand}
                    onHierarchyBack={this.onHierarchyReduce}
                    onSort={(columnName, order) => {
                        void this.onSort(columnName, order);
                    }}
                    onFilter={() => {}}
                    onColumnConfigChange={this.handleColumnConfigChange}
                    onCellClick={this.handleCellClick}
                    onDoubleClick={() => this.handleDoubleClick()}
                    selectedRows={this.state.selectRows}
                    hierarchy={this.getHierarchyFlag()}
                    isLoadingMore={this.state.loading}
                    loadNext={this.loadNext}
                    loadPrev={this.loadPrev}
                    hasPrev={currentPage > 1}
                    hasNext={currentPage < pages}
                    width={this.props.width}
                    height={this.props.height}
                />
            </TableShell>
        );
    }

    private renderListTable(table: ITableState): ReactNode {
        const { data: tableData } = toDataTableViewModel({
            rows: table.data as (ICell | ICell[])[][],
            cols: table.cols,
        });

        return (
            <TableShell {...this.getShellProps()}>
                <DataTable
                    data={tableData}
                    columns={table.cols as any}
                    onCellChange={this.handleListCellChange}
                />
            </TableShell>
        );
    }

    render(): ReactNode {
        const { table, listSettingsRevision } = this.state;
        void listSettingsRevision;
        if (!table) return null;

        return this.renderFlatTable(table);
    }
}
