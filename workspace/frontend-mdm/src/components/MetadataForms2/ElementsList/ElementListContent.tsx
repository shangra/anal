import { Component, type ReactNode } from 'react'
import { attachListSettingsRevision } from '../../../helpers/listSettings'
import {
    createSelectedEntitySubscriber,
    getSelectedEntity,
    subscribeSelectedEntity,
    unsubscribeSelectedEntity,
    type SelectedEntityData
} from '../../../helpers/selected-entity.helper'
import HooksManager from '../../../helpers/lite-react-hooks'
import { createEditForm } from '../Buttons/Edit/edit.helper'
import $windows from '../../ui/windows.helper'
import { HookKeyManager } from './utils/HookKeyManager'
import {
    handleTableSelection,
    selectAllRows,
    type SelectionState,
} from './ReactWindowWrapperCombined/utils/tableSelectionHelper'
import { tableNavigation } from './ReactWindowWrapperCombined/utils/tableNavigation'
import { ReactWindowWrapper } from './ReactWindowWrapperCombined'
import { transformRowsForHook } from './ReactWindowWrapperCombined/utils/transformRowsForHook'
import { DataTable } from './ReactWindowWrapperCombined/DataTable/DataTable'
import { updateColumnSortState } from './utils/tableSort.utils'
import type DataManager from '../DataManager'
import { MetaInput } from '../MetaInput'
import { TableShell } from './components/TableShell'
import type {
    CellInteractionPayload,
    CellRenderMetadata,
} from './ReactWindowWrapperCombined/types'
import {
    ELEMENT_LIST_SUBSCRIBER,
    LISTS_ENTITY_TITLE,
    RELOAD_LOCAL_KEY,
    ROOT_PARENT_UUID,
} from './constants'
import type {
    IActiveCell,
    ICell,
    IColumnConfig,
    IData,
    IDataColumn,
    IElementsListProps,
    IElementsListState,
    ITableState,
} from './types'
import {
    getTableConfigKey,
    loadColumnConfig,
    saveColumnConfig,
} from './utils/columnConfig'
import {
    toDataTableViewModel,
    toReactWindowTableData,
} from './utils/tableViewAdapters'
import { transformStateForRender } from './utils/transformStateForRender'
import { applySortToRows, getActiveListView } from '../../../helpers/listSettings'


export class ElementsListContent extends Component<
    IElementsListProps,
    IElementsListState
