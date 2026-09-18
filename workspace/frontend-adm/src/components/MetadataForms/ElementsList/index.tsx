import { Component, ReactNode } from 'react';
import { MetadataAPI } from 'components/Metadata/MetadataAPI';
import { IActiveCell, ICell, IColumn, IColumnConfig, IMergedColumns } from 'components/MetadataForms/ElementsList/types';
import HooksManager from 'helpers/lite-react-hooks';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { createEditForm } from 'components/MetadataForms/Buttons/Edit/edit.helper';
import $windows from 'components/WindowsCMP/windows.helper';
import { HookKeyManager } from 'components/MetadataForms/ElementsList/utils/HookKeyManager';
import { IColumnData } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types';
import {
    handleTableSelection,
    selectAllRows,
    SelectionState,
} from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/tableSelectionHelper';
import { tableNavigation } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/tableNavigation';
import { ReactWindowWrapper } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined';
import { transformRowsForHook } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/transformRowsForHook';
import { updateColumnSortState } from 'components/MetadataForms/ElementsList/utils/tableSort.utils';
import { DataManager } from 'components/MetadataForms/DataManager';
import { MetaInput } from 'components/MetadataForms/MetaInput';

interface IDataColumn {
    field: string;
    type: string;
    name: string;
    description: string;
    len?: number;
    hasSorting?: boolean;
    show?: boolean;
}

interface IData {
    rows: Record<string, string>[];
    cols: IDataColumn[];
    refs: Record<string, Record<string, string>>;
    count: 4;
}

interface ICoords {
    rowIndex: number;
    columnIndex: number;
}

interface IElementsListProps {
    data: IData;
    tableId: string;
    width: number;
    height: number;
    /**
     * Список колонок с их названиями (description).
     * Сделано так, потому что конструктор форм не готов.
     */
    columns?: string[];
    DataManager: DataManager;
    name: string;
    mergedColumns?: IMergedColumns;
    server?: string;
}

interface IRow {
    [key: string]: any;
}
interface IElementsListState {
    data: IData | null;
    table: {
        rowsCount: number;
        columnsCount: number;
        data: (ICell | ICell[])[];
        cols: (IColumnData | IColumnData[])[];
        activeCell: IActiveCell | null;
        meta: {
            prevEditableCell: { rowIndex: number; columnIndex: number } | null;
        };
    } | null;
    hierarchyHistory: string[];
    infinateScroll: {
        limit: number;
        offset: number;
        pages: number;
        currentPage: number;
    };
    lastSelectedRow: number | null;
    selectRows: any[];
    loading: boolean;
    editableCell: string | null;
    rowIndexToId: Record<string, string>;
}

const rootParentUUID = '00000000-0000-0000-0000-000000000000';

class ElementsListContent extends Component<IElementsListProps, IElementsListState> {
    metadataAPI: MetadataAPI;

    dataManager: DataManager;

    formId: string;

    stateKey: string;

    reloadWithPaginationResetKey: string;

    reloadWithoutPaginationResetKey: string;

    reloadLocalKey: string;

    constructor(props: Readonly<IElementsListProps>) {
        super(props);

        // server — обязательный параметр MetadataAPI; '' — fallback (default backend).
        // Открытые ранее списки не перерендериваются при смене сервера в дереве — см. SRDMDLTKLN-525.
        this.metadataAPI = new MetadataAPI(props.server ?? '');
        this.dataManager = this.props.DataManager;

        this.dataManager.hookChangeFieldData(props.name ?? 'list', this);
        this.formId = this.dataManager.formId;
        this.stateKey = this.props?.DataManager.modalUUID ?? 'list';
        this.reloadWithPaginationResetKey = `${this.props?.DataManager.modalUUID}__reload_with_pagination_reset`;
        this.reloadWithoutPaginationResetKey = `${this.props?.DataManager.modalUUID}__reload_without_pagination_reset`;
        this.reloadLocalKey = 'reloadElementsList';
        this.state = {
            data: null,
            table: null,
            hierarchyHistory: [rootParentUUID],
            infinateScroll: {
                limit: this.dataManager.options.limit! ?? 200,
                offset: this.dataManager.options.offset ?? 0,
                pages: this.dataManager.pages ?? 0,
                currentPage: 1,
            },
            selectRows: [],
            lastSelectedRow: null,
            rowIndexToId: {},
            loading: true,
            editableCell: null,
        };
    }

