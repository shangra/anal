// @ts-nocheck

import React, { act, Component, ReactNode } from 'react';
import { DataManager } from 'components/MetadataForms/DataManager';
import { ICell, IColumn as IListColumn, IColumnConfig, IActiveCell } from 'components/MetadataForms/ElementsList/types';
import { Button } from 'ui-kit';
import styles from './TabularPart.module.css';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { MetaInput } from 'components/MetadataForms/MetaInput';
import { defaultValueByTypeName , fieldTypeName } from 'components/MetadataForms/MetaInput/constant';
import { CellType, DataManagerTableType, TablePathType } from 'components/MetadataForms/TabularPart/types';
import { ReactWindowWrapper } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined';
import { tableNavigation } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/tableNavigation';
import {
    handleTableSelection,
    SelectionState,
} from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/tableSelectionHelper';
import { updateColumnSortState } from 'components/MetadataForms/ElementsList/utils/tableSort.utils';
import { getMoveRowAvailability } from 'components/MetadataForms/TabularPart/utils/getMoveRowAvailability';
import { splitCamelCase, toPascalCase } from 'components/MetadataForms/TabularPart/utils/words';
import { flattenToNested } from 'components/MetadataForms/TabularPart/utils/flattenToNested';

interface IMergedColumns {
    [groupName: string]: {
        sourceFields: string[];
        positionIndex?: number;
    };
}

interface IColumn extends IListColumn {
    field: string;
}

interface ITabularPart {
    name: string;
    table: string;
}

interface IDataManagerColumn {
    name: string;
    field: string;
    description: string;
    type: string;
    show?: boolean;
}

const PREFIX = 'TabularParts';

interface ITabularPartProps {
    DataManager: DataManager;
    name: string;
    columns?: string[];
    columnsOptions?: Record<
        string,
        {
            render?: (props: {
                DataManager: DataManager;
                field: string;
                readonly: boolean;
                table: boolean;
                inputType: string;
                fullWidth: boolean;
                border: boolean;
                onDoubleClick: (event: React.MouseEvent) => void;
            }) => {};
        }
    >;
    overrideFields?: Record<string, component>;
    height?: number;
    mergedColumns?: IMergedColumns;
    buttons?: ReactNode[];
}

export interface ITabularPartState {
    table: {
        rowsCount: number;
        columnsCount: number;
        data: (ICell | ICell[])[][];
        cols: (IColumn | IColumn[])[];
        activeCell: IActiveCell | null;
        columnConfig: (IColumnConfig | IColumnConfig[])[];
        editableCell: { rowIndex: number; columnIndex: number } | null;
    } | null;
    selectRows: number[];
    lastSelectedRow: number | null;
    sortConfig: {
        column: string | null;
        direction: string | null;
    };
    containerWidth: number;
}

class TabularPartContent extends Component<ITabularPartProps, ITabularPartState> {
    dataManager: DataManager;

    canBeRendered: boolean;

    tabularPart?: ITabularPart;

    private tableRef = React.createRef<ReactWindowWrapper>();

    private containerRef = React.createRef<HTMLDivElement>();

    private resizeObserver: ResizeObserver | null = null;

    constructor(props: ITabularPartProps) {
        super(props);
        this.dataManager = props.DataManager;
        this.canBeRendered = true;

        this.tabularPart = Object.values<ITabularPart>(this.dataManager.metadata.treeObject.TabularParts).find(
            (tabularPart) => tabularPart.name === this.props.name,
        );

        if (!this.tabularPart) {
            this.canBeRendered = false;
            return;
        }

        this.state = {
            table: null,
            selectRows: [],
            lastSelectedRow: null,
            sortConfig: {
                column: null,
                direction: null,
            },
            containerWidth: 0,
        };
    }

