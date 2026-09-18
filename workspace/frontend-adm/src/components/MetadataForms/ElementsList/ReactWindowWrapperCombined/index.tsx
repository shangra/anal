import { Component, createContext, createRef, CSSProperties, forwardRef, ReactNode, RefObject, useContext } from 'react';
import { GridOnItemsRenderedProps, VariableSizeGrid } from 'react-window';
import { ArrowLeftIcon, IconButton, PlusIcon } from 'ui-kit';
import { Cell } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/components/Cell';
import { HeaderCellBuilder } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/components/HeaderCell/HeaderCellBuilder';
import { ColumnResizeHelper } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils';
import { IColumnData, IInnerColumnMetadata } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types';
import {
    DEFAULT_COLUMN_WIDTH,
    DEFAULT_ROW_HEIGHT,
    DEFAULT_TABLE_VISIBLE_WIDTH,
    HIERARCHY_COLUMN_WIDTH,
    MERGED_ROW_COEF,
    SCROLL_DELAY,
    SCROLL_THRESHOLD_DOWN,
    SCROLL_THRESHOLD_UP,
} from './constants';
import { Timer } from 'helpers/timer';
import { ICell, IActiveCell } from 'components/MetadataForms/ElementsList/types';
import classes from './ReactWindowWrapper.module.css';
import { scrollToCellUtils } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/scrollToCell.utils';
import { calculateRowIndexFromMousePosition } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/calculateRowIndexFromMousePosition';

interface IReactWindowWrapperCombinedProps {
    data: (ICell | ICell[])[];
    cols: (IColumnData | IColumnData[])[];
    isLoadingMore: boolean;
    loadNext: () => void;
    loadPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
    activeCell?: IActiveCell | null;
    hasExpendedHierarchy?: boolean;
    selectedRows?: number[];
    hierarchy?: boolean;
    onHierarchyBack?: () => void;
    onHierarchExpend?: (rowIndex: number) => void;
    onSort?: (columnName: string, value: 'ASC' | 'DESC') => void;
    onFilter?: (columnName: string) => void;
    onKeyDown?: (event: React.KeyboardEvent, cellData: any) => void;
    onCellClick?: (
        event: React.MouseEvent,
        payload: { columnIndex: number; rowIndex: number; groupIndex?: number; colInGroupIndex?: number },
    ) => void;
    onDoubleClick?: (
        event: React.MouseEvent,
        payload: { columnIndex: number; rowIndex: number; groupIndex?: number; colInGroupIndex?: number },
    ) => void;
    renderMetaInput?: (cellData: any, metadata: { rowIndex: number; columnIndex: number }) => ReactNode;
    width?: number;
    height?: number;
}

interface IReactWindowWrapperCombinedState {
    scrollLeft: number;
    scrollTop: number;
    mergedLength: number;
    width: number;
    height: number;
    resizingIndex: number | null;
    startX: number;
    startWidth: number;
    columnsMetadata: IInnerColumnMetadata[];
    hoveredRowIndex: number | null;
    desiredColumnWidth: number[];
}

type TableContextValueType = Pick<IReactWindowWrapperCombinedProps, 'cols' | 'onSort' | 'onHierarchyBack'> &
    Pick<
        IReactWindowWrapperCombinedState,
        'resizingIndex' | 'startX' | 'startWidth' | 'columnsMetadata' | 'hoveredRowIndex'
    > & {
        hasColumnsHeader: boolean;
        mergedLength: number;
        hasHierarchy: boolean;
        handleResizeStart: (columnIndex: number, startX: number) => void;
        handleResize: (clientX: number) => void;
        handleResizeEnd: () => void;
        hasExpendedHierarchy: boolean;
        onRowHover: (rowIndex: number | null) => void;
    };

const defaultTableContextValue: TableContextValueType = {
    handleResizeStart: () => {},
    handleResize: () => {},
    handleResizeEnd: () => {},
    cols: [],
    hasColumnsHeader: true,
    mergedLength: 1,
    hasHierarchy: false,
    resizingIndex: null,
    startX: 0,
    startWidth: 0,
    hasExpendedHierarchy: false,
    columnsMetadata: [],
    hoveredRowIndex: null,
    onRowHover: () => {},
};