    componentDidMount() {
        if (this.dataManager.currentSort && this.state.table) {
            this.setState((prev) => ({
                table: {
                    ...prev.table!,
                    cols: prev.table!.cols.map((col) => {
                        console.log('col', col);
                        return {
                            ...col,
                            data: Array.isArray(col)
                                ? col.map((subColumn) => ({
                                      ...subColumn,
                                      order:
                                          subColumn.name === this.dataManager?.currentSort?.column
                                              ? this.dataManager.currentSort.direction
                                              : null,
                                  }))
                                : {
                                      ...col,
                                      order:
                                          col.name === this.dataManager?.currentSort?.column
                                              ? this.dataManager.currentSort.direction
                                              : null,
                                  },
                        };
                    }),
                },
            }));
        }

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

    componentWillUnmount() {
        HooksManager.unsubscribeHook({
            [this.reloadWithPaginationResetKey]: [this.reloadLocalKey],
        });
        HooksManager.unsubscribeHook({
            [this.reloadWithoutPaginationResetKey]: [this.reloadLocalKey],
        });

        localStorage.removeItem(this.getTableConfigKey());
    }

    changeMasterData(list: any[]) {
        // TODO - это полная ахинея!!! Зачем вам ts, если вы сами не соблюдаете стандарты!!!!
        // Сейчас делаю костыль, но changeMasterData - это изменение именно данных, а не метаданных,
        // метаданные останутся прежними при сортировках, фильтрах и прочем
        if (!Array.isArray(list)) {
            return;
        }

        const costil: IData = {
            // @ts-ignore
            cols: [...this.dataManager.meta.list.cols],
            // @ts-ignore
            refs: { ...this.dataManager.meta.list.refs },
            // @ts-ignore
            rows: [...list],
            // @ts-ignore
            count: this.dataManager.meta.list.count,
        };

        this.setState({ loading: true }, () => {
            this.initializeState(costil);
            this.setState({
                infinateScroll: {
                    ...this.state.infinateScroll,
                    pages: this.dataManager.pages ?? 1,
                },
            });
        });
    }

    initializeState = (data: IData) => {
        const isDisabled = Object.keys(data).length === 0;
        if (isDisabled) {
            this.setState({
                data: null,
                table: null,
                loading: false,
            });
            return;
        }

        const savedConfig = this.loadColumnConfig();

        const tableData = this.transformStateForRenderProps(data, savedConfig);

        // Восстанавливаем состояние сортировки после перезагрузки
        let colsWithSort = tableData.cols;
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
                    data: tableData.data as ICell[][],
                    cols: colsWithSort,
                    columnsCount: tableData.cols.length,
                    rowsCount: tableData.data.length,
                    activeCell: null,
                    meta: {
                        prevEditableCell: null,
                    },
                },
                rowIndexToId: tableData.indexToId,
                loading: false,
            },
            () => this.setDefaultSellection(),
        );
    };

    loadColumnConfig = (): (IColumnConfig | IColumnConfig[])[] | null => {
        const saved = localStorage.getItem(this.getTableConfigKey());
        if (!saved) return null;

        try {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed) && parsed.every((item) => !Array.isArray(item))) {
                return this.normalizeFlatConfig(parsed);
            }

            return parsed;
        } catch (e) {
            console.error('Failed to parse column config', e);
            return null;
        }
    };

    normalizeFlatConfig = (flatConfig: IColumnConfig[]): (IColumnConfig | IColumnConfig[])[] => {
        const result: (IColumnConfig | IColumnConfig[])[] = [];
        const mergedColumns = this.props.mergedColumns || {};
        let configIndex = 0;

        if (this.getHierarchyFlag()) result.push([{ width: 150, resizable: false }]);

        Object.values(mergedColumns).forEach((group) => {
            const groupLength = group.sourceFields.length;
            const groupConfig = flatConfig.slice(configIndex, configIndex + groupLength);
            result.push(
                groupConfig.length === groupLength ? groupConfig : Array(groupLength).fill({ width: 200, resizable: true }),
            );
            configIndex += groupLength;
        });

        for (let i = configIndex; i < flatConfig.length; i++) {
            result.push(flatConfig[i]);
        }

        return result;
    };

    normalizeColumnConfig = (flatConfig: IColumnConfig[], data: IData): (IColumnConfig | IColumnConfig[])[] => {
        const result: (IColumnConfig | IColumnConfig[])[] = [];
        const mergedColumns = this.props.mergedColumns || {};
        let configIndex = 0;

        if (this.getHierarchyFlag()) {
            result.push([{ width: 150, resizable: false }]);
        }

        Object.entries(mergedColumns).forEach(([groupName, groupConfig]) => {
            const groupLength = groupConfig.sourceFields.length;
            const groupConfigs = flatConfig.slice(configIndex, configIndex + groupLength);
            result.push(groupConfigs);
            configIndex += groupLength;
        });

        for (let i = configIndex; i < flatConfig.length; i++) {
            result.push(flatConfig[i]);
        }

        return result;
    };

    changeRow = (rowIndex: number, isMultipleSelect: boolean = false) => {
        if (!this.state.data) return;

        let newSelectedRows: number[];

        if (isMultipleSelect) {
            const isAlreadySelected = this.state.selectRows.includes(rowIndex);

            if (isAlreadySelected) {
                newSelectedRows = this.state.selectRows.filter((index) => index !== rowIndex);
            } else {
                newSelectedRows = [...this.state.selectRows, rowIndex];
            }
        } else {
            newSelectedRows = [rowIndex];
        }

        this.setState({ selectRows: newSelectedRows });

        const selectedDataRows = newSelectedRows.map((index) => this.state.data!.rows[index]);
        this.dataManager.selectedRows = selectedDataRows;

        const transformedRows = transformRowsForHook(selectedDataRows);

        HooksManager.setHook(HookKeyManager.selectRows(this.stateKey, this.formId, transformedRows));
    };

    handleSelection = (event: React.MouseEvent, rowIndex: number) => {
        if (!this.state.table?.data) return;

        const selectionOptions = {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
        };

        const currentState: SelectionState = {
            selectedRows: this.state.selectRows,
            lastSelectedRow: this.state.lastSelectedRow,
        };

        const newState = handleTableSelection(rowIndex, currentState, selectionOptions);

        // Обновляем состояние
        this.setState({
            lastSelectedRow: newState.lastSelectedRow,
            selectRows: newState.selectedRows,
        });

        const selectedDataRows = newState.selectedRows.map((index) => this.state.data!.rows[index]);
        this.dataManager.selectedRows = selectedDataRows;

        const transformedRows = transformRowsForHook(selectedDataRows);

        HooksManager.setHook(HookKeyManager.selectRows(this.stateKey, this.formId, transformedRows));
    };

    deselectAllRows = (): void => {
        this.setState({
            selectRows: [],
            table: this.state.table
                ? {
                      ...this.state.table,
                      activeCell: null,
                  }
                : null,
        });

        this.dataManager.selectedRows = [];

        HooksManager.setHook(HookKeyManager.deselectAll(this.stateKey, this.formId));
    };

    handleActiveCellChange = (activeCell: IActiveCell | null) => {
        if (activeCell) {
            this.setState((prev) => ({
                table: prev.table
                    ? {
                          ...prev.table,
                          activeCell,
                      }
                    : null,
            }));
            this.changeRow(activeCell.rowIndex);
        }
    };

    onCellClick = (event: React.MouseEvent<Element, MouseEvent>, cell: IActiveCell) => {
        if (!this.state.table) return;

        const currentClickCellKey = `${cell.rowIndex}-${cell.columnIndex}`;

        if (this.state.editableCell == currentClickCellKey) {
            return;
        }

        this.setState((prev) => ({
            table: prev.table
                ? {
                      ...prev.table,
                      activeCell: cell,
                  }
                : null,
            editableCell: null,
        }));
        this.changeRow(cell.rowIndex);
    };

    getHierarchyFlag = () => this.dataManager?.metadata?.manifest?.settings?.hierarchical;

    transformDataColumnToComponentColumn = (dataColumn: IDataColumn): IColumn => ({
        name: dataColumn.field,
        description: dataColumn.description,
        type: dataColumn.type,
        order: {
            value: null,
        },
    });

    processMergedColumns = (
        mergedColumns: IMergedColumns,
        cols: IDataColumn[],
        rows: IRow[],
    ): { cols: (IDataColumn | IDataColumn[])[]; rows: IRow[] } => {
        if (!mergedColumns || typeof mergedColumns !== 'object') {
            return {
                cols: cols?.map((col) => ({ ...col })) || [],
                rows: rows?.map((row) => ({ ...row })) || [],
            };
        }

        const newCols = cols?.map((col) => ({ ...col })) || [];
        const newRows = rows?.map((row) => ({ ...row })) || [];

        // Сначала собираем все группы и их исходные позиции
        const groups = Object.entries(mergedColumns)
            .map(([groupName, config]) => {
                if (!config) return null;

                const { sourceFields, positionIndex } = config || {};
                const columns = (sourceFields || [])
                    .map((field) => {
                        const col = newCols.find((c) => c.name === field);
                        return col ? { ...col } : null;
                    })
                    .filter(Boolean) as IDataColumn[];

                const firstColumnIndex =
                    columns.length > 0
                        ? Math.min(...columns.map((col) => newCols.findIndex((c) => c.name === col.name)))
                        : newCols.length;

                return {
                    name: groupName,
                    columns,
                    positionIndex: positionIndex ?? firstColumnIndex,
                    originalFields: sourceFields || [],
                };
            })
            .filter((group) => group && group.columns.length === group.originalFields.length) as {
            name: string;
            columns: IDataColumn[];
            positionIndex: number;
            originalFields: string[];
        }[];

        // Удаление оригинальных колонок
        groups.forEach((group) => {
            group.originalFields.forEach((field) => {
                const index = newCols.findIndex((c) => c.name === field);
                if (index !== -1) newCols.splice(index, 1);
            });
        });

        groups.sort((a, b) => a.positionIndex - b.positionIndex);

        let insertOffset = 0;
        groups.forEach((group) => {
            const insertPosition = Math.min(Math.max(0, group.positionIndex + insertOffset), newCols.length);
            // @ts-ignore
            newCols.splice(insertPosition, 0, group.columns);
            insertOffset += group.columns.length;
        });

        return {
            cols: newCols,
            rows: newRows,
        };
    };

    // Конвертирует входящие данные в данные необходимые для таблицы
    transformStateForRenderProps = (
        data: IData,
        savedConfig?: (IColumnConfig | IColumnConfig[])[] | null,
    ): {
        data: (ICell | ICell[])[][];
        cols: (IColumnData | IColumnData[])[];
        indexToId: Record<string, string>;
    } => {
        const { cols: processedCols = [], rows: processedRows = [] } = this.props.mergedColumns
            ? this.processMergedColumns(this.props.mergedColumns, data.cols, data.rows)
            : { cols: data.cols, rows: data.rows };
        const ROW_ID_FIELD_NAME = 'id';
        const indexToId = data.rows.reduce((acc, row, rowIndex) => {
            const idValue = row[ROW_ID_FIELD_NAME];
            if (!idValue) return acc;

            acc[rowIndex] = idValue;
            return acc;
        }, {});

        const result = {
            data: [] as (ICell | ICell[])[][],
            cols: [] as (IColumnData | IColumnData[])[],
            indexToId,
        };

        const visibleColumns = new Set<string>();

        const getColumnByNameOrDesc = (name: string): IDataColumn | undefined => {
            const singleCol = (processedCols as IDataColumn[]).find(
                (col) => !Array.isArray(col) && (col.name === name || col.description === name),
            );
            if (singleCol) return singleCol;

            for (const colOrGroup of processedCols) {
                if (Array.isArray(colOrGroup)) {
                    const found = colOrGroup.find((col) => col.name === name || col.description === name);
                    if (found) return found;
                }
            }
            return undefined;
        };

        // Сначала обрабатываем указанные колонки, если они есть
        if (this.props.columns && this.props.columns.length > 0) {
            this.props.columns.forEach((columnName) => {
                const col = getColumnByNameOrDesc(columnName);
                if (!col || !col.show) return;

                visibleColumns.add(col.field);

                if (Array.isArray(col)) {
                    // Обработка группы колонок
                    result.cols.push(
                        col.map((c) => ({
                            label: c.description,
                            name: c.field,
                        })),
                    );
                } else {
                    // Одиночная колонка
                    result.cols.push({
                        name: col.field,
                        label: col.description ?? col.name,
                    });
                }
            });
        } else {
            // Если колонки не указаны, берем все видимые
            if (processedCols)
                processedCols.forEach((colOrGroup) => {
                    if (Array.isArray(colOrGroup)) {
                        const visibleGroup = colOrGroup.filter((col) => col.show);
                        if (visibleGroup.length === 0) return;

                        result.cols.push(
                            visibleGroup.map((column) => ({
                                label: column.description ?? column.name,
                                name: column.field,
                            })),
                        );
                    } else {
                        if (!colOrGroup.show) return;
                        visibleColumns.add(colOrGroup.field);
                        result.cols.push({
                            label: colOrGroup.description ?? colOrGroup.name,
                            name: colOrGroup.field,
                        });
                    }
                });
        }

        // Обработка строк данных
        if (processedRows)
            processedRows.forEach((row, rowIndex) => {
                const rowData: (ICell | ICell[])[] = [];
                let columnIndex = 0;

                // Обрабатываем остальные колонки
                result.cols.forEach((column, colIdx) => {
                    if (Array.isArray(column)) {
                        const groupCells = column.map((col) => {
                            let value = row[col.name];

                            if (value !== null && typeof value === 'object' && 'type' in value && 'value' in value) {
                                const typeCode = value.type;
                                value =
                                    typeCode === 2 // boolean
                                        ? value.value
                                            ? 'Правда'
                                            : 'Ложь'
                                        : value.value || '';
                            }

                            const refValue = data.refs[col.name]?.[value];
                            const valueWithDefault = refValue ?? value ?? row[col.name];

                            return {
                                columnIndex: columnIndex++,
                                rowIndex,
                                columnName: col.name,
                                type: this.dataManager.metadata.treeObject.Fields[col.name].type,
                                value: {
                                    originalData: valueWithDefault,
                                    viewedData: valueWithDefault,
                                },
                                hierarchy: null,
                                editable: null,
                            };
                        });
                        rowData.push(groupCells);
                    } else {
                        let value = row[column.name];

                        if (value !== null && typeof value === 'object' && 'type' in value && 'value' in value) {
                            const typeCode = value.type;
                            value =
                                typeCode === 2 // boolean
                                    ? value.value
                                        ? 'Правда'
                                        : 'Ложь'
                                    : value.value || '';
                        }

                        const refValue = data.refs[column.name]?.[value];
                        const valueWithDefault = refValue ?? value ?? row[column.name];

                        rowData.push({
                            columnIndex: columnIndex++,
                            rowIndex,
                            columnName: column.name,
                            type: this.dataManager.metadata.treeObject.Fields[column.name].type,
                            value: {
                                originalData: valueWithDefault,
                                viewedData: valueWithDefault,
                            },
                            hierarchy: null,
                            editable: null,
                        });
                    }
                });

                result.data.push(rowData);
            });

        return result;
    };

    syncColumnConfigs = (
        currentConfig: (IColumnConfig[] | IColumnConfig)[],
        savedConfig: (IColumnConfig[] | IColumnConfig)[],
    ) => {
        savedConfig.forEach((saved, index) => {
            if (index >= currentConfig.length) return;

            if (Array.isArray(saved) && Array.isArray(currentConfig[index])) {
                const savedArray = saved as IColumnConfig[];
                const currentArray = currentConfig[index] as IColumnConfig[];

                savedArray.forEach((savedItem, i) => {
                    if (i < currentArray.length) {
                        currentArray[i].width = savedItem.width;
                        currentArray[i].resizable = savedItem.resizable;
                    }
                });
            } else if (!Array.isArray(saved) && !Array.isArray(currentConfig[index])) {
                const savedItem = saved as IColumnConfig;
                const currentItem = currentConfig[index] as IColumnConfig;

                currentItem.width = savedItem.width;
                currentItem.resizable = savedItem.resizable;
            }
        });
    };

    formatCellValue(value: any, refValue?: any): any {
        const typeCodeToTypeNameMapping: Record<number, string> = {
            0: 'string',
            1: 'float',
            2: 'boolean',
            3: 'datetime',
            10: 'ref',
        };

        if (value !== null && typeof value === 'object' && 'type' in value && 'value' in value) {
            const { type } = value as { type: number };
            return typeCodeToTypeNameMapping[type] === 'boolean'
                ? (value as { value: boolean }).value
                    ? 'Правда'
                    : 'Ложь'
                : (value as { value: any }).value || '';
        }

        return refValue ?? value ?? '';
    }

    getCellAt = (rowIndex: number, colIndex: number, data: (ICell | ICell[])[][]): ICell | ICell[] | undefined => {
        if (rowIndex >= 0 && rowIndex < data.length && colIndex >= 0 && colIndex < data[rowIndex].length) {
            return data[rowIndex][colIndex];
        }
        return undefined;
    };

    fetchData = async (parentId: string) => {
        if (!this.state.table) return;

        const options = {
            where: {
                parent: parentId,
            },
            limit: 200,
            offset: 0,
            // Remove Hierarchy
            attributes: this.state.data!.cols.map((col) => col.field),
        };
        const router = this.dataManager.metadata.routes;
        const metadataId = this.dataManager.metadata.id;

        return this.metadataAPI.getDataInRowsAndCols(metadataId, router, options);
    };

    onHierarchyExpand = async (rowIndex: number) => {
        const parentId = this.state.rowIndexToId[rowIndex];
        if (!this.state.table || !parentId) return;

        this.dataManager.currentSort = null;

        const data = (await this.fetchData(parentId)) as IData;
        if (!data.rows) data.rows = [];
        this.setState({
            data,
        });

        const tableData = this.transformStateForRenderProps(data);

        this.setState((prevState) => {
            const hierarchyParent = prevState.hierarchyHistory;
            hierarchyParent.push(parentId);

            return {
                ...prevState,
                data,
                table: {
                    data: tableData.data as ICell[][],
                    cols: tableData.cols,
                    activeCell: null,
                    columnsCount: tableData.cols.length,
                    rowsCount: tableData.data.length,
                    meta: {
                        prevEditableCell: null,
                    },
                },
                rowIndexToId: tableData.indexToId,
                hierarchyHistory: hierarchyParent,
                selectRows: [],
            };
        });

        await this.updateHierarchyOptionsAndReload(parentId);
    };

    onHierarchyReduce = async () => {
        this.state.hierarchyHistory.pop();

        const prevParent = this.state.hierarchyHistory[this.state.hierarchyHistory.length - 1];

        this.dataManager.currentSort = null;

        const data = (await this.fetchData(prevParent)) as IData;
        if (!data.rows) data.rows = [];
        const tableData = this.transformStateForRenderProps(data);

        this.setState((prevState) => ({
            data,
            table: {
                data: tableData.data as ICell[][],
                cols: tableData.cols,
                activeCell: null,
                columnsCount: tableData.cols.length,
                rowsCount: tableData.data.length,
                meta: {
                    prevEditableCell: null,
                },
            },
            rowIndexToId: tableData.indexToId,
            selectRows: [],
        }));

        await this.updateHierarchyOptionsAndReload(prevParent);
    };

    // Временное решение
    // TODO переделать, потому что данные должны обновляться по подписке
    updateHierarchyOptionsAndReload = async (parentId: string) => {
        const currentOptions = { ...this.dataManager.options };

        const hierarchyOptions = {
            ...currentOptions,
            where: {
                ...currentOptions.where,
                parent: parentId,
            },
            offset: 0,
            withHierarchy: true,
            order: undefined,
        };

        // @ts-ignore
        this.dataManager.options = hierarchyOptions;
        await this.dataManager.ReloadData();
    };

    getTableConfigKey = () => `table_columns_${this.formId}_${this.props.name}`;

    onSort = async (columnName: string, order: 'ASC' | 'DESC') => {
        if (!this.state.table || !this.state.data) return;

        const currentCols = this.state.table.cols;

        // Определяем новое направление сортировки
        // REFACTOR: Сделать публичные методы у DataManager'а
        const newOrder =
            this.dataManager.currentSort?.column === columnName && this.dataManager.currentSort?.direction === 'ASC'
                ? 'DESC'
                : 'ASC';
        // Сначала обновляем UI с новым состоянием сортировки
        const updatedCols = updateColumnSortState(currentCols, columnName, newOrder);

        this.setState((prev) => ({
            table: {
                ...prev.table!,
                cols: updatedCols,
            },
            infinateScroll: {
                ...prev.infinateScroll,
                currentPage: 1,
            },
        }));

        // Обновляем сортировку в DataManager
        this.dataManager.currentSort = {
            column: columnName,
            direction: newOrder,
        };

        // Получаем текущего родителя иерархии
        let hierarchyParent;
        const hierarchyLength = this.state.hierarchyHistory.length;

        if (hierarchyLength > 1) {
            hierarchyParent = this.state.hierarchyHistory[hierarchyLength - 1];
        }

        const tempOptions = {
            ...this.dataManager.options,
            order: [[columnName, newOrder]],
            offset: 0,
        };

        if (hierarchyParent && hierarchyParent !== rootParentUUID) {
            // @ts-ignore
            tempOptions.withHierarchy = true;
            tempOptions.where = {
                ...tempOptions.where,
                // @ts-ignore
                parent: hierarchyParent,
            };
        } else if (this.getHierarchyFlag()) {
            // Если справочник иерархический, но мы на корневом уровне
            // @ts-ignore
            tempOptions.withHierarchy = true;
            tempOptions.where = {
                ...tempOptions.where,
                // @ts-ignore
                parent: rootParentUUID,
            };
        }

        // @ts-ignore
        this.dataManager.options = tempOptions;

        try {
            await this.dataManager.ReloadData();
        } catch (error) {
            console.error('Sorting error:', error);
            // Восстанавливаем предыдущее состояние при ошибке
            this.setState((prev) => ({
                table: {
                    ...prev.table!,
                    cols: currentCols,
                },
            }));
        }
    };

    loadPage = (page: number) => {
        if (page < 1 || this.state.loading) return;
        this.setState({ loading: true });

        const offset = (page - 1) * this.state.infinateScroll.limit;
        const newOptions = {
            ...this.dataManager.options,
            offset,
        } as any;

        this.dataManager.options = newOptions;

        this.setState((prev) => ({
            infinateScroll: {
                ...prev.infinateScroll,
                offset,
                currentPage: page,
                hasPrev: page > 1,
                hasNext: page < prev.infinateScroll.pages,
            },
        }));
        this.dataManager.ReloadData().finally(() => {
            this.setState({ loading: false });
        });
    };

    loadNext = () => {
        const { currentPage, pages } = this.state.infinateScroll;
        if (currentPage < pages) {
            this.loadPage(currentPage + 1);
        }
    };

    loadPrev = () => {
        const { currentPage } = this.state.infinateScroll;
        if (currentPage > 1) {
            this.loadPage(currentPage - 1);
        }
    };

    handleReload = (resetPagination: boolean = false) => {
        // TODO: С точки зрения архитектуры костыль, тк лезим напрямую во внутрянку DataManager
        const newOptions: any = {
            ...this.dataManager.options,
            limit: this.state.infinateScroll.limit,
            offset: resetPagination ? 0 : this.dataManager.options.offset,
        };

        if (this.dataManager.currentSort) {
            newOptions.order = [[this.dataManager.currentSort.column, this.dataManager.currentSort.direction]];
        }

        this.dataManager.options = newOptions;
        this.setState({ loading: true }, () => {
            this.dataManager.ReloadData();
            this.setState({ loading: false });
        });
    };

    handleColumnConfigChange = (newConfig: (IColumnConfig | IColumnConfig[])[]) => {
        this.setState((prev) => ({
            table: prev.table
                ? {
                      ...prev.table,
                      columnConfig: newConfig,
                  }
                : null,
        }));

        const flatConfig = this.flattenColumnConfig(newConfig);

        localStorage.setItem(this.getTableConfigKey(), JSON.stringify(flatConfig));
    };

    flattenColumnConfig = (config: (IColumnConfig | IColumnConfig[])[]): IColumnConfig[] =>
        config.flatMap((item) => {
            if (Array.isArray(item)) {
                return item;
            }
            return item;
        });

    handleDoubleClick = (event: MouseEvent, cellData: any) => {
        try {
            const formConfig = createEditForm(this.dataManager);

            $windows.open(formConfig.title, formConfig.content, formConfig.options);
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    };

    handleEnterKeydown = (event: React.KeyboardEvent) => {
        if (!this.dataManager?.selectedRows?.length) {
            console.warn('No rows selected for editing');
            return;
        }
        // TODO Возможно стоит создавать форму редактирования по другому
        try {
            const formConfig = createEditForm(this.dataManager);

            $windows.open(formConfig.title, formConfig.content, formConfig.options);
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    };

    renderCellContent = (cellData: ICell) => {
        const { type, value, columnName, rowIndex } = cellData;
        const cellKey = `${rowIndex}-${columnName}`;

        const isEditable = this.state.editableCell === cellKey;
        const readOnly = !isEditable;
        const fieldPath = `list.${rowIndex}.${columnName}`;
        return (
            <MetaInput
                DataManager={this.dataManager}
                field={fieldPath}
                readOnly={readOnly}
                table
                fullWidth
                border={false}
                // @ts-ignore
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    this.handleDoubleClick(e, cellData);
                }}
                onChange={(value: any) => {}}
            />
        );
    };

    handleCellClick = (
        event: React.MouseEvent,
        payload: {
            columnIndex: number;
            rowIndex: number;
            groupIndex?: number;
            colInGroupIndex?: number;
        },
    ) => {
        const newActiveCell = {
            rowIndex: payload.rowIndex,
            columnIndex: payload.columnIndex,
            colInGroupIndex: undefined,
            groupIndex: undefined,
        };

        this.handleActiveCellChange({ ...newActiveCell, sourceEvent: { type: 'mouse' } });

        this.handleSelection(event, payload.rowIndex);
    };

    handleKeyDown = (event: React.KeyboardEvent) => {
        if (!this.state.table) return;

        const { data, cols, rowsCount, columnsCount, activeCell } = this.state.table;

        if (!activeCell) return;

        if (event.code === 'Enter') {
            this.handleEnterKeydown(event);
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();

            const rowIndexes = [...new Set(this.state.table!.data.flat().map((cell) => cell.rowIndex))];
            const newSelectionState = selectAllRows(rowIndexes);

            this.setState({
                lastSelectedRow: newSelectionState.lastSelectedRow,
                selectRows: newSelectionState.selectedRows,
            });

            const selectedDataRows = rowIndexes.map((index) => this.state.data!.rows[index]);
            this.dataManager.selectedRows = selectedDataRows;

            const transformedRows = transformRowsForHook(selectedDataRows);

            HooksManager.setHook(HookKeyManager.selectRows(this.stateKey, this.formId, transformedRows));
            return;
        }

        if (event.code === 'Escape') {
            event.preventDefault();
            event.stopPropagation();

            return;
        }

        if (event.code === 'Tab') {
            event.preventDefault();

            const newActiveCell = event.shiftKey
                ? tableNavigation.getNextCell(activeCell, rowsCount, columnsCount, data, cols)
                : tableNavigation.getNextCell(activeCell, rowsCount, columnsCount, data, cols);

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: {
                    type: 'keyboard',
                    direction: 'right',
                },
            });
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();

            const direction = event.code.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';

            const newActiveCell = tableNavigation.getCellByDirection(activeCell, direction, rowsCount, columnsCount, data);

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: {
                    type: 'keyboard',
                    direction,
                },
            });
        }
    };

    setDefaultSellection = () => {
        const { table } = this.state;
        if (!table || table.data.length === 0 || table.cols.length === 0) return;

        const defaultActiveCell = { rowIndex: 0, columnIndex: 0 };
        this.setState({
            table: {
                ...table,
                activeCell: defaultActiveCell,
            },
        });
        this.changeRow(0);
    };

    render(): ReactNode {
        const { DataManager, ...propsWithoutDataManager } = this.props;
        const hasHierarchy = this.getHierarchyFlag();
        const { currentPage, pages } = this.state.infinateScroll;
        const hasPrev = currentPage > 1;
        const hasNext = currentPage < pages;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_ELementsList_ElementsListContent'),
                }}
            >
                {this.state.table ? (
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                            <ReactWindowWrapper
                                cols={this.state.table.cols}
                                data={this.state.table.data}
                                activeCell={this.state.table.activeCell}
                                renderMetaInput={this.renderCellContent}
                                onKeyDown={this.handleKeyDown}
                                hasExpendedHierarchy={this.state.hierarchyHistory.length > 1}
                                onHierarchExpend={this.onHierarchyExpand}
                                onHierarchyBack={this.onHierarchyReduce}
                                onSort={this.onSort}
                                onCellClick={this.handleCellClick}
                                selectedRows={this.state.selectRows}
                                hierarchy={hasHierarchy}
                                isLoadingMore={this.state.loading}
                                loadNext={this.loadNext}
                                loadPrev={this.loadPrev}
                                hasPrev={hasPrev}
                                hasNext={hasNext}
                                width={this.props.width}
                                height={this.props.height}
                            />
                        </div>
                    </div>
                ) : null}
            </ErrorBoundary>
        );
    }
}

export class ElementsList extends Component<IElementsListProps> {
    render(): ReactNode {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: {} },
                    fileName: generateLogsFileName('MetadataForms_ELementsList_ElementsList'),
                }}
            >
                <ElementsListContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
