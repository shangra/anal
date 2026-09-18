import { Table, TableBody, TableHead, TableRow, TableCell, Tabs, Tab } from 'ui-kit';
import style from './metadataTable.module.css';
import { FormMetadata } from 'components/FormMetadata';
import { Column, DataRow, DataTableProps, DataTableState, FilterCondition, SortDirection } from './types';
import { buildWhereClause, buildOrderClause } from 'components/MetadataTable/lib/query';
import { DataTableCell } from 'components/MetadataTable/components/DataTableCell';
import { DataTableHeaderCell } from 'components/MetadataTable/components/DataTableHeaderCell';
import { DragScrollController } from 'components/MetadataTable/lib/DragScrollController';
import { Component, ReactNode } from 'react';
import $windows from 'components/WindowsCMP/windows.helper';
import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';

const EMPTY_TABLE_DATA = { rows: [] as DataRow[], cols: [] as Column[], refs: {} };

/**
 * Таблица данных мета-айца.
 * Управляет:
 * - загрузкой данных с сервера (с фильтрами / сортировкой)
 * - состоянием фильтров и сортировки
 * - открытием формы редактирования строки
 */
export class MetadataTable extends Component<DataTableProps, DataTableState> {
    private readonly dragCtrl = new DragScrollController(style.horizontalScroll_dragging);

    constructor(props: DataTableProps) {
        super(props);
        this.state = {
            data: props.data ?? EMPTY_TABLE_DATA,
            lastPropsData: props.data ?? EMPTY_TABLE_DATA,
            filters: {},
            sort: null,
            tab: 0,
        };
    }

    static getDerivedStateFromProps(props: DataTableProps, state: DataTableState): Partial<DataTableState> | null {
        const incoming = props.data ?? EMPTY_TABLE_DATA;
        if (incoming !== state.lastPropsData) {
            return { data: incoming, lastPropsData: incoming };
        }
        return null;
    }

    componentWillUnmount(): void {
        this.dragCtrl.destroy();
    }

    /* Server */
    private async fetchData(): Promise<void> {
        const { id, route, server } = this.props;
        const { filters, sort } = this.state;

        const queryOptions: Record<string, unknown> = {
            limit: 200,
            offset: 0,
            withOutCount: true,
        };

        const where = buildWhereClause(filters);
        const order = buildOrderClause(sort);

        if (where) queryOptions.where = where;
        if (order) queryOptions.order = order;

        const params = `options=${encodeURIComponent(JSON.stringify(queryOptions))}`;

        const url = buildUrl(server, `metadata/${route}/${id}?${params}`);
        const res = await $api.get(url);
        this.setState((prev) => ({
            data: { ...(res.data as any), ddl: (res.data as any).ddl ?? prev.data.ddl },
        }));
    }

    /* Filter / Sort handlers */
    private handleFilterApply = (field: string, condition: FilterCondition | null): void => {
        this.setState(
            (prev) => {
                const filters = { ...prev.filters };
                if (condition) {
                    filters[field] = condition;
                } else {
                    delete filters[field];
                }
                return { filters };
            },
            () => {
                this.fetchData();
            },
        );
    };

    private handleToggleSort = (field: string): void => {
        this.setState(
            (prev) => {
                const cur = prev.sort;
                if (cur?.field === field) {
                    if (cur.direction === 'ASC') {
                        return { sort: { field, direction: 'DESC' as SortDirection } };
                    }
                    return { sort: null };
                }
                return { sort: { field, direction: 'ASC' as SortDirection } };
            },
            () => {
                this.fetchData();
            },
        );
    };

    private getRefOptions = (col: Column) => {
        const refs = this.state.data.refs[col.field];
        if (!refs) return undefined;
        return Object.entries(refs).map(([value, label]) => ({ value, label }));
    };

    /* Row click — open editor */
    private openField = (row: DataRow): void => {
        if (this.dragCtrl.isSuppressingClick) return;

        const { metadata } = this.props.data;

        if (row.id && metadata) {
            $windows.open(
                'Редактирование',
                <FormMetadata
                    id={metadata.id}
                    type="element"
                    element={row.id}
                    primaryKey="id"
                    payload={{
                        modalUUID: `element-${row.id}`,
                        parentModalUUID: metadata.id,
                    }}
                    onClose={this.handleCloseEditor}
                />,
                { width: '800px', uuid: `element-${row.id}` },
            );
        }
    };

    private handleCloseEditor = (): void => {
        this.fetchData().catch((e) => console.error(e));
    };

    render(): ReactNode {
        const { rows, cols, query, ddl } = this.state.data;
        const visibleCols = (cols || []).filter((c) => c.show !== false);
        const hasSql = Boolean(query);
        const hasDdl = Boolean(ddl);

        return (
            <div className={style.root}>
                <Tabs
                    value={this.state.tab}
                    onChange={(index: number) => this.setState({ tab: index })}
                    variant="rounded"
                    className={style.tabs}
                >
                    <Tab label="Данные" />
                    <Tab label="SQL" disabled={!hasSql} />
                    <Tab label="DDL" disabled={!hasDdl} />
                </Tabs>
                {this.state.tab === 1 ? (
                    <pre className={style.code}>{query || 'SQL недоступен для этого объекта'}</pre>
                ) : this.state.tab === 2 ? (
                    <pre className={style.code}>{ddl || 'DDL недоступен для этого объекта'}</pre>
                ) : !rows || rows.length === 0 ? (
                    <div className={style.emptyTable}>Нет данных для отображения</div>
                ) : (
                    <div className={style.wrapper}>
                        <div
                            className={style.horizontalScroll}
                            ref={this.dragCtrl.ref}
                            onPointerDown={this.dragCtrl.onPointerDown}
                            onPointerMove={this.dragCtrl.onPointerMove}
                            onPointerUp={this.dragCtrl.onPointerUp}
                            onPointerCancel={this.dragCtrl.onPointerCancel}
                        >
                            <Table stickyHeader className={style.metadataTable}>
                                <TableHead>
                                    <TableRow>
                                        {visibleCols.map((col) => (
                                            <DataTableHeaderCell
                                                key={col.id}
                                                col={col}
                                                sort={this.state.sort}
                                                currentFilter={this.state.filters[col.field]}
                                                refOptions={this.getRefOptions(col)}
                                                onToggleSort={this.handleToggleSort}
                                                onFilterApply={this.handleFilterApply}
                                            />
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, index) => (
                                        <TableRow key={row.id ?? index} className={index % 2 === 0 ? style.evenRow : style.oddRow}>
                                            {visibleCols.map((col) => (
                                                <TableCell
                                                    className={style.table_cell}
                                                    key={`${row.id}-${col.id}`}
                                                    onClick={() => this.openField(row)}
                                                >
                                                    <DataTableCell row={row} col={col} refs={this.state.data.refs} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
