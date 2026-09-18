import React, { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { IMeasurementAPI } from '../../AdapterSpreadSheet/measurement/types';
import { Theme } from '../../TableAdapters/types';
import { Canvas } from './components/Canvas';
import { Container } from './components/Container';
import { Scrollbar } from './components/Scrollbar';
import { DEFAULT_CAMERA_POSITION, DEFAULT_COLUMNS_AMOUNT, DEFAULT_ROWS_AMOUNT, DEFAULT_THEME } from './const';
import { CanvasSpreadSheetProvider } from './context';
import { CanvasTableContext } from './context/types';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor.hook';
import { CanvasMeasurementAPI } from './measurement/CanvasMeasurementAPI';
import { IBox, ICamera, ICanvasTableAPI, ICanvasTableProps, IComponentInfo, IResizer, SpreadSheetData } from './types';
import { calculateFrozenAreas, getViewport } from './utils';

const noop = () => {};

export const CanvasTableInternal = React.memo(
    forwardRef<ICanvasTableAPI, ICanvasTableProps>(
        (
            {
                lastupdate,
                width,
                height,
                themeOverride,
                rangesStyles,
                cursor,
                joinedCells = [],
                editingCell,
                currentValue,
                columnsMetadata,
                rowsMetadata,
                ranges = [],
                frozenRows = 0,
                frozenColumns = 0,
                columnsAmount = DEFAULT_COLUMNS_AMOUNT,
                rowsAmount = DEFAULT_ROWS_AMOUNT,
                hasColumnsHeader = false,
                hasRowsHeader = false,
                enablePerformanceMonitoring = false,
                fillDraggingRange = null,
                cursorStyle = 'default',
                getCellDisplayValue = noop,
                getCellStyle = () => ({}),
                getCellComponents = () => [],
                onFillHandleMouseDown = noop,
                onFillHandleMouseMove = noop,
                onFillHandleMouseUp = noop,
                onViewportChange = noop,
                onContextMenu = noop,
                onKeyDown = noop,
                onKeyUp = noop,
                onCellEnter = noop,
                onMouseDown = noop,
                onClick = noop,
                onDblClick = noop,
                onMouseUp = noop,
                onCellLeave = noop,
                onRootMouseDown = noop,
                onRootMouseUp = noop,
                onRowsHeaderCellEnter = noop,
                onRowsHeaderCellMouseDown = noop,
                onRowsHeaderCellClick = noop,
                onRowsHeaderCellMouseUp = noop,
                onRowsHeaderCellLeave = noop,
                onColumnsHeaderCellEnter = noop,
                onColumnsHeaderCellMouseDown = noop,
                onColumnsHeaderCellClick = noop,
                onColumnsHeaderCellMouseUp = noop,
                onColumnsHeaderCellLeave = noop,
                zoom = 100,
                onZooming = noop,
                onColumnsResize,
                onRowsResize,
                onRowExpandResize,
                onColumnExpandResize,
                onColumnsAutoFit,
                onRowsAutoFit,
                rowGroups = [],
                columnGroups = [],
                onToggleGroup = noop,
            },
            tableAPIRef,
        ) => {
            // Canvas refs
            const backgroundRef = useRef<HTMLCanvasElement>(null);
            const contentRef = useRef<HTMLCanvasElement>(null);
            const selectionRef = useRef<HTMLCanvasElement>(null);
            const headersRef = useRef<HTMLCanvasElement>(null);
            const overlayRef = useRef<HTMLCanvasElement>(null);

            // State
            const [camera, setCamera] = useState<ICamera>(DEFAULT_CAMERA_POSITION);
            const [resizer, setResizer] = useState<IResizer | null>(null);
            const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
            const [componentsInfo, setComponentsInfo] = useState<IComponentInfo[]>([]);

            // Refs
            const measurementAPI = useRef<IMeasurementAPI | null>(null);
            const currentHeader = useRef<'row' | 'column' | null>(null);
            const currentColumnsHeaderCellIndex = useRef<number | null>(null);
            const currentRowsHeaderCellIndex = useRef<number | null>(null);
            const cellsWithComponents = useRef<SpreadSheetData>(new Map());

            const { getMetrics, logMetrics } = usePerformanceMonitor(enablePerformanceMonitoring);

            // const virtualInput = useVirtualInput({
            //     onChange: (inputState) => {
            //         // Уведомляем контекст о новом значении — триггерит анимационный цикл,
            //         // НО НЕ вызывает renderLayers (тяжёлый) — только content layer через AnimationManager
            //         setCursorValue(inputState.value);
            //     },
            //     onSubmit: (value, e) => {
            //         commitCellEdit(value);
            //         // Shift+Enter — вверх, Enter — вниз (стандарт таблиц)
            //         moveCursor(e.shiftKey ? 'up' : 'down');
            //     },
            //     onCancel: () => cancelCellEdit(),
            //     onTab: (e) => {
            //         commitCellEdit(virtualInput.getState().value);
            //         moveCursor(e.shiftKey ? 'left' : 'right');
            //     },
            // });

            // // При активации ячейки для редактирования
            // const activateEditing = useCallback(
            //     (cell: Cell, initialChar?: string) => {
            //         const cellValue = String(getCellDisplayValue(cell.rowIndex, cell.columnIndex) ?? '');
            //         if (initialChar) {
            //             // Пользователь начал вводить — очищаем ячейку и вставляем символ
            //             virtualInput.init('');
            //             virtualInput.insert(initialChar);
            //         } else {
            //             // F2 или double-click — открываем с выделением всего
            //             virtualInput.init(cellValue, true);
            //         }
            //         startCellEdit(cell);
            //     },
            //     [
            //         /* ... */
            //     ],
            // );

            // Canvas keydown — передаём в virtualInput только если ячейка редактируется
            // const handleCanvasKeyDown = useCallback(
            //     (e: KeyboardEvent) => {
            //         if (cursor?.editing) {
            //             const handled = virtualInput.handleKeyDown(e);
            //             if (handled) return;
            //         }
            //         // Иначе — навигация по таблице
            //         handleTableNavigation(e);
            //     },
            //     [cursor?.editing, virtualInput, handleTableNavigation],
            // );

            const frozenAreas = useMemo(
                () => calculateFrozenAreas(frozenRows, frozenColumns, rowsMetadata, columnsMetadata),
                [frozenRows, frozenColumns, rowsMetadata, columnsMetadata],
            );

            const viewport = useMemo<IBox>(
                () =>
                    getViewport(
                        camera,
                        { minX: 0, minY: 0, maxX: width, maxY: height, width, height },
                        hasRowsHeader,
                        hasColumnsHeader,
                    ),
                [camera, width, height, hasRowsHeader, hasColumnsHeader],
            );

            useEffect(() => {
                setTheme((prev) => ({ ...prev, ...themeOverride }));
            }, [themeOverride]);

            useEffect(() => {
                const ctx = contentRef.current?.getContext('2d');
                measurementAPI.current = CanvasMeasurementAPI.create(ctx);
                return () => {
                    measurementAPI.current?.clearCache();
                    measurementAPI.current = null;
                };
            }, [contentRef]);

            useEffect(
                () => {
                    measurementAPI.current?.clearCache();
                },
                [
                    /* theme dependency */
                ],
            );

            useEffect(() => {
                if (!camera?.z) return;
                onZooming?.(camera.z * 100);
            }, [camera.z, onZooming]);

            useEffect(() => {
                setCamera((prev) => ({ ...prev, z: zoom / 100 }));
            }, [zoom]);

            useEffect(() => {
                if (!enablePerformanceMonitoring) return;
                const interval = setInterval(() => logMetrics(), 5000);
                // eslint-disable-next-line consistent-return
                return () => clearInterval(interval);
            }, [enablePerformanceMonitoring, logMetrics]);

            const stableContext = useMemo(
                () => ({
                    backgroundRef,
                    contentRef,
                    selectionRef,
                    headersRef,
                    overlayRef,
                    width,
                    height,
                    columnsAmount: columnsAmount ?? DEFAULT_COLUMNS_AMOUNT,
                    rowsAmount: rowsAmount ?? DEFAULT_ROWS_AMOUNT,
                    measurementAPI,
                    hasColumnsHeader: hasColumnsHeader ?? false,
                    hasRowsHeader: hasRowsHeader ?? false,
                    getCellDisplayValue,
                    getCellStyle,
                    getCellComponents,
                    onToggleGroup: onToggleGroup ?? noop,
                    onColumnsResize,
                    onRowsResize,
                    onRowExpandResize,
                    onColumnExpandResize,
                    onColumnsAutoFit,
                    onRowsAutoFit,
                    currentHeader,
                    currentColumnsHeaderCellIndex,
                    currentRowsHeaderCellIndex,
                    cellsWithComponents,
                    setCamera,
                    setResizer,
                    setTheme,
                    setComponentsInfo,
                }),
                [
                    width,
                    height,
                    columnsAmount,
                    rowsAmount,
                    hasColumnsHeader,
                    hasRowsHeader,
                    onColumnsAutoFit,
                    onRowsAutoFit,
                    onRowExpandResize,
                    onColumnExpandResize,
                    measurementAPI,
                ],
            );

            const volatileContext = useMemo(
                () => ({
                    lastupdate,
                    columnsMetadata,
                    rowsMetadata,
                    camera,
                    viewport,
                    cursor,
                    ranges: ranges ?? [],
                    rangesStyles: rangesStyles ?? {},
                    joinedCells: joinedCells ?? [],
                    fillDraggingRange: fillDraggingRange ?? null,
                    cursorStyle,
                    editingCell,
                    currentValue,
                    frozenRows: frozenRows ?? 0,
                    frozenColumns: frozenColumns ?? 0,
                    frozenAreaWidth: frozenAreas.width,
                    frozenAreaHeight: frozenAreas.height,
                    theme,
                    resizer,
                    rowGroups: rowGroups ?? [],
                    columnGroups: columnGroups ?? [],
                    componentsInfo,
                }),
                [
                    lastupdate,
                    camera,
                    viewport,
                    cursor,
                    ranges,
                    rangesStyles,
                    columnsMetadata,
                    rowsMetadata,
                    editingCell,
                    currentValue,
                    joinedCells,
                    resizer,
                    frozenRows,
                    frozenColumns,
                    frozenAreas,
                    theme,
                    componentsInfo,
                    fillDraggingRange,
                    cursorStyle,
                ],
            );

            const contextValue = useMemo(
                () => ({ ...stableContext, ...volatileContext } as CanvasTableContext),
                [stableContext, volatileContext],
            );

            return (
                <CanvasSpreadSheetProvider value={contextValue}>
                    <Scrollbar>
                        <Container>
                            <Canvas
                                ref={tableAPIRef}
                                onViewportChange={onViewportChange}
                                onKeyDown={onKeyDown}
                                onKeyUp={onKeyUp}
                                onClick={onClick}
                                onMouseDown={onMouseDown}
                                onMouseUp={onMouseUp}
                                onDblClick={onDblClick}
                                onCellEnter={onCellEnter}
                                onCellLeave={onCellLeave}
                                onContextMenu={onContextMenu}
                                onRootMouseDown={onRootMouseDown}
                                onRootMouseUp={onRootMouseUp}
                                onRowsHeaderCellMouseDown={onRowsHeaderCellMouseDown}
                                onRowsHeaderCellMouseUp={onRowsHeaderCellMouseUp}
                                onRowsHeaderCellClick={onRowsHeaderCellClick}
                                onRowsHeaderCellEnter={onRowsHeaderCellEnter}
                                onRowsHeaderCellLeave={onRowsHeaderCellLeave}
                                onColumnsHeaderCellMouseDown={onColumnsHeaderCellMouseDown}
                                onColumnsHeaderCellMouseUp={onColumnsHeaderCellMouseUp}
                                onColumnsHeaderCellClick={onColumnsHeaderCellClick}
                                onColumnsHeaderCellEnter={onColumnsHeaderCellEnter}
                                onColumnsHeaderCellLeave={onColumnsHeaderCellLeave}
                                onFillHandleMouseDown={onFillHandleMouseDown}
                                onFillHandleMouseMove={onFillHandleMouseMove}
                                onFillHandleMouseUp={onFillHandleMouseUp}
                            />
                        </Container>
                    </Scrollbar>
                </CanvasSpreadSheetProvider>
            );
        },
    ),
    (prevProps, nextProps) =>
        prevProps.lastupdate === nextProps.lastupdate &&
        prevProps.width === nextProps.width &&
        prevProps.height === nextProps.height &&
        prevProps.zoom === nextProps.zoom &&
        prevProps.cursor === nextProps.cursor &&
        prevProps.ranges === nextProps.ranges &&
        prevProps.rangesStyles === nextProps.rangesStyles &&
        prevProps.columnsMetadata === nextProps.columnsMetadata &&
        prevProps.rowsMetadata === nextProps.rowsMetadata &&
        prevProps.frozenRows === nextProps.frozenRows &&
        prevProps.frozenColumns === nextProps.frozenColumns &&
        prevProps.fillDraggingRange === nextProps.fillDraggingRange &&
        prevProps.cursorStyle === nextProps.cursorStyle,
);

export const CanvasTable = React.memo(
    forwardRef<ICanvasTableAPI, ICanvasTableProps>((props, tableAPIRef) => {
        const [isInitialized, setIsInitialized] = useState(false);

        useLayoutEffect(() => {
            setIsInitialized(true);
        }, []);

        if (!isInitialized) {
            return (
                <div
                    style={{
                        width: props.width,
                        height: props.height,
                        visibility: 'hidden', // невидимый placeholder
                    }}
                />
            );
        }

        return <CanvasTableInternal {...props} ref={tableAPIRef} />;
    }),
);

CanvasTable.displayName = 'CanvasTable';