const TableContext = createContext<TableContextValueType>(defaultTableContextValue);

interface IInnerGridElementProps {
    children: React.ReactElement[];
    style: CSSProperties;
}

const innerWrapper = forwardRef<HTMLDivElement, IInnerGridElementProps>(({ children, style }, ref) => {
    const {
        cols,
        onSort,
        handleResize,
        handleResizeEnd,
        handleResizeStart,
        hasColumnsHeader,
        mergedLength,
        hasHierarchy,
        hasExpendedHierarchy,
        onHierarchyBack,
        columnsMetadata,
    } = useContext(TableContext);

    return (
        <div
            ref={ref}
            style={{
                ...style,
            }}
        >
            {hasColumnsHeader ? (
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        left: '0px',
                        width: '100%',
                        // height: `${DEFAULT_ROW_HEIGHT}px`,
                        zIndex: 11,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                        }}
                    >
                        {hasHierarchy
                            ? (() => {
                                  let builder = new HeaderCellBuilder().withStyles({
                                      position: 'absolute',
                                      left: 0,
                                      width: HIERARCHY_COLUMN_WIDTH,
                                      height: DEFAULT_ROW_HEIGHT * mergedLength,
                                  });
                                  if (hasExpendedHierarchy) {
                                      builder = builder.withRenderContent(() => (
                                              <div
                                                  style={{
                                                      display: 'flex',
                                                      gap: '10px',
                                                      alignItems: 'center',
                                                      width: '100%',
                                                      height: '100%',
                                                  }}
                                              >
                                                  <IconButton
                                                      variant="outlined"
                                                      icon={ArrowLeftIcon}
                                                      onClick={() => onHierarchyBack?.()}
                                                      size="small"
                                                  />
                                                  <div>Иерархия</div>
                                              </div>
                                          ));
                                  } else {
                                      builder = builder.withName('Иерархия');
                                  }

                                  return builder.build();
                              })()
                            : null}
                        {cols.map((column, columnIndex) => {
                            const columnMetadata = columnsMetadata[columnIndex];
                            if (Array.isArray(column)) {
                                const groupLength = column.length;
                                return (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: hasHierarchy ? columnMetadata.x! + HIERARCHY_COLUMN_WIDTH : columnMetadata.x,
                                            width: columnMetadata.width,
                                            height: DEFAULT_ROW_HEIGHT * mergedLength,
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        {column.map((columnData, idx) => {
                                            const headerCellBuilder = new HeaderCellBuilder()
                                                .withName(columnData.label ?? columnData.name)
                                                .withStyles({
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRight: '1px solid var(--table-border-color)',
                                                    // borderBottom: idx < groupLength - 1 ?
                                                    //     '1px solid var(--table-border-color)' :
                                                    //     'none'
                                                })
                                                .withResize(
                                                    (startX) => handleResizeStart?.(columnIndex, startX),
                                                    handleResize!, // REFACTOR
                                                    handleResizeEnd!, // REFACTOR
                                                )
                                                .withSort(
                                                    columnData.order ?? null,
                                                    (value) => onSort?.(columnData.name, value) ?? function () {},
                                                );

                                            return (
                                                <div
                                                    key={`${columnData.name}-${idx}`}
                                                    style={{
                                                        flex: 1,
                                                        height: DEFAULT_ROW_HEIGHT,
                                                        minHeight: DEFAULT_ROW_HEIGHT,
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {headerCellBuilder.build()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            } 
                                const headerCellBuilder = new HeaderCellBuilder()
                                    .withStyles({
                                        // ...style,
                                        width: columnMetadata.width,
                                        left: hasHierarchy ? columnMetadata.x + HIERARCHY_COLUMN_WIDTH : columnMetadata.x,
                                        height: DEFAULT_ROW_HEIGHT * mergedLength,
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        borderRight: '1px solid var(--table-border-color)',
                                    })
                                    .withSort(column.order ?? null, (value) => onSort?.(column.name, value) ?? function () {})
                                    .withName(column.label ?? column.name)
                                    .withResize(
                                        (startX) => handleResizeStart?.(columnIndex, startX),
                                        handleResize ?? (() => {}),
                                        handleResizeEnd ?? (() => {}),
                                    );

                                return headerCellBuilder.build();
                            
                        })}
                    </div>
                    {hasExpendedHierarchy ? (
                        <div>
                            <div />
                        </div>
                    ) : null}
                </div>
            ) : null}
            <div
                style={{
                    position: 'absolute',
                    top: DEFAULT_ROW_HEIGHT * mergedLength,
                }}
            >
                {children}
            </div>
        </div>
    );
});

export class ReactWindowWrapper extends Component<IReactWindowWrapperCombinedProps, IReactWindowWrapperCombinedState> {
    mergedRowCoef: number;

    gridRef: RefObject<VariableSizeGrid>;

    outerRef: RefObject<HTMLDivElement>;

    containerRef: RefObject<HTMLDivElement>;

    resizeObserver: ResizeObserver | null;

    timer: Timer = new Timer(50);

    private debouncedMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;

    private debouncedMouseUp: () => void;

    private debouncedMouseLeave: () => void;

    private debouncedLoadMore: () => void;

    private lastHoveredRowIndex: number | null = null;

    private scrollLock: boolean = false;

    private lastScrollTop: number = 0;

    private scrollLockTimer: ReturnType<typeof setTimeout> | null = null;

    private lastLoadTimeStamp: number = 0;

    private firstVisibleRowIndex: number = 0;

    private isScrollProgrammatic: boolean = false;

    activeCellBorderColor = '#2C93CB';

    constructor(props: IReactWindowWrapperCombinedProps) {
        super(props);

        this.gridRef = createRef();
        this.outerRef = createRef();
        this.containerRef = createRef();
        this.resizeObserver = null;
        this.mergedRowCoef = MERGED_ROW_COEF;
        const defaultTableWidth = props.width || DEFAULT_TABLE_VISIBLE_WIDTH;
        const defaultTableHeight =
            typeof props.height === 'number' && props.height > 0 ? props.height : this.calculateTableHeight();

        this.debouncedMouseMove = this.debounce(this.handleContainerMouseMove.bind(this), 50);
        this.debouncedMouseUp = this.debounce(this.handleContainerMouseUp.bind(this), 50);
        this.debouncedMouseLeave = this.debounce(this.handleContainerMouseLeave.bind(this), 50);
        this.debouncedLoadMore = this.debounce(this.handleScroll.bind(this), 300);

        this.state = {
            width: defaultTableWidth,
            height: defaultTableHeight,
            scrollLeft: 0,
            scrollTop: 0,
            mergedLength: this.#getMergedLength(),
            resizingIndex: null,
            startX: 0,
            startWidth: 0,
            desiredColumnWidth: Array(props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
            columnsMetadata: ColumnResizeHelper.generateColumnsMetadata(
                props.cols.length,
                Array(props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
                DEFAULT_TABLE_VISIBLE_WIDTH,
            ),
            hoveredRowIndex: null,
        };
    }

    componentDidMount(): void {
        window.addEventListener('resize', this.handleWindowResize);

        if (!this.containerRef.current) return;

        this.resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            const measuredW = Math.max(Math.floor(width), 1);
            const measuredH = Math.max(Math.floor(height), 160);

            this.timer.start(() => {
                this.setState(
                    (prev) => {
                        const nextW =
                            typeof this.props.width === 'number' && this.props.width > 0 ? this.props.width : measuredW;
                        const nextH =
                            typeof this.props.height === 'number' && this.props.height > 0 ? this.props.height : measuredH;

                        if (nextW === prev.width && nextH === prev.height) {
                            return null;
                        }

                        let {columnsMetadata} = prev;
                        if (nextW !== prev.width) {
                            columnsMetadata =
                                prev.columnsMetadata.length > 0
                                    ? ColumnResizeHelper.generateColumnsMetadata(
                                          this.props.cols.length,
                                          prev.desiredColumnWidth,
                                          nextW,
                                      )
                                    : ColumnResizeHelper.generateColumnsMetadata(
                                          this.props.cols.length,
                                          prev.desiredColumnWidth,
                                          nextW,
                                      );
                        }

                        return { width: nextW, height: nextH, columnsMetadata };
                    },
                    () => {
                        this.resetTableSizeCache();
                    },
                );
            });
        });
        this.resizeObserver.observe(this.containerRef.current);
    }

    componentDidUpdate(
        prevProps: Readonly<IReactWindowWrapperCombinedProps>,
        prevState: Readonly<IReactWindowWrapperCombinedState>,
    ): void {
        if (prevProps.data !== this.props.data || prevState.width !== this.state.width) {
            this.gridRef.current?.resetAfterIndices({
                columnIndex: 0,
                rowIndex: 0,
                shouldForceUpdate: true,
            });
        }

        if (prevProps.height !== this.props.height && typeof this.props.height === 'number' && this.props.height > 0 && this.props.height !== this.state.height) {
            this.setState({ height: this.props.height }, () => {
                this.resetTableSizeCache();
            });
        }

        if (prevProps.cols.length !== this.props.cols.length && this.state.desiredColumnWidth.length !== this.props.cols.length) {
            this.setState((prevState) => ({
                desiredColumnWidth: Array(this.props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
                columnsMetadata: ColumnResizeHelper.generateColumnsMetadata(
                    this.props.cols.length,
                    Array(this.props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
                    this.state.width,
                ),
            }));
        }

        if (prevProps.cols !== this.props.cols) {
            const mergedLength = this.#getMergedLength();
            if (mergedLength !== this.state.mergedLength) {
                this.setState({
                    mergedLength
                });
            }
        }

        if (
            prevProps.activeCell !== this.props.activeCell &&
            this.props.activeCell &&
            this.props.activeCell.sourceEvent?.type === 'keyboard' &&
            this.props.activeCell.sourceEvent?.direction
        ) {
            const { rowIndex, columnIndex } = this.props.activeCell;
            this.scrollToCell(rowIndex, columnIndex);
            this.containerRef.current?.focus();
        }

        const oldLength = prevProps.data.length;
        const newLength = this.props.data.length;
        if (oldLength !== newLength || prevProps.data[0] !== this.props.data[0]) {
            const targetRow = Math.min(this.firstVisibleRowIndex, newLength - 1);
            if (targetRow >= 0) {
                this.scrollProgrammatically(targetRow);
            }
            this.gridRef.current?.resetAfterRowIndex(0);
        }
    }

    componentWillUnmount(): void {
        window.removeEventListener('resize', this.handleWindowResize);

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    calculateTableHeight = (): number => {
        if (!this.containerRef.current || typeof window === 'undefined') {
            return 700;
        }

        const containerRect = this.containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const bottomMargin = 30;

        const calculatedHeight = viewportHeight - containerRect.top - bottomMargin;

        return Math.max(calculatedHeight, 400);
    };

    handleWindowResize = () => {
        if (typeof this.props.height === 'number' && this.props.height > 0) {
            return;
        }
        this.setState(
            {
                height: this.calculateTableHeight(),
            },
            () => {
                this.resetTableSizeCache();
            },
        );
    };

    #getMergedLength = (colIndex?: number): number => {
        if (colIndex !== undefined) {
            const col = this.props.cols[colIndex];
            return Array.isArray(col) ? col.length : 1;
        }

        return this.props.cols.reduce((max, col) => Math.max(max, Array.isArray(col) ? col.length : 1), 1);
    };

    #getRowHeight(rowIndex: number): number {
        if (rowIndex === 1 && this.props.hasExpendedHierarchy) return DEFAULT_ROW_HEIGHT;

        const dataRowIndex = rowIndex - (this.props.hasExpendedHierarchy ? 2 : 1);
        if (dataRowIndex >= 0 && dataRowIndex < this.props.data.length) {
            const rowData = this.props.data[dataRowIndex];
            if (Array.isArray(rowData)) {
                const hasMergedCells = rowData.some((cell) => Array.isArray(cell));
                return hasMergedCells ? DEFAULT_ROW_HEIGHT * this.state.mergedLength * this.mergedRowCoef : DEFAULT_ROW_HEIGHT;
            } 
                return DEFAULT_ROW_HEIGHT;
            
        }

        return DEFAULT_ROW_HEIGHT;
    }

    #getCell(data: (ICell | ICell[])[], rowIndex: number, columnIndex: number): ICell | undefined {
        if (rowIndex < 0 || rowIndex >= data.length) return undefined;

        const row = data[rowIndex];
        if (Array.isArray(row)) {
            return columnIndex < row.length ? row[columnIndex] : undefined;
        } 
            return columnIndex === 0 ? row : undefined;
        
    }

    getBackHierarchyHeader(rowIndex: number, columnIndex: number, style: CSSProperties) {
        const cellStyles: CSSProperties = {
            ...style,
            backgroundColor: 'var(--table-header-background-color)',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--table-border-color)',
            padding: 5,
            fontWeight: 'bold',
            height: DEFAULT_ROW_HEIGHT,
            gap: 5,
            overflow: 'hidden',
        };

        return (
            <div style={cellStyles}>
                {columnIndex === 0 && (
                    <IconButton
                        variant="outlined"
                        icon={ArrowLeftIcon}
                        onClick={() => this.props.onHierarchyBack?.()}
                        size="small"
                    />
                )}
            </div>
        );
    }

    handleCellClick = (
        event: React.MouseEvent,
        payload: {
            columnIndex: number;
            rowIndex: number;
            isHierarchyColumn?: boolean;
            groupIndex?: number;
            colInGroupIndex?: number;
        },
    ) => {
        if (this.containerRef.current && event.detail === 1) {
            this.containerRef.current.focus({ preventScroll: true });
        }

        // TODO разобраться что надо включить что нет
        // const newActiveCell = {
        //     rowIndex: payload.rowIndex,
        //     columnIndex: payload.columnIndex,
        //     colInGroupIndex: undefined,
        //     groupIndex: undefined,
        //     isHierarchyColumn: payload.isHierarchyColumn
        // };

        // this.updateActiveCell(event as React.MouseEvent, newActiveCell);

        // this.handleSelection(event, payload.rowIndex);

        if (this.props.onCellClick) {
            this.props.onCellClick(event, payload);
        }
    };

    handleDoubleClick = (
        event: React.MouseEvent,
        payload: {
            rowIndex: number;
            columnIndex: number;
            groupIndex?: number;
            colInGroupIndex?: number;
            isHierarchyColumn?: boolean;
        },
    ) => {
        if (this.props.onDoubleClick) {
            this.props.onDoubleClick(event, payload);
        }
    };

    handleContainerHover = (event: React.MouseEvent<HTMLDivElement>) => {
        const activeCellIsEditing = this.props.activeCell?.isEditing === true;
        const hasFocusedInput = this.containerRef.current?.contains(document.activeElement);
        
        if (activeCellIsEditing || hasFocusedInput || this.state.resizingIndex !== null || !this.containerRef.current || !this.gridRef.current) return;

        const containerRect = this.containerRef.current.getBoundingClientRect();
        const mouseY = event.clientY - containerRect.top;

        const grid = this.gridRef.current;
        // @ts-ignore
        const scrollTop = grid.state?.scrollTop || 0;

        const rowIndex = calculateRowIndexFromMousePosition({
            mouseY,
            headerHeight: DEFAULT_ROW_HEIGHT * this.state.mergedLength,
            scrollTop,
            getRowHeight: (rowIndex: number) => this.#getRowHeight(rowIndex),
            getRowsCount: () => this.getRowsCount(),
            totalHeight: this.state.height,
            hasExpendedHierarchy: this.props.hasExpendedHierarchy,
            hierarchy: this.props.hierarchy,
        });

        if (rowIndex !== this.lastHoveredRowIndex) {
            this.lastHoveredRowIndex = rowIndex;
            this.setState({ hoveredRowIndex: rowIndex });
        }
    };

    handleContainerMouseLeave = (cell: any) => {
        if (this.props.activeCell?.rowIndex === cell.rowIndex && this.props.activeCell?.columnIndex === cell?.columnIndex) {
        } else {
            this.setState({ hoveredRowIndex: null });
            this.lastHoveredRowIndex = null;
        }
    };

    #getRowBackgroundColor = (rowIndex: number): string => {
        const isRowSelected = this.props.selectedRows?.includes(rowIndex);
        const isRowHovered = this.state.hoveredRowIndex === rowIndex;

        if (isRowSelected) return 'var(--table-row-selected-background)';
        if (isRowHovered) return 'var(--table-row-hover-background)';
        return rowIndex % 2 === 1 ? '' : 'var(--table-row-zebra-background)';
    };

    getBodyCell(rowIndex: number, tableColumnIndex: number, style: CSSProperties) {
        const backgroundColor = this.#getRowBackgroundColor(rowIndex);

        if (this.props.hierarchy && tableColumnIndex === 0) {
            return (
                <Cell
                    styles={{
                        ...style,
                        backgroundColor,
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        padding: 'var(--table-cell-padding)',
                    }}
                    value="-"
                    renderContent={() => (
                        <IconButton
                            variant="outlined"
                            icon={PlusIcon}
                            size="small"
                            onClick={() => this.props.onHierarchExpend?.(rowIndex)}
                        />
                    )}
                />
            );
        }

        const columnIndex = this.props.hierarchy ? tableColumnIndex - 1 : tableColumnIndex;
        const cell = this.#getCell(this.props.data, rowIndex, columnIndex);
        const isCellActive =
            this.props.activeCell?.rowIndex === rowIndex && this.props.activeCell?.columnIndex === cell?.columnIndex;

        // и у cell нет type. Куда делся type?

        if (!cell) {
            return (
                <div
                    style={{
                        ...style,
                        height: DEFAULT_ROW_HEIGHT,
                        border: '1px solid var(--table-border-color)',
                        backgroundColor,
                    }}
                />
            );
        }

        const rowHeight = this.#getRowHeight(rowIndex + (this.props.hasExpendedHierarchy ? 2 : 1));
        const cellContainerStyle: CSSProperties = {
            ...style,
            height: rowHeight,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            backgroundColor,
        };

        // Обработка объединенных ячеек (групп колонок)
        if (Array.isArray(cell)) {
            const cellData = this.props.cols[columnIndex];
            if (!Array.isArray(cellData)) return null;

            return (
                <div style={cellContainerStyle}>
                    {cell.map((mergedCell, index) => {
                        if (!mergedCell) return null;

                        const isCellActive =
                            this.props.activeCell?.rowIndex === rowIndex &&
                            this.props.activeCell?.columnIndex === mergedCell.columnIndex;

                        const cellHeight = rowHeight / cell.length;
                        const cellStyle: CSSProperties = {
                            height: cellHeight,
                            display: 'flex',
                            alignItems: 'center',
                            // padding: '0 0px',
                            padding: 'var(--table-cell-padding)',
                            backgroundColor: 'var(--table-active-cell-bg)',
                            // backgroundColor: isCellActive
                            //     ? 'var(--table-active-cell-bg)'
                            //     : 'red',
                        };

                        return (
                            <Cell
                                key={index}
                                styles={{
                                    ...cellStyle,
                                    color: 'var(--main-active-color)',
                                    boxShadow: isCellActive ? `inset 0 0 0 2px ${this.activeCellBorderColor}` : 'none',
                                    // border: cellStyle.border
                                }}
                                type={mergedCell.type}
                                value={mergedCell.value?.viewedData ?? ''}
                                onClick={(event) =>
                                    this.handleCellClick(event, {
                                        rowIndex,
                                        columnIndex: mergedCell.columnIndex,
                                        // groupIndex: cellData[0].groupIndex,
                                        colInGroupIndex: index,
                                    })
                                }
                                onDoubleClick={(event) =>
                                    this.handleDoubleClick(event, {
                                        rowIndex,
                                        columnIndex: mergedCell.columnIndex,
                                        // groupIndex: cellData[0].groupIndex,
                                        colInGroupIndex: index,
                                    })
                                }
                                renderContent={() => this.props.renderMetaInput?.(mergedCell, { rowIndex, columnIndex })}
                                dataActive={isCellActive ? 'true' : ''}
                            />
                        );
                    })}
                </div>
            );
        }

        return (
            <Cell
                key={`${rowIndex}:${columnIndex}`}
                styles={{
                    ...style,
                    height: rowHeight,
                    paddingLeft: 'var(--table-cell-padding)',
                    color: 'var(--main-active-color)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    backgroundColor,
                    boxShadow: isCellActive ? `inset 0 0 0 2px ${this.activeCellBorderColor}` : 'none',
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                }}
                type={cell.type}
                value={cell.value?.viewedData ?? ''}
                onClick={(event) => this.handleCellClick(event, { rowIndex, columnIndex: cell.columnIndex })}
                onDoubleClick={(event) => this.handleDoubleClick(event, { rowIndex, columnIndex })}
                renderContent={() => this.props.renderMetaInput?.(cell, { rowIndex, columnIndex })}
                dataActive={isCellActive ? 'true' : ''}
            />
        );
    }

    handleContainerMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        this.handleColumnResize?.(event.clientX);
    };

    handleContainerMouseUp = () => {
        if (this.state.resizingIndex !== null) {
            this.handleColumnResizeEnd();
        }
    };

    scrollToCell = (rowIndex: number, columnIndex: number) => {
        if (!this.gridRef.current) return;

        const grid = this.gridRef.current;

        // @ts-ignore
        const currentScrollTop = grid.state?.scrollTop || 0;
        // @ts-ignore
        const currentScrollLeft = grid.state?.scrollLeft || 0;

        const scrollPosition = scrollToCellUtils.calculateScrollPosition({
            scrollTop: currentScrollTop,
            scrollLeft: currentScrollLeft,
            rowIndex,
            columnIndex,
            columnsMetadata: this.state.columnsMetadata,
            data: this.props.data,
            hasExpendedHierarchy: this.props.hasExpendedHierarchy,
            tableWidth: this.state.width,
            tableHeight: this.state.height,
            mergedLength: this.state.mergedLength,
        });

        if (scrollPosition.shouldScroll) {
            grid.scrollTo({
                scrollTop: scrollPosition.scrollTop,
                scrollLeft: scrollPosition.scrollLeft,
            });
        }
    };

    handleColumnResizeStart = (columnIndex: number, startX: number) => {
        const column = this.state.columnsMetadata[columnIndex];

        this.setState(
            {
                resizingIndex: columnIndex,
                startX,
                startWidth: column.width,
            },
            () => {
                document.body.style.cursor = 'col-resize';
            },
        );
    };

    handleColumnResize = (clientX: number) => {
        const { resizingIndex, startX, startWidth } = this.state;
        if (resizingIndex === null) return;

        this.setState(
            (prevState) => {
                const widthDiff = clientX - startX;
                const newColumnWidth = Math.max(DEFAULT_COLUMN_WIDTH, startWidth + widthDiff);

                return {
                    columnsMetadata: ColumnResizeHelper.resizeColumnWidth(
                        prevState.columnsMetadata,
                        resizingIndex,
                        newColumnWidth,
                        prevState.width,
                    ),
                };
            },
            () => {
                this.resetTableSizeCache();
            },
        );
    };

    handleColumnResizeEnd = () => {
        setTimeout(() => {
            this.setState({ resizingIndex: null }, () => {
                document.body.style.cursor = 'default';
            });
        }, 0);
    };

    resetTableSizeCache = () => {
        this.gridRef.current?.resetAfterIndices({ columnIndex: 0, rowIndex: 0 });
    };

    getColumnsCount() {
        let result = this.props.cols.length;

        if (this.props.hierarchy) result++;

        return result;
    }

    getRowsCount() {
        const result = this.props.data.length;

        return result;
    }

    private debounce(func: Function, delay: number) {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    private handleItemsRendered = ({ visibleRowStartIndex }: GridOnItemsRenderedProps) => {
        this.firstVisibleRowIndex = visibleRowStartIndex;
    };

    private scrollProgrammatically = (rowIndex: number) => {
        this.isScrollProgrammatic = true;
        this.gridRef.current?.scrollToItem({ rowIndex });
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.isScrollProgrammatic = false;
            }, 0);
        });
    };

    private lockScroll = (delay: number = SCROLL_DELAY) => {
        if (this.scrollLockTimer) clearTimeout(this.scrollLockTimer);
        this.scrollLock = true;
        this.scrollLockTimer = setTimeout(() => {
            this.scrollLock = false;
        }, delay);
    };

    private handleScroll = () => {
        const outerEl = this.outerRef.current;
        if (!outerEl || this.scrollLock || this.isScrollProgrammatic) return;

        const { scrollTop, scrollHeight, clientHeight } = outerEl;
        const remainingDown = scrollHeight - scrollTop - clientHeight;
        const remainingUp = scrollTop;

        const { loadNext, loadPrev, hasNext, hasPrev, isLoadingMore } = this.props;

        const scrollingDown = scrollTop > this.lastScrollTop;
        const scrollingUp = scrollTop < this.lastScrollTop;
        this.lastScrollTop = scrollTop;

        if (isLoadingMore) return;

        const now = Date.now();
        if (now - this.lastLoadTimeStamp < SCROLL_DELAY) return;

        if (hasNext && scrollingDown && remainingDown < SCROLL_THRESHOLD_DOWN) {
            this.lastLoadTimeStamp = now;
            this.lockScroll();
            loadNext();
        } else if (hasPrev && scrollTop < SCROLL_THRESHOLD_UP && (scrollingUp || scrollTop === 0)) {
            this.lastLoadTimeStamp = now;
            this.lockScroll();
            loadPrev();
        }
    };

    render(): ReactNode {
        const { hierarchy } = this.props;
        const columnsCount = this.getColumnsCount();
        const rowsCount = this.getRowsCount();

        const cell = {
            rowIndex: this.props.activeCell?.rowIndex,
            columnIndex: this.props.activeCell?.columnIndex,
        };

        return (
            <TableContext.Provider
                value={{
                    cols: this.props.cols,
                    handleResizeStart: this.handleColumnResizeStart,
                    handleResize: this.handleColumnResize,
                    handleResizeEnd: this.handleColumnResizeEnd,
                    onSort: this.props.onSort,
                    hasColumnsHeader: true,
                    mergedLength: this.state.mergedLength,
                    hasHierarchy: Boolean(this.props.hierarchy),
                    resizingIndex: this.state.resizingIndex,
                    startWidth: this.state.startWidth,
                    startX: this.state.startX,
                    hasExpendedHierarchy: Boolean(this.props.hasExpendedHierarchy),
                    onHierarchyBack: this.props.onHierarchyBack,
                    columnsMetadata: this.state.columnsMetadata,
                    hoveredRowIndex: this.state.hoveredRowIndex,
                    onRowHover: (rowIndex) => this.setState({ hoveredRowIndex: rowIndex }),
                }}
            >
                <div
                    className={classes.table}
                    ref={this.containerRef}
                    onMouseMove={(event) => {
                        if (this.state.resizingIndex !== null) {
                            this.handleContainerMouseMove(event);
                        } else {
                            this.handleContainerHover(event);
                            this.debouncedMouseMove(event);
                        }
                    }}
                    onMouseLeave={() => {
                        this.handleContainerMouseLeave(cell);
                    }}
                    onMouseUp={() => {
                        if (this.state.resizingIndex !== null) {
                            this.handleContainerMouseUp();
                        } else {
                            this.debouncedMouseUp();
                        }
                    }}
                    onKeyDown={(event) => {
                        this.props.onKeyDown?.(event, cell);
                    }}
                    tabIndex={-1}
                >
                    <VariableSizeGrid
                        itemKey={({ rowIndex, columnIndex }) => `${rowIndex}__${columnIndex}`}
                        ref={this.gridRef}
                        outerRef={this.outerRef}
                        columnCount={columnsCount}
                        rowCount={rowsCount}
                        columnWidth={(index) => {
                            if (hierarchy) {
                                if (index === 0) return HIERARCHY_COLUMN_WIDTH;
                                
                                    return this.state.columnsMetadata[index - 1].width;
                                
                            } 
                                return this.state.columnsMetadata[index].width;
                            
                        }}
                        rowHeight={(index) => this.#getRowHeight(index + (hierarchy ? 2 : 1))}
                        width={this.state.width}
                        height={this.state.height}
                        children={({ rowIndex, columnIndex, style }) => this.getBodyCell(rowIndex, columnIndex, style)}
                        innerElementType={innerWrapper}
                        onScroll={this.handleScroll}
                        onItemsRendered={this.handleItemsRendered}
                    />
                </div>
            </TableContext.Provider>
        );
    }
}
