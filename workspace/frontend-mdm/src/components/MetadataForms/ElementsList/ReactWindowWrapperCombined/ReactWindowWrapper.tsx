import { Component, createRef, type ReactNode, type RefObject } from 'react';
import { type GridOnItemsRenderedProps, VariableSizeGrid } from 'react-window';
import { InnerGridElement } from './components/InnerGridElement';
import { renderBodyCell } from './components/BodyCellRenderer';
import {
    DEFAULT_COLUMN_WIDTH,
    DEFAULT_ROW_HEIGHT,
    DEFAULT_TABLE_VISIBLE_WIDTH,
    HIERARCHY_COLUMN_WIDTH,
    MERGED_ROW_COEF,
    SCROLL_DELAY,
} from './constants';
import classes from './ReactWindowWrapper.module.css';
import { TableContext } from './TableContext';
import type { CellInteractionPayload, IReactWindowWrapperCombinedProps, IReactWindowWrapperCombinedState } from './types';
import { ColumnResizeHelper } from './utils';
import { calculateRowIndexFromMousePosition } from './utils/calculateRowIndexFromMousePosition';
import { debounce } from './utils/debounce';
import {
    calculateTableHeight,
    getCellAt,
    getMergedLength,
    getRowHeight,
    resolveScrollPagination,
} from './utils/tableGeometry';
import { Timer } from '../../../../helpers/timer';
import { ICell } from '../types';
import { columnsMetadataToConfig } from '../utils/columnConfig';
import { scrollToCellUtils } from './utils/scrollToCell.utils';

export class ReactWindowWrapper extends Component<IReactWindowWrapperCombinedProps, IReactWindowWrapperCombinedState> {
    mergedRowCoef = MERGED_ROW_COEF;

    activeCellBorderColor = 'var(--table-active-cell-border, #60a5fa)';

    gridRef: RefObject<VariableSizeGrid> = createRef();

    outerRef: RefObject<HTMLDivElement> = createRef();

    containerRef: RefObject<HTMLDivElement> = createRef();

    resizeObserver: ResizeObserver | null = null;

    timer = new Timer(50);

    firstVisibleRowIndex = 0;

    scrollLock = false;

    scrollLockTimer: ReturnType<typeof setTimeout> | null = null;

    isScrollProgrammatic = false;

    lastScrollTop = 0;

    lastLoadTimeStamp = 0;

    private debouncedMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;

    private debouncedMouseUp: () => void;

    private debouncedMouseLeave: () => void;