> {
    dataManager: DataManager
    formId: string
    stateKey: string
    reloadWithPaginationResetKey: string
    reloadWithoutPaginationResetKey: string
    reloadLocalKey: string

    constructor(props: Readonly<IElementsListProps>) {
        super(props)

        this.dataManager = props.DataManager
        this.dataManager.hookChangeFieldData(props.name ?? 'list', this)
        this.formId = this.dataManager.formId
        this.stateKey = this.dataManager.modalUUID ?? 'list'
        this.reloadWithPaginationResetKey = `${this.dataManager.modalUUID}_reload_with_pagination_reset`
        this.reloadWithoutPaginationResetKey = `${this.dataManager.modalUUID}_reload_without_pagination_reset`
        this.reloadLocalKey = RELOAD_LOCAL_KEY
        
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
        }
    }

    private detachListSettingsRevision: (() => void) | null = null

    componentDidMount(): void {
        this.detachListSettingsRevision = attachListSettingsRevision(this, ELEMENT_LIST_SUBSCRIBER)
    }

    componentWillUnmount(): void {
        this.detachListSettingsRevision?.()
    }

    componentDidUpdate(prevProps: IElementsListProps, prevState: IElementsListState): void {
        if (prevState.listSettingsRevision !== this.state.listSettingsRevision) {
            console.log('[ElementListContent] listSettingsRevision changed, re-sorting...')
            if (this.state.data && this.state.table && this.state.originalOrder) {
                const view = getActiveListView()
                
                // Если сортировка пуста, восстанавливаем исходный порядок
                if (view.activeSortRules.length === 0) {
                    console.log('[ElementListContent] no sort rules, restoring original order')
                    const sortedRows = this.restoreOriginalOrder(this.state.data.rows)
                    
                    const transformed = transformStateForRender({
                        data: { ...this.state.data, rows: sortedRows },
                        mergedColumns: this.props.mergedColumns,
                        visibleColumnNames: this.props.columns,
                        getFieldType: (fieldName) =>
                            this.dataManager.metadata.treeObject?.Fields?.[fieldName]?.type ?? '',
                    })

                    this.setState((prev) => {
                        if (!prev.table || !prev.data) return null
                        return {
                            table: {
                                ...prev.table,
                                data: transformed.data,
                                rowCount: transformed.data.length,
                            },
                            data: { ...prev.data, rows: sortedRows },
                        }
                    })
                    return
                }
                
                // Применяем сортировку
                const rows = this.state.data.rows as Record<string, unknown>[]
                const sortedRows = applySortToRows(rows, view)
                console.log('[ElementListContent] sorted:', sortedRows.length, 'first:', sortedRows[0]?.name)
                
                // Update table data with sorted rows
                const transformed = transformStateForRender({
                    data: { ...this.state.data, rows: sortedRows },
                    mergedColumns: this.props.mergedColumns,
                    visibleColumnNames: this.props.columns,
                    getFieldType: (fieldName) =>
                        this.dataManager.metadata.treeObject?.Fields?.[fieldName]?.type ?? '',
                })

                this.setState((prev) => {
                    if (!prev.table || !prev.data) return null
                    return {
                        table: {
                            ...prev.table,
                            data: transformed.data,
                            rowCount: transformed.data.length,
                        },
                        data: { ...prev.data, rows: sortedRows },
                    }
                })
            }
        }
    }

    private restoreOriginalOrder(rows: Record<string, unknown>[]): Record<string, unknown>[] {
        if (!this.state.originalOrder) return rows
        const idToRow = new Map<string, Record<string, unknown>>()
        rows.forEach((row) => {
            const id = (row.id as string) ?? String(row)
            idToRow.set(id, row)
        })
        
        const ordered: Record<string, unknown>[] = []
        for (const key of Object.keys(this.state.originalOrder).map(Number).sort((a, b) => a - b)) {
            const id = this.state.originalOrder![key]
            const row = idToRow.get(id)
            if (row) {
                ordered.push(row)
            }
        }
        
        return ordered
    }

    changeMasterData(list: Record<string, unknown>[]): void {
        if (!Array.isArray(list)) return

        const costil: IData = {
            cols: [...((this.dataManager.meta.list?.cols as IData['cols']) ?? [])],
            refs: { ...(this.dataManager.meta.list?.refs ?? {}) },
            rows: [...list],
            count: this.dataManager.meta.list?.count ?? list.length,
        }

        // Сохраняем исходный порядок до сортировки
        const originalOrder: Record<number, string> = {}
        costil.rows.forEach((row, index) => {
            const id = (row.id as string) ?? `row-${index}`
            originalOrder[index] = id
        })

        // Apply sort from list settings
        const view = getActiveListView()
        console.log('[changeMasterData] before sort, list.length:', list.length)
        console.log('[changeMasterData] activeSortRules:', view.activeSortRules.length, view.activeSortRules)
        const sortedRows = applySortToRows(list, view)
        console.log('[changeMasterData] after sort, sortedRows.length:', sortedRows.length)
        if (sortedRows.length > 0) {
            console.log('[changeMasterData] first row:', sortedRows[0])
        }

        this.setState({ loading: true }, () => {
            this.initializeState({ ...costil, rows: sortedRows }, originalOrder)
            this.setState((prev) => ({
                infiniteScroll: {
                    ...prev.infiniteScroll,
                    pages: this.dataManager.pages ?? 1,
                }
            }))
        })
    }

    initializeState = (data: IData, originalOrder?: Record<number, string>): void => {
        console.log('[initializeState] data.rows.length:', data.rows?.length)
        if (data.rows?.length > 0) {
            console.log('[initializeState] first row name:', data.rows[0].name)
        }
        if (Object.keys(data).length === 0) {
            this.setState({ data: null, table: null, loading: false, originalOrder: null })
            return
        }

        loadColumnConfig(
            getTableConfigKey(this.formId, this.props.name),
            this.props.mergedColumns,
            Boolean(this.getHierarchyFlag()),
        )

        const tableData = this.transformStateForRenderProps(data)
        let colsWithSort = tableData.cols

        if (this.dataManager.currentSort) {
            colsWithSort = updateColumnSortState(
                colsWithSort,
                this.dataManager.currentSort.column,
                this.dataManager.currentSort.direction,
            )
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
                    meta: { prevEditableCell: null },
                },
                rowIndexToId: tableData.indexToId,
                loading: false,
                originalOrder: originalOrder ?? null,
            },
            () => this.setDefaultSelection(),
        )
    }

    private publishSelection(selectedIndexes: number[]): void {
        if (!this.state.data) return

        const selectedDataRows = selectedIndexes.map(
            (index) => this.state.data!.rows[index],
        )
        this.dataManager.selectedRows = selectedDataRows

        HooksManager.setHook(
            HookKeyManager.selectRows(
                this.stateKey,
                this.formId,
                transformRowsForHook(selectedDataRows),
            ),
        )
    }

    changeRow = (rowIndex: number, isMultipleSelect = false): void => {
        if (!this.state.data) return

        let newSelectedRows: number[]
        if (isMultipleSelect) {
            const isAlreadySelected = this.state.selectRows.includes(rowIndex)
            newSelectedRows = isAlreadySelected
                ? this.state.selectRows.filter((index) => index !== rowIndex)
                : [...this.state.selectRows, rowIndex]
        } else {
            newSelectedRows = [rowIndex]
        }

        this.setState({ selectRows: newSelectedRows })
        this.publishSelection(newSelectedRows)
    }

    handleSelection = (event: React.MouseEvent, rowIndex: number): void => {
        if (!this.state.table?.data || !this.state.data) return

        const currentState: SelectionState = {
            selectedRows: this.state.selectRows,
            lastSelectedRow: this.state.lastSelectedRow,
        }

        const newState = handleTableSelection(rowIndex, currentState, {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
        })

        this.setState({
            lastSelectedRow: newState.lastSelectedRow,
            selectRows: newState.selectedRows,
        })
        this.publishSelection(newState.selectedRows)
    }

    deselectAllRows = (): void => {
        this.setState({
            selectRows: [],
            table: this.state.table
                ? { ...this.state.table, activeCell: null }
                : null,
        })
        this.dataManager.selectedRows = []
        HooksManager.setHook(
            HookKeyManager.deselectAll(this.stateKey, this.formId),
        )
    }

    handleActiveCellChange = (activeCell: IActiveCell | null): void => {
        if (!activeCell) return
        this.setState((prev) => ({
            table: prev.table ? { ...prev.table, activeCell } : null,
        }))
        this.changeRow(activeCell.rowIndex)
    }

    getHierarchyFlag = (): boolean =>
        Boolean(this.dataManager?.metadata?.manifest?.settings?.hierarchical)

    transformStateForRenderProps = (data: IData) =>
        transformStateForRender({
            data,
            mergedColumns: this.props.mergedColumns,
            visibleColumnNames: this.props.columns,
            getFieldType: (fieldName) =>
                this.dataManager.metadata.treeObject?.Fields?.[fieldName]?.type ?? '',
        })

    fetchData = async (parentId: string): Promise<IData | undefined> => {
        if (!this.state.table || !this.state.data) return

        this.dataManager.options = {
            ...this.dataManager.options,
            where: {
                ...this.dataManager.options.where,
                parent: parentId,
            },
            limit: this.dataManager.options.limit ?? 200,
            offset: 0,
            withHierarchy: true,
        }

        await this.dataManager.ReloadData()

        const listMeta = this.dataManager.meta.list
        const listRows = Array.isArray(this.dataManager.data.list)
            ? this.dataManager.data.list
            : []

        return {
            cols: (listMeta?.cols as IDataColumn[]) ?? [],
            refs: { ...(listMeta?.refs ?? {}) },
            rows: [...listRows],
            count: (listMeta?.count as number | undefined) ?? listRows.length,
        }
    }

    onHierarchyExpand = async (rowIndex: number): Promise<void> => {
        const parentId = this.state.rowIndexToId[rowIndex]
        if (!this.state.table || !parentId) return

        this.dataManager.currentSort = null
        const data = await this.fetchData(parentId)
        if (!data) return
        if (!data.rows) data.rows = []

        // Сохраняем исходный порядок для иерархии
        const originalOrder: Record<number, string> = {}
        data.rows.forEach((row, index) => {
            const id = (row.id as string) ?? `row-${index}`
            originalOrder[index] = id
        })

        // Apply sort to expanded data
        const view = getActiveListView()
        const sortedRows = applySortToRows(data.rows, view)
        data.rows = sortedRows

        const tableData = this.transformStateForRenderProps(data)
        this.setState((prevState) => ({
            ...prevState,
            data,
            table: {
                data: tableData.data,
                cols: tableData.cols,
                columnsCount: tableData.cols.length,
                rowCount: tableData.data.length,
                activeCell: null,
                meta: { prevEditableCell: null },
            },
            rowIndexToId: tableData.indexToId,
            hierarchyHistory: [...prevState.hierarchyHistory, parentId],
            selectRows: [],
            originalOrder,
        }))
    }

    onHierarchyReduce = async (): Promise<void> => {
        const hierarchyHistory = [...this.state.hierarchyHistory]
        hierarchyHistory.pop()
        const prevParent = hierarchyHistory[hierarchyHistory.length - 1]
        this.dataManager.currentSort = null

        const data = await this.fetchData(prevParent)
        if (!data) return
        if (!data.rows) data.rows = []
        
        // Сохраняем исходный порядок для иерархии
        const originalOrder: Record<number, string> = {}
        data.rows.forEach((row, index) => {
            const id = (row.id as string) ?? `row-${index}`
            originalOrder[index] = id
        })
        
        // Apply sort to reduced data
        const view = getActiveListView()
        const sortedRows = applySortToRows(data.rows, view)
        data.rows = sortedRows

        const tableData = this.transformStateForRenderProps(data)

        this.setState({
            data,
            hierarchyHistory,
            table: {
                data: tableData.data,
                cols: tableData.cols,
                columnsCount: tableData.cols.length,
                rowCount: tableData.data.length,
                activeCell: null,
                meta: { prevEditableCell: null },
            },
            rowIndexToId: tableData.indexToId,
            selectRows: [],
            originalOrder,
        })
    }

    onSort = async (columnName: string): Promise<void> => {
        if (!this.state.table || !this.state.data) return

        const currentCols = this.state.table.cols
        const newOrder: 'ASC' | 'DESC' =
            this.dataManager.currentSort?.column === columnName &&
                this.dataManager.currentSort?.direction === 'ASC'
                ? 'DESC'
                : 'ASC'

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
        }))

        this.dataManager.currentSort = {
            column: columnName,
            direction: newOrder,
        }

        const hierarchyLength = this.state.hierarchyHistory.length
        const hierarchyParent =
            hierarchyLength > 1
                ? this.state.hierarchyHistory[hierarchyLength - 1]
                : undefined

        const tempOptions = {
            ...this.dataManager.options,
            order: [[columnName, newOrder]],
            offset: 0,
        } as typeof this.dataManager.options

        if (hierarchyParent && hierarchyParent !== ROOT_PARENT_UUID) {
            tempOptions.withHierarchy = true
            tempOptions.where = {
                ...tempOptions.where,
                parent: ROOT_PARENT_UUID,
            }
        }

        this.dataManager.options = tempOptions
        try {
            await this.dataManager.ReloadData()
        } catch (error) {
            console.error('Sorting error:', error)
            this.setState((prev) => ({
                table: prev.table ? { ...prev.table, cols: currentCols } : null,
            }))
        }
    }

    loadPage = (page: number): void => {
        if (page < 1 || this.state.loading) return
        this.setState({ loading: true })

        const offset = (page - 1) * this.state.infiniteScroll.limit
        this.dataManager.options = {
            ...this.dataManager.options,
            offset,
        }

        this.setState((prev) => ({
            infiniteScroll: {
                ...prev.infiniteScroll,
                offset,
                currentPage: page,
                hasPrev: page > 1,
                hasNext: page < prev.infiniteScroll.pages,
            }
        }))

        this.dataManager.ReloadData().finally(() => {
            this.setState({ loading: false })
        })
    }

    loadNext = (): void => {
        const { currentPage, pages } = this.state.infiniteScroll
        if (currentPage < pages) this.loadPage(currentPage + 1)
    }

    loadPrev = (): void => {
        const { currentPage } = this.state.infiniteScroll
        if (currentPage > 1) this.loadPage(currentPage - 1)
    }

    handleReload = (resetPagination = false): void => {
        const newOptions = {
            ...this.dataManager.options,
            limit: this.state.infiniteScroll.limit,
            offset: resetPagination ? 0 : this.dataManager.options.offset,
        }

        if (this.dataManager.currentSort) {
            newOptions.order = [
                [
                    this.dataManager.currentSort.column,
                    this.dataManager.currentSort.direction,
                ],
            ]
        }

        this.dataManager.options = newOptions
        this.setState({ loading: true }, () => {
            void this.dataManager.ReloadData().finally(() => {
                this.setState({ loading: false })
            })
        })
    }

    handleColumnConfigChange = (
        newConfig: (IColumnConfig | IColumnConfig[])[],
    ): void => {
        this.setState((prev) => ({
            table: prev.table
                ? { ...prev.table, columnConfig: newConfig }
                : null,
        }))
        saveColumnConfig(
            getTableConfigKey(this.formId, this.props.name),
            newConfig,
        )
    }

    openEditForm = (): void => {
        try {
            const formConfig = createEditForm(this.dataManager)
            $windows.open(formConfig.title, formConfig.content, formConfig.options)
        } catch (error) {
            console.error('Error opening edit form:', error)
        }
    }

    handleDoubleClick = (): void => this.openEditForm()

    handleEnterKeydown = (): void => {
        if (!this.dataManager?.selectedRows?.length) {
            console.warn('No rows selected for editing')
            return
        }
        this.openEditForm()
    }

    renderCellContent = (
        cellData: ICell | ICell[],
        _metadata: CellRenderMetadata,
    ): ReactNode  => {
        const cell = Array.isArray(cellData) ? cellData[0] : cellData
        if (!cell) return null

        const { columnName, rowIndex } = cell
        const cellKey = `${rowIndex}-${columnName}`
        const isEditable = this.state.editableCell === cellKey

        return (
            <MetaInput
                DataManager={this.dataManager}
                field={`list.${rowIndex}.${columnName}`}
                readOnly={!isEditable}
                table
                fullWidth
                border={false}
                onDoubleClick={(event) => {
                    event.stopPropagation()
                    this.handleDoubleClick()
                }}
                onChange={() => {}}
            />
        )
    }

    handleCellClick = (
        event: React.MouseEvent,
        payload: CellInteractionPayload,
    ): void => {
        this.handleActiveCellChange({
            rowIndex: payload.rowIndex,
            columnIndex: payload.columnIndex,
            sourceEvent: { type: 'mouse' },
        })
        this.handleSelection(event, payload.rowIndex)
    }

    handleKeyDown = (
        event: React.KeyboardEvent,
        _cellData: ICell | ICell[] | null,
    ): void => {
        if (!this.state.table) return

        const { data, cols, rowCount, columnsCount, activeCell } = this.state.table
        if (!activeCell) return

        if (event.code === 'Enter') {
            this.handleEnterKeydown()
            return
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault()
            const rowIndex = [
                ...new Set(
                    data
                        .flat()
                        .map((cell) => 
                            Array.isArray(cell)
                                ? cell[0]?.rowIndex
                                : 'rowIndex' in cell
                                    ? cell.rowIndex
                                    : undefined,
                        )
                        .filter((x): x is number => x != null),
                ),
            ]

            const newSelectionState = selectAllRows(rowIndex)
            this.setState({
                lastSelectedRow: newSelectionState.lastSelectedRow,
                selectRows: newSelectionState.selectedRows,
            })
            this.publishSelection(rowIndex)
            return
        }

        if (event.code === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (event.code === 'Tab') {
            event.preventDefault()
            const flatData = data.flat()
            const newActiveCell = event.shiftKey
                ? tableNavigation.getPrevCell(
                    activeCell,
                    rowCount,
                    columnsCount,
                    flatData,
                    cols,
                )
                : tableNavigation.getNextCell(
                    activeCell,
                    rowCount,
                    columnsCount,
                    flatData,
                    cols,
                )

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: {
                    type: 'keyboard',
                    direction: event.shiftKey ? 'left' : 'right',
                },
            })
            return
        }

        if (
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)
        ) {
            event.preventDefault()
            const direction = event.code.replace('Arrow', '').toLowerCase() as
                | 'up'
                | 'down'
                | 'left'
                | 'right'

            const newActiveCell = tableNavigation.getCellByDirection(
                activeCell,
                direction,
                rowCount,
                columnsCount,
                data.flat(),
            )

            this.handleActiveCellChange({
                ...newActiveCell,
                sourceEvent: { type: 'keyboard', direction },
            })
        }
    }

    setDefaultSelection = (): void => {
        const { table } = this.state
        if (!table || table.data.length === 0 || table.cols.length === 0) return

        this.setState({
            table: {
                ...table,
                activeCell: { rowIndex: 0, columnIndex: 0 },
            },
        })
        this.changeRow(0)
    }

    private getSelectedEntityFromStore(): SelectedEntityData {
        return getSelectedEntity()
    }

    private isListsMode(): boolean {
        const entity = this.getSelectedEntityFromStore()
        return entity.title.trim().toLowerCase() === LISTS_ENTITY_TITLE
    }

    private getShellProps() {
        const { DataManager: _dm, ...propsWithoutDataManager } = this.props
        return {
            logName: 'MetadadaForms_ElementsList_ElementsListContent',
            logProps: propsWithoutDataManager,
            logState: this.state,
        }
    }

    private renderFlatTable(table: ITableState): ReactNode {
        const { currentPage, pages } = this.state.infiniteScroll
        console.log('[renderFlatTable] table.data.length:', table.data?.length)
        if (table.data?.length > 0) {
            const firstRow = (table.data as ICell[][])?.[0]?.[0]
            console.log('[renderFlatTable] first row cell:', firstRow)
        }
        const data = toReactWindowTableData(table.data as (ICell | ICell[])[][])

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
                    onSort={(columnName: string) => {
                        void this.onSort(columnName)
                    }}
                    onCellClick={this.handleCellClick}
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
        )
    }

    private renderListTable(table: ITableState): ReactNode {
        const { data, columns } = toDataTableViewModel({
            rows: table.data as (ICell | ICell[])[][],
            cols: table.cols,
        })

        return (
            <TableShell {...this.getShellProps()} bodyOverflow="auto">
                <DataTable data={data} columns={columns} />
            </TableShell>
        )
    }

    render(): ReactNode {
        const { table, listSettingsRevision } = this.state
        void listSettingsRevision
        if (!table) return null

        return this.isListsMode()
            ? this.renderFlatTable(table)
            : this.renderFlatTable(table)
    }
}