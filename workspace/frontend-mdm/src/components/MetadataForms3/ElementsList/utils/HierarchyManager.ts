import type DataManager from '../../DataManager'
import type { IElementsListState, IData } from '../types'
import type { TransformStateResult } from './transformStateForRender'

type GetHierarchyState = () => Pick<
    IElementsListState,
    'table' | 'data' | 'rowIndexToId' | 'hierarchyHistory'
>

type StateUpdater = React.Component<IElementsListProps, IElementsListState>['setState']
import type { IElementsListProps } from '../types'

type TransformFn = (data: IData) => TransformStateResult

interface HierarchyManagerDeps {
    dataManager: DataManager
    getState: GetHierarchyState
    setState: StateUpdater
    transformStateForRender: TransformFn
    fetchData: (parentId: string) => Promise<IData | undefined>
}

/**
 * Отвечает за: разворачивание/сворачивание древовидной структуры.
 */
export class HierarchyManager {
    private dataManager: DataManager
    private getState: GetHierarchyState
    private setState: StateUpdater
    private transformStateForRender: TransformFn
    private fetchData: HierarchyManagerDeps['fetchData']

    constructor(deps: HierarchyManagerDeps) {
        this.dataManager = deps.dataManager
        this.getState = deps.getState
        this.setState = deps.setState
        this.transformStateForRender = deps.transformStateForRender
        this.fetchData = deps.fetchData
    }

    async onHierarchyExpand(rowIndex: number): Promise<void> {
        const state = this.getState()
        const parentId = state.rowIndexToId[rowIndex]
        if (!state.table || !parentId) return

        this.dataManager.currentSort = null
        const data = await this.fetchData(parentId)
        if (!data) return
        if (!data.rows) data.rows = []

        const tableData = this.transformStateForRender(data)
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
            hierarchyHistory: [...prevState.hierarchyHistory!, parentId],
            selectRows: [],
        }))
    }

    async onHierarchyReduce(): Promise<void> {
        const state = this.getState()
        const hierarchyHistory = [...state.hierarchyHistory!]
        hierarchyHistory.pop()
        const prevParent = hierarchyHistory[hierarchyHistory.length - 1]
        this.dataManager.currentSort = null

        const data = await this.fetchData(prevParent)
        if (!data) return
        if (!data.rows) data.rows = []
        const tableData = this.transformStateForRender(data)

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
        })
    }
}