    constructor(props: IReactWindowWrapperCombinedProps) {
        super(props);

        const defaultTableWidth = props.width || DEFAULT_TABLE_VISIBLE_WIDTH;
        const defaultTableHeight = typeof props.height === 'number' && props.height > 0 ? props.height : 700;

        this.debouncedMouseMove = debounce(this.handleContainerMouseMove.bind(this), 50, this);
        this.debouncedMouseUp = debounce(this.handleContainerMouseUp.bind(this), 50, this);
        this.debouncedMouseLeave = debounce(this.handleContainerMouseLeave.bind(this), 50, this);

        this.state = {
            width: defaultTableWidth,
            height: defaultTableHeight,
            scrollLeft: 0,
            scrollTop: 0,
            mergedLength: getMergedLength(props.cols),
            resizingIndex: null,
            startX: 0,
            startWidth: 0,
            desiredColumnWidth: Array(props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
            columnsMetadata: ColumnResizeHelper.generateColumnsMetadata(
                props.cols.length,
                Array(props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
                defaultTableWidth,
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

            this.timer.start(() =>
                this.setState(
                    (prev) => {
                        const nextW =
                            typeof this.props.width === 'number' && this.props.width > 0 ? this.props.width : measuredW;
                        const nextH =
                            typeof this.props.height === 'number' && this.props.height > 0 ? this.props.height : measuredH;

                        if (nextW === prev.width && nextH === prev.height) return null;

                        let { columnsMetadata } = prev;
                        if (nextW !== prev.width) {
                            columnsMetadata = ColumnResizeHelper.generateColumnsMetadata(
                                this.props.cols.length,
                                prev.desiredColumnWidth,
                                nextW,
                            );
                        }

                        return { width: nextW, height: nextH, columnsMetadata };
                    },
                    () => this.resetTableSizeCache(),
                ),
            );
        });

        this.resizeObserver.observe(this.containerRef.current);

        if (!(typeof this.props.height === 'number' && this.props.height > 0)) {
            this.setState({ height: calculateTableHeight(this.containerRef.current) });
        }
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

        if (
            prevProps.height !== this.props.height &&
            typeof this.props.height === 'number' &&
            this.props.height > 0 &&
            this.props.height !== this.state.height
        ) {
            this.setState({ height: this.props.height }, () => this.resetTableSizeCache());
        }

        if (prevProps.cols.length !== this.props.cols.length && this.state.desiredColumnWidth.length !== this.props.cols.length) {
            this.setState({
                desiredColumnWidth: Array(this.props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
                columnsMetadata: ColumnResizeHelper.generateColumnsMetadata(
                    this.props.cols.length,
                    Array(this.props.cols.length).fill(DEFAULT_COLUMN_WIDTH),
                    this.state.width,
                ),
            });
        }

        if (prevProps.cols !== this.props.cols) {
            const mergedLength = getMergedLength(this.props.cols);
            if (mergedLength !== this.state.mergedLength) {
                this.setState({ mergedLength });
            }
        }

        if (prevProps.activeCell !== this.props.activeCell && this.props.activeCell?.sourceEvent?.type === 'keyboard') {
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
                this.gridRef.current?.resetAfterRowIndex(0);
            }
        }
    }

    componentWillUnmount(): void {
        window.removeEventListener('resize', this.handleWindowResize);
        this.resizeObserver?.disconnect();
        if (this.scrollLockTimer) clearTimeout(this.scrollLockTimer);
    }

    handleWindowResize = (): void => {
        if (typeof this.props.height === 'number' && this.props.height > 0) return;
        this.setState({ height: calculateTableHeight(this.containerRef.current) }, () => this.resetTableSizeCache());
    };

    handleCellClick = (event: React.MouseEvent, payload: CellInteractionPayload): void => {
        this.props.onCellClick?.(event, payload);
    };

    handleDoubleClick = (event: React.MouseEvent, payload: Pick<CellInteractionPayload, 'columnIndex' | 'rowIndex'>): void => {
        this.props.onDoubleClick?.(event, payload);
    };

    handleContainerHover = (event: React.MouseEvent<HTMLDivElement>): void => {
        const container = this.containerRef.current;
        const outer = this.outerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const rowIndex = calculateRowIndexFromMousePosition({
            mouseY: event.clientY - rect.top,
            headerHeight: DEFAULT_ROW_HEIGHT * this.state.mergedLength,
            scrollTop: outer?.scrollTop ?? 0,
            getRowHeight: (rowIndex: number) =>
                getRowHeight({
                    rowIndex,
                    data: this.props.data,
                    hasExpandedHierarchy: this.props.hasExpendedHierarchy,
                    mergedLength: this.state.mergedLength,
                    mergedRowCoef: this.mergedRowCoef,
                    defaultRowHeight: this.getConfigRowHeight(),
                }),
            getRowsCount: () => this.getRowsCount(),
            totalHeight: this.state.height,
            hasExpendedHierarchy: this.props.hasExpendedHierarchy,
            hierarchy: this.props.hierarchy,
        });
        if (rowIndex !== this.state.hoveredRowIndex) {
            this.setState({ hoveredRowIndex: rowIndex });
        }
    };

    handleContainerMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
        this.handleColumnResize(event.clientX);
    };

    handleContainerMouseUp = (): void => {
        if (this.state.resizingIndex !== null) {
            this.handleColumnResizeEnd();
        }
    };

    handleContainerMouseLeave = (_cellData?: ICell | ICell[] | null): void => {
        this.setState({ hoveredRowIndex: null });
    };

    handleColumnResizeStart = (columnIndex: number, startX: number): void => {
        const column = this.state.columnsMetadata[columnIndex];
        if (!column) return;

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

    handleColumnResize = (clientX: number): void => {
        const { resizingIndex, startX, startWidth } = this.state;
        if (resizingIndex === null) return;

        this.setState(
            (prevState) => {
                const newColumnWidth = Math.max(DEFAULT_COLUMN_WIDTH, startWidth + (clientX - startX));
                return {
                    columnsMetadata: ColumnResizeHelper.resizeColumnWidth(
                        prevState.columnsMetadata,
                        resizingIndex,
                        newColumnWidth,
                        prevState.width,
                    ),
                };
            },
            () => this.resetTableSizeCache(),
        );
    };

    handleColumnResizeEnd = (): void => {
        this.props.onColumnConfigChange?.(
            columnsMetadataToConfig(this.props.cols, this.state.columnsMetadata),
        );
        setTimeout(() => {
            this.setState({ resizingIndex: null }, () => {
                document.body.style.cursor = 'default';
            });
        }, 0);
    };

    resetTableSizeCache = (): void => {
        this.gridRef.current?.resetAfterIndices({
            columnIndex: 0,
            rowIndex: 0,
        });
    };

    scrollToCell = (rowIndex: number, columnIndex: number): void => {
        const grid = this.gridRef.current;
        if (!grid) return;

        const gridState = grid.state as { scrollTop?: number; scrollLeft?: number } | undefined;

        const scrollPosition = scrollToCellUtils.calculateScrollPosition({
            scrollTop: gridState?.scrollTop || 0,
            scrollLeft: gridState?.scrollLeft || 0,
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

    getColumnsCount(): number {
        return this.props.cols.length + (this.props.hierarchy ? 1 : 0);
    }

    getRowsCount(): number {
        return this.props.data.length;
    }

    private getConfigRowHeight(): number | undefined {
        let height: number | undefined;
        const walk = (cols: IReactWindowWrapperCombinedProps['cols']): void => {
            for (const entry of cols) {
                if (Array.isArray(entry)) walk(entry as IReactWindowWrapperCombinedProps['cols']);
                else if (entry.cellHeight) {
                    const h = entry.cellHeight;
                    if (height == null || h > height) height = h;
                }
            }
        };
        walk(this.props.cols);
        return height;
    }

    private handleItemsRendered = ({ visibleRowStartIndex }: GridOnItemsRenderedProps): void => {
        this.firstVisibleRowIndex = visibleRowStartIndex;
    };

    private scrollProgrammatically = (rowIndex: number): void => {
        this.isScrollProgrammatic = true;
        this.gridRef.current?.scrollToItem({ rowIndex });
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.isScrollProgrammatic = false;
            }, 0);
        });
    };

    private lockScroll = (delay: number = SCROLL_DELAY): void => {
        if (this.scrollLockTimer) clearTimeout(this.scrollLockTimer);
        this.scrollLock = true;
        this.scrollLockTimer = setTimeout(() => {
            this.scrollLock = false;
        }, delay);
    };

    private handleScroll = (): void => {
        const outerEl = this.outerRef.current;
        if (!outerEl || this.scrollLock || this.isScrollProgrammatic) return;

        const { scrollTop, scrollHeight, clientHeight } = outerEl;
        const { loadNext, loadPrev, hasNext, hasPrev, isLoadingMore } = this.props;

        const { action, nextLastScrollTop } = resolveScrollPagination({
            scrollTop,
            scrollHeight,
            clientHeight,
            lastScrollTop: this.lastScrollTop,
            hasNext,
            hasPrev,
            isLoadingMore,
            lastLoadTimeStamp: this.lastLoadTimeStamp,
        });

        this.lastScrollTop = nextLastScrollTop;
        if (!action) return;

        this.lastLoadTimeStamp = Date.now();
        this.lockScroll();
        if (action === 'next') loadNext();
        else loadPrev();
    };

    render(): ReactNode {
        const { hierarchy, activeCell, data } = this.props;
        const columnsCount = this.getColumnsCount();
        const rowsCount = this.getRowsCount();

        const activeCellData =
            activeCell != null ? getCellAt(data, activeCell.rowIndex, activeCell.columnIndex) ?? null : null;

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
                    hasExpandedHierarchy: Boolean(this.props.hasExpendedHierarchy),
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
                        this.handleContainerMouseLeave(activeCellData);
                    }}
                    onMouseUp={() => {
                        if (this.state.resizingIndex !== null) {
                            this.handleContainerMouseUp();
                        } else {
                            this.debouncedMouseUp();
                        }
                    }}
                    onKeyDown={(event) => {
                        this.props.onKeyDown?.(event, activeCellData);
                    }}
                    tabIndex={-1}
                >
                    <VariableSizeGrid
                        itemKey={({ rowIndex, columnIndex }) => `${rowIndex}_${columnIndex}`}
                        ref={this.gridRef}
                        outerRef={this.outerRef}
                        columnCount={columnsCount}
                        rowCount={rowsCount}
                        columnWidth={(index) => {
                            if (hierarchy) {
                                if (index === 0) return HIERARCHY_COLUMN_WIDTH;
                                return this.state.columnsMetadata[index - 1]?.width ?? DEFAULT_COLUMN_WIDTH;
                            }
                            return this.state.columnsMetadata[index]?.width ?? DEFAULT_COLUMN_WIDTH;
                        }}
                        rowHeight={(index) =>
                            getRowHeight({
                                rowIndex: index + (hierarchy ? 2 : 1),
                                data: this.props.data,
                                hasExpandedHierarchy: this.props.hasExpendedHierarchy,
                                mergedLength: this.state.mergedLength,
                                mergedRowCoef: this.mergedRowCoef,
                                defaultRowHeight: this.getConfigRowHeight(),
                            })
                        }
                        width={this.state.width}
                        height={this.state.height}
                        children={({ rowIndex, columnIndex, style }) =>
                            renderBodyCell({
                                rowIndex,
                                tableColumnIndex: columnIndex,
                                style,
                                data: this.props.data,
                                cols: this.props.cols,
                                hierarchy: this.props.hierarchy,
                                hasExpandedHierarchy: this.props.hasExpendedHierarchy,
                                activeCell: this.props.activeCell,
                                selectedRows: this.props.selectedRows,
                                hoveredRowIndex: this.state.hoveredRowIndex,
                                mergedLength: this.state.mergedLength,
                                mergedRowCoef: this.mergedRowCoef,
                                activeCellBorderColor: this.activeCellBorderColor,
                                onHierarchyExpand: this.props.onHierarchyExpand,
                                onCellClick: this.handleCellClick,
                                onDoubleClick: this.handleDoubleClick,
                                renderMetaInput: this.props.renderMetaInput,
                            })
                        }
                        innerElementType={InnerGridElement}
                        onScroll={this.handleScroll}
                        onItemsRendered={this.handleItemsRendered}
                    />
                </div>
            </TableContext.Provider>
        );
    }
}
