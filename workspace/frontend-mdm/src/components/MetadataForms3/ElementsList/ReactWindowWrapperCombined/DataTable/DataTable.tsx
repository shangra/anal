import { Component, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import './DataTable.css'
import { isTreeRow, normalizeCells } from '../../groupTableRows'
import { ICell } from '../../types'
import { GroupMarkerDown } from './Icons/groupMarkerDown'
import { GroupMarkerRight } from './Icons/groupMarkerRight'
import { ITreeRow, IInnerColumnMetadataProps, IReactWindowWrapperCombined } from '../types'
import {
    getConditionalFormattingSettingsState,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
    getListSettingsRevision,
} from '../../../../../helpers/listSettings'
import {
    resolveConditionalCellDecoration,
    resolveSubstringAppearance,
    ruleMatchesCondition,
    type ConditionalCellDecoration,
} from '../../../../../helpers/listSettings/facets/conditionalFormatting/apply'

function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
    return String(value)
}

function findAppliedStyle(
    rowCells: ICell[],
    columnIndex: number,
    rules: import('../../../../../helpers/listSettings/facets/conditionalFormatting/types').ConditionalFormattingRule[],
): ConditionalCellDecoration | null {
    const rowData: Record<string, unknown> = {}
    for (const cell of rowCells) {
        rowData[cell.columnName] = cell.value.viewedData ?? cell.value.originalData
    }

    const column = rowCells[columnIndex]
    if (!column) return null

    const decoration = resolveConditionalCellDecoration(rowData, column.columnName, rules)
    if (!decoration) return null

    return decoration
}

function getLeafCells(item: ICell | ICell[] | ITreeRow | Record<string, unknown>[]): ICell[] | null {
    if (Array.isArray(item)) {
        if (item.length === 0) return []
        if ('columnName' in item[0]) return item as ICell[]
        return null
    }
    if (isTreeRow(item) && !item.isGroup) {
        return normalizeCells(item.cells)
    }
    return null
}

interface TreeRowsProps {
    rows: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[]
    columns: IInnerColumnMetadataProps[]
    gridStyle: CSSProperties
    depth?: number
    expandedGroups: Set<string>
    onToggleGroup: (key: string) => void
    selectedRows?: number[]
    onRowClick?: (event: ReactMouseEvent<HTMLDivElement>, rowIndex: number) => void
    conditionalFormattingRules?: import('../../../../../helpers/listSettings/facets/conditionalFormatting/types').ConditionalFormattingRule[]
}

/**
 * Собирает все groupKey, которым нужно применить styling из rules с applyToSubstrings.
 * Если leaf row удовлетворяет условию правила, все ancestor groupKey на пути к нему тоже получают styling.
 */
function collectAncestorGroupKeys(
    children: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[],
    rules: import('../../../../../helpers/listSettings/facets/conditionalFormatting/types').ConditionalFormattingRule[],
    parentKey: string | null,
    matchedKeys: Set<string>,
    parentPath: string[],
): void {
    for (const child of children) {
        if (isTreeRow(child) && child.isGroup) {
            const childKey = String(child.groupKey ?? 'unknown')
            const newPath = [...parentPath, childKey]
            const childChildren = (child.children ?? []) as typeof children

            // Рекурсивно проверяем вложенные группы
            collectAncestorGroupKeys(childChildren, rules, childKey, matchedKeys, newPath)

            // Проверяем leaf rows напрямую вложенные
            const childRowData: Record<string, unknown>[] = []
            for (const gc of childChildren) {
                const leaf = getLeafCells(gc)
                if (leaf) {
                    const rowData: Record<string, unknown> = {}
                    for (const cell of leaf) {
                        rowData[cell.columnName] = cell.value.viewedData ?? cell.value.originalData
                    }
                    childRowData.push(rowData)
                }
            }

            // Проверяем, есть ли matching child у этой группы
            for (const rule of rules) {
                if (!rule.enabled || !rule.applyToSubstrings) continue
                const hasMatch = childRowData.some(cd => ruleMatchesCondition(rule, cd))
                if (hasMatch) {
                    // Применяем ко всем ancestor groupKey (включая текущий)
                    for (const ak of newPath) {
                        matchedKeys.add(ak)
                    }
                }
            }
        } else {
            // Leaf row: проверяем прямо
            const leaf = getLeafCells(child)
            if (!leaf) continue
            const rowData: Record<string, unknown> = {}
            for (const cell of leaf) {
                rowData[cell.columnName] = cell.value.viewedData ?? cell.value.originalData
            }
            // Применяем ко всем parent groups на пути
            for (const parentKey of parentPath) {
                for (const rule of rules) {
                    if (!rule.enabled || !rule.applyToSubstrings) continue
                    if (ruleMatchesCondition(rule, rowData)) {
                        matchedKeys.add(parentKey)
                    }
                }
            }
        }
    }
}

class TreeRows extends Component<TreeRowsProps> {
    handleGroupClick = (groupKey: string) => {
        this.props.onToggleGroup(groupKey)
    }

    getFormattingRules(): typeof this.props.conditionalFormattingRules {
        if (this.props.conditionalFormattingRules) return this.props.conditionalFormattingRules
        const state = getConditionalFormattingSettingsState()
        return state.conditionalFormattingRules ?? []
    }