    componentDidMount() {
        if (!this.tabularPart) return;

        this.dataManager.hookChangeFieldData(`record.TabularParts.${this.tabularPart.table}`, this);

        const currentData = this.dataManager.data?.record?.TabularParts?.[this.tabularPart.table];
        if (currentData) {
            this.handleTableChange(`record.TabularParts.${this.tabularPart.table}`, currentData);
        }

        this.updateContainerWidth();
        if (this.containerRef.current) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateContainerWidth();
            });
            this.resizeObserver.observe(this.containerRef.current);
        }
    }

    componentDidUpdate(prevProps: ITabularPartProps, prevState: ITabularPartState) {
        if (!this.containerRef.current) {
            return;
        }

        const containerWidth = this.containerRef.current.clientWidth;
        if (containerWidth > 0 && containerWidth !== this.state.containerWidth) {
            this.setState({ containerWidth });
            return;
        }

        if (this.state.containerWidth === 0 && prevState.containerWidth === 0 && containerWidth > 0) {
            this.setState({ containerWidth });
        }
    }

    componentWillUnmount() {
        this.resizeObserver?.disconnect();
    }

    updateContainerWidth = () => {
        if (!this.containerRef.current) {
            return;
        }
        const containerWidth = this.containerRef.current.clientWidth;
        if (containerWidth > 0 && containerWidth !== this.state.containerWidth) {
            this.setState({ containerWidth });
        }
    };

    // TODO: REFACTOR
    // Вынести в класс, который должен парсить и генерировать ключи
    getCommandByPath = (path: string): 'table' | 'cell' | null => {
        let command = 'table';
        if (path.split('.').length > 3) command = 'cell';
        // if (path.startsWith(PREFIX)) {
        //     const pathParts = path.split('.');
        //     if (pathParts.length === 2) command = 'table';
        //     if (pathParts.length === 4) command = 'cell';
        // }

        return command;
    };

    // TODO нужен ли этот метод ?
    changeMasterData = (path: string, value: DataManagerTableType | CellType) => {
        const commandType = this.getCommandByPath(path);
        if (commandType === 'cell') {
            // this.handleCellChange(path as CellPathType, value as CellType);
        } else if (commandType === 'table') {
            this.handleTableChange(path as TablePathType, value as DataManagerTableType);
        }
    };

    #activateInput(fieldType: string, action: 'focus' | 'select') {
        // решить проблему выделения инпута
        const activeCellInput = this.containerRef.current?.querySelector("[data-active='true'] input");

        if (
            [
                fieldTypeName.TEXT,
                fieldTypeName.STRING,
                fieldTypeName.REAL,
                fieldTypeName.INTEGER,
                fieldTypeName.FLOAT,
            ].includes(fieldType)
        ) {
            if (action === 'focus' && activeCellInput) {
                activeCellInput.focus();
                if (action === 'select') {
                    setTimeout(() => activeCellInput.select(), 0);
                }
            } else if (action === 'select' && activeCellInput) {
                activeCellInput.focus();
                setTimeout(() => activeCellInput.select(), 0);
            }
            return;
        }

        if (fieldType === fieldTypeName.UUID || fieldType === fieldTypeName.DATE || fieldType === fieldTypeName.DATETIME) {
            if (activeCellInput) {
                activeCellInput.focus();
                if (action === 'select') {
                    setTimeout(() => activeCellInput.select(), 0);
                }
            }
        }
    }

    handleAddRow = () => {
        if (!this.tabularPart || !this.state.table) return;

        const currentDataManagerState = this.dataManager?.data?.record?.TabularParts?.[this.tabularPart.table] || [];
        const updatedTableData = [...currentDataManagerState];

        const newRow = this.state.table.cols.reduce<Record<string, string>>((acc, col) => {
            if (Array.isArray(col)) {
                col.forEach((c) => {
                    acc[c.field] = defaultValueByTypeName[c.type];
                });
            } else {
                acc[col.field] = defaultValueByTypeName[col.type];
            }
            return acc;
        }, {});

        updatedTableData.push(newRow);

        const renumberedTable = updatedTableData.map((row, index) => ({
            ...row,
            rank: index + 1,
        }));

        this.dataManager.data.record.TabularParts[this.tabularPart.table] = renumberedTable;

        const fieldsMetadata = this.dataManager.metadata.treeObject.TabularParts[this.tabularPart.table].info.Fields;
        const colsFromState = this.state.table.cols;

        const firstEditingColumnIndex = colsFromState.findIndex((col) => {
            const fieldMeta = Object.values(fieldsMetadata).find(
                (meta) => meta.field === col.field || meta.name === col.title,
            );
            return fieldMeta?.editing === true;
        });

        const newRowIndex = renumberedTable.length - 1;

        this.setState(
            (prevState) => ({
                table: prevState.table
                    ? {
                          ...prevState.table,
                          activeCell: {
                              rowIndex: newRowIndex,
                              columnIndex: firstEditingColumnIndex,
                              isEditing: true,
                          },
                      }
                    : null,
                selectRows: [newRowIndex],
                lastSelectedRow: newRowIndex,
            }),
            () => {
                if (this.tableRef.current) {
                    this.tableRef.current.scrollToCell(newRowIndex, firstEditingColumnIndex);
                }
            },
        );
    };

    handleDeleteRow = () => {
        if (!this.tabularPart || !this.state.table) {
            return;
        }

        // @ts-ignore
        const currentDataManagerState = [...this.dataManager.data.record.TabularParts[this.tabularPart.table]];

        if (currentDataManagerState.length === 0) {
            return;
        }

        let rowsToDelete: number[];

        if (this.state.selectRows && this.state.selectRows.length > 0) {
            rowsToDelete = this.state.selectRows;
        } else {
            rowsToDelete = [currentDataManagerState.length - 1];
        }

        const newData = currentDataManagerState.filter((_, originalIndex) => !rowsToDelete.includes(originalIndex));

        // пересчёт индексов при удалении строки
        const reindexedData = this.recalculateRanks(newData);

        // @ts-ignore
        this.dataManager.data.record.TabularParts[this.tabularPart.table] = reindexedData;

        this.setState({
            selectRows: [],
            lastSelectedRow: null,
        });

        this.setState((prev) => ({
            table: prev.table
                ? {
                      ...prev.table,
                      activeCell: null,
                  }
                : null,
        }));
    };

    handleCopyRow = () => {
        if (!this.tabularPart || !this.state.table) {
            return;
        }

        const currentDataManagerState = [...this.dataManager.data.record.TabularParts[this.tabularPart.table]];

        if (currentDataManagerState.length === 0 || this.state.selectRows === 0) {
            return;
        }

        // New data
        const rowsToCopy = currentDataManagerState.filter((_, originalIndex) => this.state.selectRows.includes(originalIndex));

        // По идее, вычисление новых rank не нужно, если они и так пересчитываются
        // Вставка после последнего выделенного
        const maxCopyIndex = Math.max(...this.state.selectRows);

        currentDataManagerState.splice(maxCopyIndex, 0, ...JSON.parse(JSON.stringify(rowsToCopy)));

        // new indexes
        // const newActiveRowsIndexes = Array.from({ length: this.state.selectRows.length }, (_, i) => i + maxCopyIndex + 1);

        const reindexedData = this.recalculateRanks(currentDataManagerState);

        // @ts-ignore
        this.dataManager.data.record.TabularParts[this.tabularPart.table] = reindexedData;

        newRowIndex = maxCopyIndex + this.state.selectRows.length;

        const colsFromState = this.state.table.cols;

        const fieldsMetadata = this.dataManager.metadata.treeObject.TabularParts[this.tabularPart.table].info.Fields;

        const firstEditingColumnIndex = colsFromState.findIndex((col) => {
            const fieldMeta = Object.values(fieldsMetadata).find(
                (meta) => meta.field === col.field || meta.name === col.title,
            );
            return fieldMeta?.editing === true;
        });

        if (this.tableRef.current) {
            this.tableRef.current.scrollToCell(newRowIndex, firstEditingColumnIndex);
        }
    };

    processMergedColumns = (
        mergedColumns: IMergedColumns,
        cols: IDataColumn[],
        rows: IRow[],
    ): { cols: (IDataColumn | IDataColumn[])[]; rows: IRow[] } => {
        if (!mergedColumns) return { cols, rows };

        const newCols = cols.map((col) => ({ ...col }));
        const newRows = rows.map((row) => ({ ...row }));

        const groups = Object.entries(mergedColumns)
            .map(([groupName, config]) => {
                const { sourceFields, positionIndex } = config;
                const columns = sourceFields
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
                    originalFields: sourceFields,
                };
            })
            .filter((group) => group.columns.length === group.originalFields.length);

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

    handleTableChange = (path: TablePathType, value: DataManagerTableType) => {
        if (!this.tabularPart || !value || !Array.isArray(value)) return;

        const fieldsMetadata = this.dataManager.metadata.treeObject.TabularParts[this.tabularPart.table].info.Fields;
        const dataColumns = Object.values(fieldsMetadata)
            .filter((field) => field.show)
            .map((field) => ({
                field: field.field,
                name: field.name,
                description: field.description,
                show: field.show,
            }));

        const processed = this.props.mergedColumns
            ? this.processMergedColumns(this.props.mergedColumns, dataColumns, value)
            : { cols: dataColumns, rows: value };

        // Простые данные для таблицы
        const tableData = this.transformTabularData(processed.rows, processed.cols, fieldsMetadata);

        this.setState({
            table: {
                rowsCount: tableData.data.length,
                columnsCount: processed.cols.length,
                data: tableData.data,
                cols: tableData.cols,
                activeCell: { rowIndex: 0, columnIndex: 0, isEditing: false },
                columnConfig: tableData.columnConfig,
                editableCell: null,
            },
        });
    };

    transformTabularData = (
        rows: IRow[],
        cols: (IDataColumn | IDataColumn[])[],
        fieldsMetadata: Record<string, any>,
    ): {
        data: (ICell | ICell[])[][];
        cols: (IColumn | IColumn[])[];
        columnConfig: (IColumnConfig | IColumnConfig[])[];
    } => {
        const result = {
            data: [] as (ICell | ICell[])[][],
            cols: [] as (IColumn | IColumn[])[],
            columnConfig: [] as (IColumnConfig | IColumnConfig[])[],
        };

        // Преобразуем колонки
        cols.forEach((colOrGroup) => {
            if (Array.isArray(colOrGroup)) {
                const group = colOrGroup.map((col) => ({
                    name: col.field,
                    description: col.description,
                    type: col.type,
                    order: null,
                    field: col.field,
                    label: col.description ?? col.name,
                }));
                result.cols.push(group);
                result.columnConfig.push(colOrGroup.map(() => ({ width: 200, resizable: true })));
            } else {
                result.cols.push({
                    name: colOrGroup.field,
                    description: colOrGroup.description,
                    type: colOrGroup.type,
                    order: null,
                    field: colOrGroup.field,
                    label: colOrGroup.description ?? colOrGroup.name,
                });
                result.columnConfig.push({ width: 200, resizable: true });
            }
        });

        const metadataFields = this.dataManager.metadata.treeObject.TabularParts[this.tabularPart.table].info.Fields;

        // Преобразуем данные
        rows.forEach((row, rowIndex) => {
            const rowData: (ICell | ICell[])[] = [];
            let columnIndex = 0;

            result.cols.forEach((colOrGroup) => {
                if (Array.isArray(colOrGroup)) {
                    const groupCells = colOrGroup.map((col) => {
                        const metadata = fieldsMetadata[col.field];

                        return {
                            columnIndex: columnIndex++,
                            rowIndex,
                            columnName: col.name,
                            value: row[col.field],
                            field: col.field,
                            type: metadataFields[col.field]?.type,
                            editing: metadata.editing,
                        };
                    });
                    rowData.push(groupCells);
                } else {
                    const metadata = fieldsMetadata[colOrGroup.field];

                    rowData.push({
                        columnIndex: columnIndex++,
                        rowIndex,
                        columnName: colOrGroup.name,
                        value: row[colOrGroup.field],
                        field: colOrGroup.field,
                        type: metadataFields[colOrGroup.field]?.type,
                        editing: metadata.editing,
                    });
                }
            });

            result.data.push(rowData);
        });

        return result;
    };

    handleMetaInputDoubleClick = (event: React.MouseEvent, cellData: any) => {
        event.stopPropagation();
        const { rowIndex, columnIndex } = cellData;

        const canBeEditing = cellData.editing ?? true;

        this.setState(
            (prevState) => {
                if (!prevState.table) return prevState;

                const isActiveCell =
                    prevState.table.activeCell?.rowIndex === rowIndex &&
                    prevState.table.activeCell?.columnIndex === columnIndex;

                if (isActiveCell && canBeEditing) {
                    return {
                        ...prevState,
                        table: {
                            ...prevState.table,
                            activeCell: {
                                ...prevState.table.activeCell,
                                isEditing: true,
                            },
                        },
                    };
                } 
                    return {
                        ...prevState,
                        table: {
                            ...prevState.table,
                            activeCell: {
                                rowIndex,
                                columnIndex,
                                isEditing: true,
                            },
                        },
                    };
                
            },
            () => {
                const attr = this.#getCellData(this.state.table?.data, rowIndex, columnIndex);
                if (attr) {
                    requestAnimationFrame(() => {
                        this.#activateInput(attr.type, 'select');
                    });
                }
            },
        );
    };

    handleMetaInputKeyDown = (e: React.KeyboardEvent, cellData: any) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();

            this.setState((prevState) => ({
                table: prevState.table
                    ? {
                          ...prevState.table,
                          activeCell: prevState.table.activeCell
                              ? {
                                    ...prevState.table.activeCell,
                                    isEditing: false,
                                }
                              : null,
                      }
                    : null,
            }));
        }
    };

    handleActiveCellChange = (activeCell: IActiveCell | null) => {
        this.setState((prevState) => ({
            table: prevState.table
                ? {
                      ...prevState.table,
                      activeCell: activeCell
                          ? {
                                ...activeCell,
                                // Если isEditing явно передан - используем его
                                // Иначе сохраняем текущее состояние редактирования только для той же ячейки
                                isEditing:
                                    activeCell.isEditing !== undefined
                                        ? activeCell.isEditing
                                        : prevState.table.activeCell?.rowIndex === activeCell.rowIndex &&
                                          prevState.table.activeCell?.columnIndex === activeCell.columnIndex &&
                                          prevState.table.activeCell?.isEditing === true,
                            }
                          : null,
                  }
                : null,
            selectRows: activeCell ? [activeCell.rowIndex] : this.state.selectRows,
        }));
    };

    handleEnterKeydown = (event: React.KeyboardEvent, activeCell: IActiveCell, cellData: any) => {
        const { rowIndex, columnIndex } = activeCell;

        const attr = this.#getCellData(this.state.table?.data, rowIndex, columnIndex);

        const canBeEditing = attr.editing;

        const isAlreadyEditing = this.state.table.activeCell.isEditing;

        this.setState(
            (prevState) => {
                if (!prevState.table || !prevState.table.activeCell) return prevState;

                const isActiveCell =
                    prevState.table.activeCell.rowIndex === rowIndex && prevState.table.activeCell.columnIndex === columnIndex;

                if (!isActiveCell) return prevState;

                return {
                    ...prevState,
                    table: {
                        ...prevState.table,
                        activeCell: {
                            ...prevState.table.activeCell,
                            isEditing: !prevState.table.activeCell.isEditing && canBeEditing,
                        },
                    },
                };
            },
            () => {
                // выделение в текущей табличной части
                if (!this.containerRef.current || isAlreadyEditing) {
                    return;
                }

                this.#activateInput(attr.type, 'select');
                // решить проблему выделения инпута
                const activeCellInput = this.containerRef.current.querySelector("[data-active='true'] input");

                if (
                    [
                        fieldTypeName.TEXT,
                        fieldTypeName.STRING,
                        fieldTypeName.REAL,
                        fieldTypeName.INTEGER,
                        fieldTypeName.FLOAT,
                    ].includes(attr.type)
                ) {
                    activeCellInput?.select();
                }

                if (attr.type === fieldTypeName.UUID) {
                    // не выглядит ли как костыль?
                    // возможно ли сделать на более низком уровне (ячейка открывается -> выпадает список. Но тогда это будет происходить не только при нажатии Enter)
                    const dropdownButton = this.containerRef.current.querySelector("[data-active='true'] button.dropdown");
                    dropdownButton?.click();
                }

                if (attr.type === fieldTypeName.DATE || attr.type === fieldTypeName.DATETIME) {
                    const dropdownButton = this.containerRef.current.querySelector("[data-active='true'] button.calendar");
                    dropdownButton?.click();
                }
            },
        );
    };

    handleEscapeKeydown = (event: React.KeyboardEvent) => {
        event.stopPropagation();
        event.preventDefault();

        this.setState((prevState) => ({
            table: prevState.table
                ? {
                      ...prevState.table,
                      activeCell: prevState.table.activeCell
                          ? {
                                ...prevState.table.activeCell,
                                isEditing: false,
                            }
                          : null,
                  }
                : null,
        }));
    };

    renderCellContent = (cellData: any, metadata: { rowIndex: number; columnIndex: number }) => {
        const { rowIndex, columnIndex, field, type } = cellData;

        const col = this.state.table!.cols[columnIndex] as IColumn;

        const isActive =
            this.state.table?.activeCell?.rowIndex === rowIndex && this.state.table?.activeCell?.columnIndex === columnIndex;

        const isEditing = this.state.table?.activeCell?.isEditing && isActive && field !== 'rank';

        const readOnly = !isEditing;
        const fieldPath = `TabularParts.${this.tabularPart?.table}.${rowIndex}.${field}`;

        const renderOverride = this.props.columnsOptions?.[col.label]?.render;
        if (renderOverride) {
            return renderOverride(
                {
                    DataManager: this.dataManager,
                    field: fieldPath,
                    readOnly,
                    table: true,
                    inputType: type,
                    fullWidth: true,
                    border: false,
                    onDoubleClick: (event: React.MouseEvent) => {
                        this.handleMetaInputDoubleClick(event, cellData);
                    },
                },
                {
                    rowIndex: metadata.rowIndex,
                    columnIndex: metadata.columnIndex,
                    tabularPartInfo: this.tabularPart,
                },
            );
        }

        // новый метод добавления компонентов, более простой, чем renderOverride
        // добавление компонента:
        // overrideFields={{"ТабличнаяЧасть.НазваниеПоля": <Компонент Параметр="Параметр1" />, ...}}
        // либо overrideFields={{"ТабличнаяЧасть": {"НазваниеПоля": <Компонент Параметр="Параметр1" />}}}
        // преобразование в {"ТабличнаяЧасть": {"НазваниеПоля": <Компонент Параметр="Параметр1" />}}
        // debugger;
        if (this?.props?.overrideFields) {
            const nestedOverrideFields = flattenToNested(this.props?.overrideFields);

            // const overrideField =
            //     nestedOverrideFields?.[this.tabularPart.name] || nestedOverrideFields?.[splitCamelCase(this.tabularPart.name)];
            // const keys = Object.keys(nestedOverrideFields);
            // const ourField = overrideField?.[col.label] || overrideField?.[toPascalCase(col.label)];

            const ourField = nestedOverrideFields?.[col.label] || nestedOverrideFields?.[toPascalCase(col.label)];

            if (ourField) {
                return React.cloneElement(ourField, {
                    field: fieldPath, // col.label,
                    rowIndex: metadata.rowIndex,
                    columnIndex: metadata.columnIndex,
                    tabularPartInfo: this.tabularPart,
                    DataManager: this.dataManager,
                    table: true,
                    inputType: type,
                    fullWidth: true,
                    border: false,
                    readOnly,
                    onDoubleClick: (event: React.MouseEvent) => {
                        this.handleMetaInputDoubleClick(event, cellData);
                    },
                });
            }
        }

        return (
            <MetaInput
                DataManager={this.dataManager}
                field={fieldPath}
                readOnly={readOnly}
                table
                fullWidth
                border={false}
                onDoubleClick={(event: React.MouseEvent) => {
                    this.handleMetaInputDoubleClick(event, cellData);
                }}
                // onKeyDown={(e) => {
                //     // e.preventDefault();
                //     this.handleMetaInputKeyDown(e, cellData)
                // }}
            />
        );
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
    };

    handleCellDoubleClick = (event: React.MouseEvent, payload: { columnIndex: number; rowIndex: number }) => {
        const cellData = this.#getCellData(this.state.table?.data, payload.rowIndex, payload.columnIndex);
        if (cellData) {
            this.handleMetaInputDoubleClick(event, cellData);
        }
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

        const isSameCell = this.#isSameCell(
            {
                rowIndex: this.state.table.activeCell?.rowIndex ?? -1,
                columnIndex: this.state.table.activeCell?.columnIndex ?? -1,
            },
            newActiveCell,
        );

        if (isSameCell) {
            return;
        }

        this.handleActiveCellChange({ ...newActiveCell, sourceEvent: { type: 'mouse' } });

        this.handleSelection(event, payload.rowIndex);
    };

    #isSameCell = (currentCell: Partial<CellCoordinates>, newCell: CellCoordinates): boolean => currentCell.rowIndex === newCell.rowIndex && currentCell.columnIndex === newCell.columnIndex;

    handleKeyDown = (event: React.KeyboardEvent, cellData: any) => {
        if (!this.state.table) return;

        const { data, cols, rowsCount, columnsCount, activeCell } = this.state.table;

        if (!activeCell) return;

        if (activeCell?.isEditing && event.key === 'Tab') {
            event.preventDefault();

            const direction = event.shiftKey ? 'left' : 'right';
            const newActiveCell = tableNavigation.getCellByDirection(activeCell, direction, rowsCount, columnsCount, data);

            // Следующая ячейка автоматически переходит в режим редактирования
            this.handleActiveCellChange({
                ...newActiveCell,
                isEditing: true,
                sourceEvent: {
                    type: 'keyboard',
                    direction,
                },
            });
            return;
        }

        // Если ячейка в режиме редактирования, блокируем другие клавиши (кроме Escape и Enter)
        if (activeCell?.isEditing && event.key !== 'Escape' && event.key !== 'Enter') {
            return;
        }

        if (event.code === 'Enter') {
            this.handleEnterKeydown(event, activeCell, cellData);
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();

            const rowIndexes = [
                ...new Set(
                    this.state.table!.data.flat().map((cell) => {
                        if (Array.isArray(cell)) {
                            return cell[0]?.rowIndex;
                        }
                        return cell.rowIndex;
                    }),
                ),
            ].filter((index) => index !== undefined) as number[];

            this.setState({
                lastSelectedRow: rowIndexes.length > 0 ? rowIndexes[rowIndexes.length - 1] : null,
                selectRows: rowIndexes,
            });
            return;
        }

        if (event.code === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.handleEscapeKeydown(event);
            return;
        }

        if (event.code === 'Tab') {
            event.preventDefault();

            const direction = event.shiftKey ? 'left' : 'right';
            const newActiveCell = tableNavigation.getCellByDirection(activeCell, direction, rowsCount, columnsCount, data);

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: {
                    type: 'keyboard',
                    direction,
                },
            });
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();

            const direction = event.code.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';

            const newActiveCell = tableNavigation.getCellByDirection(activeCell, direction, rowsCount, columnsCount, data);

            this.handleActiveCellChange({
                ...newActiveCell,
                isEditing: false,
                sourceEvent: {
                    type: 'keyboard',
                    direction,
                },
            });
        }
    };

    #getCellData(data, targetRowIndex, targetColumnIndex) {
        if (!Array.isArray(data)) return null;

        const stack = structuredClone(data);

        // алгоритм поиска в глубину
        while (stack.length > 0) {
            const item = stack.pop();

            if (Array.isArray(item)) {
                for (let i = item.length - 1; i >= 0; i--) {
                    stack.push(item[i]);
                }
            } else if (item && typeof item === 'object') {
                if (item.rowIndex === targetRowIndex && item.columnIndex === targetColumnIndex) {
                    return item;
                }
            }
        }
        return null;
    }

    onSort = async (columnName: string, order: 'ASC' | 'DESC') => {
        if (!this.state.table) return;

        const currentCols = this.state.table.cols;

        const newOrder =
            this.state.sortConfig.column === columnName && this.state.sortConfig.direction === 'ASC' ? 'DESC' : 'ASC';

        const updatedCols = updateColumnSortState(currentCols, columnName, newOrder);

        this.setState({
            table: {
                ...this.state.table,
                cols: updatedCols,
                editableCell: null,
                activeCell: {
                    isEditing: false,
                },
            },
            sortConfig: {
                column: columnName,
                direction: newOrder,
            },
        });

        this.sortLocalData(columnName, newOrder);
    };

    sortLocalData = (columnName: string, direction: 'ASC' | 'DESC') => {
        if (!this.state.table || !this.tabularPart) return;

        const currentData = [...(this.dataManager.data?.record?.TabularParts?.[this.tabularPart.table] || [])];

        const sortedData = [...currentData].sort((a, b) => {
            const aValue = a[columnName];
            const bValue = b[columnName];

            if (direction === 'ASC') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } 
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            
        });

        this.dataManager.data.record.TabularParts[this.tabularPart.table] = sortedData;

        const fieldsMetadata = this.dataManager.metadata.treeObject.TabularParts[this.tabularPart.table].info.Fields;
        const dataColumns = Object.values(fieldsMetadata)
            .filter((field) => field.show)
            .map((field) => ({
                field: field.field,
                type: field.type,
                name: field.name,
                description: field.description,
                show: field.show,
            }));

        const processed = this.props.mergedColumns
            ? this.processMergedColumns(this.props.mergedColumns, dataColumns, sortedData)
            : { cols: dataColumns, rows: sortedData };

        const tableData = this.transformTabularData(processed.rows, processed.cols, fieldsMetadata);
        const colsWithSort = updateColumnSortState(tableData.cols, columnName, direction);

        this.setState({
            table: {
                ...this.state.table,
                data: tableData.data,
                cols: colsWithSort,
                editableCell: null,
                activeCell: {
                    isEditing: false,
                },
            },
        });
    };

    recalculateRanks = (data) =>
        data.map((row, index) => {
            row.rank = index + 1;
            return row;
        });

    handleMoveRowUp = () => {
        if (!this.tabularPart || !this.state.table) return;

        const { selectedRows, totalRows } = this.getMoveRowState();
        if (!selectedRows.length || selectedRows.includes(0)) return;

        const sortedSelectedRows = [...selectedRows].sort((a, b) => a - b);
        const currentData = [...(this.dataManager.data?.record?.TabularParts?.[this.tabularPart.table] || [])];
        const newData = [...currentData];

        sortedSelectedRows.forEach((rowIndex) => {
            if (rowIndex > 0) {
                [newData[rowIndex - 1], newData[rowIndex]] = [newData[rowIndex], newData[rowIndex - 1]];
            }
        });

        // пересчёт индексов при изменении позиции строки
        const reindexedData = this.recalculateRanks(newData);

        this.dataManager.data.record.TabularParts[this.tabularPart.table] = reindexedData;

        const newSelectedRows = selectedRows.map((index) => index - 1);

        let newActiveCellRowIndex: number | undefined;
        if (
            this.state.table.activeCell?.rowIndex !== undefined &&
            selectedRows.includes(this.state.table.activeCell.rowIndex)
        ) {
            newActiveCellRowIndex = this.state.table.activeCell.rowIndex - 1;
        }

        this.updateStateAfterRowMove(newSelectedRows, newActiveCellRowIndex);
    };

    handleMoveRowDown = () => {
        if (!this.tabularPart || !this.state.table) return;

        const { selectedRows, totalRows } = this.getMoveRowState();
        if (!selectedRows.length || selectedRows.includes(totalRows - 1)) return;

        const sortedSelectedRows = [...selectedRows].sort((a, b) => b - a);
        const currentData = [...(this.dataManager.data?.record?.TabularParts?.[this.tabularPart.table] || [])];
        const newData = [...currentData];

        sortedSelectedRows.forEach((rowIndex) => {
            if (rowIndex < totalRows - 1) {
                [newData[rowIndex], newData[rowIndex + 1]] = [newData[rowIndex + 1], newData[rowIndex]];
            }
        });

        // пересчёт индексов при изменении позиции строки
        const reindexedData = this.recalculateRanks(newData);

        this.dataManager.data.record.TabularParts[this.tabularPart.table] = reindexedData;

        const newSelectedRows = selectedRows.map((index) => index + 1);

        let newActiveCellRowIndex: number | undefined;
        if (
            this.state.table.activeCell?.rowIndex !== undefined &&
            selectedRows.includes(this.state.table.activeCell.rowIndex)
        ) {
            newActiveCellRowIndex = this.state.table.activeCell.rowIndex + 1;
        }

        this.updateStateAfterRowMove(newSelectedRows, newActiveCellRowIndex);
    };

    getMoveRowState = () => {
        const selectedRows = this.state?.selectRows || [];
        const totalRows = this.state?.table?.rowsCount || 0;

        return getMoveRowAvailability(selectedRows, totalRows);
    };

    updateStateAfterRowMove = (newSelectedRows: number[], newActiveCellRowIndex?: number) => {
        this.setState((prevState) => {
            if (!prevState.table) return prevState;

            const updatedData = this.transformTabularData(
                this.dataManager.data?.record?.TabularParts?.[this.tabularPart!.table] || [],
                prevState.table.cols,
                this.dataManager.metadata.treeObject.TabularParts[this.tabularPart!.table].info.Fields,
            );

            return {
                selectRows: newSelectedRows,
                lastSelectedRow: newSelectedRows.length > 0 ? newSelectedRows[0] : null,
                table: {
                    ...prevState.table,
                    data: updatedData.data,
                    rowsCount: updatedData.data.length,
                    activeCell: prevState.table.activeCell
                        ? {
                              ...prevState.table.activeCell,
                              rowIndex:
                                  newActiveCellRowIndex !== undefined
                                      ? newActiveCellRowIndex
                                      : prevState.table.activeCell.rowIndex,
                          }
                        : null,
                },
            };
        });
    };

    controlButtonBuilder = () => {
        if (!this.props.buttons?.length) return [];

        const hasRows = this.tabularPart && this.dataManager.data?.record?.TabularParts?.[this.tabularPart.table]?.length > 0;

        const { canMoveUp, canMoveDown } = this.getMoveRowState();

        const result = this.props.buttons.map((Child) => {
            let extraProps = {};

            switch (Child.props.name) {
                case 'AddRow':
                    extraProps = {
                        onClick: this.handleAddRow,
                    };
                    break;

                case 'DeleteRow':
                    extraProps = {
                        onClick: this.handleDeleteRow,
                        disabled: !hasRows,
                    };
                    break;

                case 'CopyRow':
                    extraProps = {
                        onClick: this.handleCopyRow,
                        disabled: !hasRows || !this.state.selectRows.length,
                    };
                    break;

                case 'MoveRow':
                    extraProps = {
                        onMoveUp: this.handleMoveRowUp,
                        onMoveDown: this.handleMoveRowDown,
                        canMoveUp,
                        canMoveDown,
                    };
                    break;
            }

            return React.cloneElement(Child, {
                ...extraProps,
                tabularPartName: this.tabularPart?.table,
                DataManager: this.props.DataManager,
                row: this.state.table?.activeCell?.rowIndex,
            });
        });

        return result;
    };

    render() {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        if (!this.canBeRendered) {
            return (
                <ErrorBoundary
                    downloadLogs={{
                        logObj: { props: propsWithoutDataManager, state: this.state },
                        fileName: generateLogsFileName('MetadataForms_TabularPart_TabularPartContent'),
                    }}
                >
                    <div>Табличная часть не правильно настроена</div>
                </ErrorBoundary>
            );
        }

        if (!this.state.table) {
            return (
                <ErrorBoundary
                    downloadLogs={{
                        logObj: { props: propsWithoutDataManager, state: this.state },
                        fileName: generateLogsFileName('MetadataForms_TabularPart_TabularPartContent'),
                    }}
                >
                    <div>Загрузка данных...</div>
                </ErrorBoundary>
            );
        }

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_TabularPart_TabularPartContent'),
                }}
            >
                <div className={styles.wrapper}>
                    <div className={styles.header}>
                        <div className={styles.headerName}>{this.tabularPart?.name}</div>
                        <div className={styles.controlls}>{this.controlButtonBuilder()}</div>
                    </div>

                    <div ref={this.containerRef} style={{ height: this.props.height ?? 400 }}>
                        <ReactWindowWrapper
                            ref={this.tableRef}
                            data={this.state.table.data}
                            dataManager={DataManager}
                            cols={this.state.table.cols}
                            activeCell={this.state.table.activeCell}
                            selectedRows={this.state.selectRows}
                            renderMetaInput={this.renderCellContent}
                            onCellClick={this.handleCellClick}
                            onDoubleClick={this.handleCellDoubleClick}
                            onKeyDown={this.handleKeyDown}
                            onSort={this.onSort}
                            table={this.tabularPart.table}
                        />
                    </div>
                </div>
            </ErrorBoundary>
        );
    }
}

export class TabularPart extends Component<ITabularPartProps> {
    render(): ReactNode {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: {} },
                    fileName: generateLogsFileName('MetadataForms_TabularPart_TabularPart'),
                }}
            >
                <TabularPartContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