    render(): ReactNode {
        const {
            rows, columns, gridStyle, depth = 0, expandedGroups, onToggleGroup, selectedRows, onRowClick,
        } = this.props
        const rules = this.getFormattingRules()

        // Собираем все groupKey, которым нужен styling из applyToSubstrings
        const matchedGroupKeys = new Set<string>()
        for (const item of rows) {
            if (isTreeRow(item) && item.isGroup) {
                const groupKey = String(item.groupKey ?? 'unknown')
                const children = (item.children ?? []) as (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[]
                collectAncestorGroupKeys(children, rules ?? [], groupKey, matchedGroupKeys, [groupKey])
            }
        }

        return (
            <>
                {rows.map((item, index) => {
                    if (isTreeRow(item) && item.isGroup) {
                        const groupValue = formatCellValue(item.groupValue)
                        const groupKey = String(item.groupKey ?? `group-${depth}-${index}`)
                        const isExpanded = expandedGroups.has(groupKey)
                        const isMatched = matchedGroupKeys.has(groupKey)
                        const children = (item.children ?? []) as (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[]

                        // Применяем appearance только если эта группа-ancestor matching leaf
                        const groupRowStyle: CSSProperties = isMatched ? resolveSubstringAppearance([], rules ?? []) : {}

                        return (
                            <div key={`group-${depth}-${index}-${groupKey}`} className="data-table__group">
                                <div
                                    className="data-table__group-row"
                                    style={{ ...groupRowStyle, paddingLeft: 12 + depth * 20 }}
                                    onClick={() => this.handleGroupClick(groupKey)}
                                >
                                    <span className="data-table__group-marker">{isExpanded ? < GroupMarkerDown /> : <GroupMarkerRight />}</span>
                                    <span className="data-table__group-value">{groupValue}</span>
                                </div>
                                {isExpanded && (
                                    <TreeRows
                                        rows={children}
                                        columns={columns}
                                        gridStyle={gridStyle}
                                        depth={depth + 1}
                                        expandedGroups={expandedGroups}
                                        onToggleGroup={onToggleGroup}
                                        selectedRows={selectedRows}
                                        onRowClick={onRowClick}
                                        conditionalFormattingRules={rules}
                                    />
                                )}
                            </div>
                        )
                    }

                    const cells = getLeafCells(item)
                    if (!cells) return null

                    // rowIndex сохраняется в ячейках при группировке/сортировке,
                    // поэтому сопоставление с selectedRows устойчиво к переупорядочиванию
                    const rowIndex = cells[0]?.rowIndex ?? -1
                    const isSelected = selectedRows?.includes(rowIndex) ?? false

                    const cellMap = Object.fromEntries(cells.map((c) => [c.columnName, c]))
                    const rowData: Record<string, unknown> = {}
                    for (const cell of cells) {
                        rowData[cell.columnName] = cell.value.viewedData ?? cell.value.originalData
                    }

                    const rulesApplied = rules ?? []

                    return (
                        <div
                            key={`row-${depth}-${index}`}
                            className={`data-table__row${isSelected ? ' data-table__row--selected' : ''}`}
                            style={{ ...gridStyle, paddingLeft: depth > 0 ? depth * 20 : 0 }}
                            onClick={(event) => onRowClick?.(event, rowIndex)}
                        >
                            {columns.map((col, colIndex) => {
                                const cell = cellMap[col.value]
                                const rawValue = cell?.value.viewedData ?? cell?.value.originalData
                                const cellText = formatCellValue(rawValue)
                                const decoration = findAppliedStyle(cells, colIndex, rulesApplied)

                                const displayText = decoration?.text
                                    ?? decoration?.formattedValue
                                    ?? cellText

                                const cellStyle: CSSProperties = decoration
                                    ? { ...decoration.style }
                                    : {}

                                return (
                                    <div
                                        key={col.id}
                                        className="data-table__cell"
                                        title={col.label}
                                        style={cellStyle}
                                    >
                                        {displayText}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </>
        )
    }
}

export class DataTable extends Component<IReactWindowWrapperCombined, { expandedGroups: Set<string>; listSettingsRevision: number }> {
    static SUBSCRIBER = 'DataTable'

    constructor(props: IReactWindowWrapperCombined) {
        super(props)
        this.state = {
            expandedGroups: new Set(),
            listSettingsRevision: getListSettingsRevision(),
        }
        subscribeListSettingsRevision(DataTable.SUBSCRIBER, () => {
            const rev = getListSettingsRevision()
            this.setState({ listSettingsRevision: rev })
            console.log('[DataTable] revision updated:', rev)
        })
    }

    componentWillUnmount() {
        unsubscribeListSettingsRevision(DataTable.SUBSCRIBER)
    }

    handleToggleGroup = (groupKey: string) => {
        this.setState(prev => {
            const next = new Set(prev.expandedGroups)
            if (next.has(groupKey)) {
                next.delete(groupKey)
            } else {
                next.add(groupKey)
            }
            return { expandedGroups: next }
        })
    }

    render(): ReactNode {
        const {
            data, columns = [], selectedRows, onRowClick,
        } = this.props
        const visibleColumns = columns.filter((c) => c.show !== false)
        const { expandedGroups } = this.state
        const rules = getConditionalFormattingSettingsState().conditionalFormattingRules

        const gridStyle: CSSProperties = {
            gridTemplateColumns: `repeat(${Math.max(visibleColumns.length, 1)}, minmax(140px, 1fr))`,
        }

        return (
            <div className="data-table">
                <div className="data-table__header" style={gridStyle}>
                    {visibleColumns.map((col) => (
                        <div key={col.id} className="data-table__header-cell">
                            {col.label}
                        </div>
                    ))}
                </div>
                <div className="data-table__body">
                    {data.length === 0 ? (
                        <div className="data-table__empty">Нет данных</div>
                    ) : (
                        <TreeRows
                            rows={data}
                            columns={visibleColumns}
                            gridStyle={gridStyle}
                            expandedGroups={expandedGroups}
                            onToggleGroup={this.handleToggleGroup}
                            selectedRows={selectedRows}
                            onRowClick={onRowClick}
                            conditionalFormattingRules={rules}
                        />
                    )}
                </div>
            </div>
        )
    }
}
