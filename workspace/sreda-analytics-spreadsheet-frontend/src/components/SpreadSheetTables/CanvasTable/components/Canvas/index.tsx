import React, {
    forwardRef,
    ForwardRefExoticComponent,
    MouseEvent,
    PropsWithoutRef,
    RefAttributes,
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

import { ObjectIndexes } from '../../../../AdapterSpreadSheet/types';
import {
    COLLAPSED_INDICATOR_TOLERANCE,
    COLUMNS_HEADER_HEIGHT,
    DPR,
    ROWS_HEADER_WIDTH,
    SCROLL_GAP,
    SCROLL_TIMER_LINE,
    SCROLL_TIMER_STEP,
} from '../../const';
import { CanvasSpreadSheetContext } from '../../context';
import { ViewportCacheContext } from '../../context/ViewportCacheContext';
import { useCamera } from '../../hooks/useCamera.hook';
import { useFillHandleRendering } from '../../hooks/useFillHandleRendering.hook';
import { useKeyboard } from '../../hooks/useKeyboard.hook';
import { useLayeredRendering } from '../../hooks/useLayeredRendering.hook';
import { useResize } from '../../hooks/useResize.hook';
import { ICanvasTableAPI, ISpreadsheetMouseEvent, IVisibleRanges } from '../../types';
import { screen2Cell, worldToScreen } from '../../utils';
import { findCollapsedColumnIndicatorByScreenX, findCollapsedRowIndicatorByScreenY } from '../../utils/collapsedIndicators';
import styles from './styles.module.css';
import { ICanvasProps } from './types';

export const Canvas: ForwardRefExoticComponent<Omit<ICanvasProps, 'ref'> & RefAttributes<ICanvasTableAPI>> = forwardRef<
    ICanvasTableAPI,
    PropsWithoutRef<ICanvasProps>
>(
    (
        {
            onViewportChange = () => {},

            onContextMenu = () => {},

            onKeyDown = () => {},
            onKeyUp = () => {},

            onCellEnter = () => {},
            onMouseDown = () => {},
            onClick = () => {},
            onDblClick = () => {},
            onMouseUp = () => {},
            onCellLeave = () => {},

            onRootMouseDown = () => {},
            onRootClick = () => {},
            onRootDblClick = () => {},
            onRootMouseUp = () => {},

            onRowsHeaderCellEnter = () => {},
            onRowsHeaderCellMouseDown = () => {},
            onRowsHeaderCellClick = () => {},
            onRowsHeaderCellDblClick = () => {},
            onRowsHeaderCellMouseUp = () => {},
            onRowsHeaderCellLeave = () => {},

            onColumnsHeaderCellEnter = () => {},
            onColumnsHeaderCellMouseDown = () => {},
            onColumnsHeaderCellClick = () => {},
            onColumnsHeaderCellDblClick = () => {},
            onColumnsHeaderCellMouseUp = () => {},
            onColumnsHeaderCellLeave = () => {},

            onFillHandleMouseDown = () => {},
            onFillHandleMouseMove = () => {},
            onFillHandleMouseUp = () => {},
        },
        tableRef,
    ) => {
        const {
            lastupdate,
            backgroundRef,
            contentRef,
            selectionRef,
            headersRef,
            overlayRef,
            width,
            height,
            viewport,
            camera,
            hasColumnsHeader,
            hasRowsHeader,
            resizer,
            columnsMetadata,
            rowsMetadata,
            currentRowsHeaderCellIndex,
            currentColumnsHeaderCellIndex,
            currentHeader,
            componentsInfo,
            cursorStyle,
            rowGroups,
            columnGroups,
            onToggleGroup,
            frozenRows,
            frozenColumns,
            measurementAPI,
        } = useContext(CanvasSpreadSheetContext);

        const viewportCache = useContext(ViewportCacheContext);

        const currentCell = useRef<ObjectIndexes>({ columnIndex: 0, rowIndex: 0 });
        const isMousePressed = useRef<boolean>(false);
        const scrollInterval = useRef<NodeJS.Timer>();
        const isFillHandleDragging = useRef<boolean>(false);
        const lastFillCell = useRef<ObjectIndexes>({ columnIndex: 0, rowIndex: 0 });

        const {
            setResizingCursor,
            onRowResizerMouseDown,
            onColumnResizerMouseDown,
            onRowResizerMouseUp,
            onColumnResizerMouseUp,
        } = useResize();
        const { zoomCamera, zoomCameraIn, zoomCameraOut, panCamera, scrollToColumn, scrollToRow, scrollToCell } = useCamera();
        const { handleCanvasKeyDown } = useKeyboard();
        const { isPointOnFillHandle } = useFillHandleRendering();

        const { renderLayers, refresh, updateLayer, getCanvasContext, exportToImage } = useLayeredRendering();

        const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
            if (event.button !== 0) return;

            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            // НОВОЕ: Проверяем fill handle ПЕРВЫМ (приоритет над resizer)
            if (isPointOnFillHandle(xWithoutOffset, yWithoutOffset)) {
                const cell = screen2Cell(
                    xWithoutOffset,
                    yWithoutOffset,
                    columnsMetadata,
                    rowsMetadata,
                    camera,
                    frozenRows,
                    frozenColumns,
                    hasRowsHeader,
                    hasColumnsHeader,
                );
                isFillHandleDragging.current = true;
                lastFillCell.current = cell;

                // Вызываем handler из AdapterSpreadSheet
                onFillHandleMouseDown?.({ cell });
                currentCell.current = cell;
                return;
            }

            if (onRowResizerMouseDown(event)) return;
            if (onColumnResizerMouseDown(event)) return;

            isMousePressed.current = true;

            const cell = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            const isColumnsHeader = hasColumnsHeader && cell.rowIndex === -1;
            const isRowsHeader = hasRowsHeader && cell.columnIndex === -1;

            const mouseEvent = {
                metaKey: event.metaKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                cell,
            };

            if (!isColumnsHeader && !isRowsHeader) {
                const tolerance = 5;

                const targetComponent = componentsInfo.find(
                    (component) =>
                        xWithoutOffset >= component.x - tolerance &&
                        xWithoutOffset <= component.x + tolerance + component.width &&
                        yWithoutOffset >= component.y - tolerance &&
                        yWithoutOffset <= component.y + tolerance + component.height,
                );
                if (targetComponent && !targetComponent?.disabled) {
                    const componentEvent = {
                        x: targetComponent.x,
                        y: targetComponent.y,
                        width: targetComponent.width,
                        height: targetComponent.height,
                    };

                    targetComponent?.onMouseDown?.({ ...mouseEvent, component: componentEvent });
                }

                onMouseDown?.(mouseEvent);
            } else if (!isRowsHeader && isColumnsHeader) {
                onColumnsHeaderCellMouseDown?.(mouseEvent);
            } else if (isRowsHeader && !isColumnsHeader) {
                onRowsHeaderCellMouseDown?.(mouseEvent);
            } else {
                onRootMouseDown?.(mouseEvent);
            }
        };

        const handleCanvasMouseMove = (event: ISpreadsheetMouseEvent) => {
            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            const cell = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            if (isFillHandleDragging.current) {
                if (cell.rowIndex !== -1 && cell.columnIndex !== -1) {
                    if (
                        cell.rowIndex !== currentCell.current.rowIndex ||
                        cell.columnIndex !== currentCell.current.columnIndex
                    ) {
                        onFillHandleMouseMove?.({ cell });
                        currentCell.current = cell;
                        lastFillCell.current = cell;
                    }
                }
                return;
            }

            // Row header
            if (cell.rowIndex !== -1 && cell.columnIndex === -1) {
                if (!currentHeader.current) {
                    currentHeader.current = 'row';
                }

                if (currentRowsHeaderCellIndex.current === null) {
                    currentRowsHeaderCellIndex.current = cell.rowIndex;
                    onRowsHeaderCellEnter(event, cell.rowIndex);
                } else if (currentRowsHeaderCellIndex.current !== cell.rowIndex) {
                    onRowsHeaderCellLeave(event, currentRowsHeaderCellIndex.current);
                    currentRowsHeaderCellIndex.current = cell.rowIndex;
                    onRowsHeaderCellEnter(event, cell.rowIndex);
                }

                if (!isMousePressed.current) {
                    setResizingCursor(xWithoutOffset, yWithoutOffset, overlayRef.current, cell, 'row');
                }
                return;
            }

            // Column header
            if (cell.rowIndex === -1 && cell.columnIndex !== -1) {
                if (!currentHeader.current) {
                    currentHeader.current = 'column';
                }

                if (currentColumnsHeaderCellIndex.current === null) {
                    currentColumnsHeaderCellIndex.current = cell.columnIndex;
                    onColumnsHeaderCellEnter(event, cell.columnIndex);
                } else if (currentColumnsHeaderCellIndex.current !== cell.columnIndex) {
                    onColumnsHeaderCellLeave(event, currentColumnsHeaderCellIndex.current);
                    currentColumnsHeaderCellIndex.current = cell.columnIndex;
                    onColumnsHeaderCellEnter(event, cell.columnIndex);
                }

                if (!isMousePressed.current) {
                    setResizingCursor(xWithoutOffset, yWithoutOffset, overlayRef.current, cell, 'column');
                }
                return;
            }

            // Обычная ячейка или рут
            if (currentHeader.current === 'column') {
                if (currentColumnsHeaderCellIndex.current) {
                    onColumnsHeaderCellLeave({ metaKey: false }, currentColumnsHeaderCellIndex.current);
                }
            } else if (currentHeader.current === 'row') {
                if (currentRowsHeaderCellIndex.current) {
                    onRowsHeaderCellLeave({ metaKey: false }, currentRowsHeaderCellIndex.current);
                }
            }

            currentColumnsHeaderCellIndex.current = null;
            currentRowsHeaderCellIndex.current = null;
            currentHeader.current = null;

            if (resizer) {
                setResizingCursor(xWithoutOffset, yWithoutOffset, overlayRef.current, cell, null);
            }

            if (!isMousePressed.current && !resizer && overlayRef.current) {
                if (isPointOnFillHandle(xWithoutOffset, yWithoutOffset)) {
                    overlayRef.current.style.cursor = 'crosshair';
                } else {
                    const tolerance = 5;

                    const isOnComponent = componentsInfo.some(
                        (component) =>
                            !component.disabled &&
                            xWithoutOffset >= component.x - tolerance &&
                            xWithoutOffset <= component.x + tolerance + component.width &&
                            yWithoutOffset >= component.y - tolerance &&
                            yWithoutOffset <= component.y + tolerance + component.height,
                    );

                    if (isOnComponent) {
                        overlayRef.current.style.cursor = 'pointer';
                    } else {
                        overlayRef.current.style.cursor = cursorStyle || 'default';
                    }
                }
            }

            // Root cell
            if (cell.columnIndex === -1 && cell.rowIndex === -1) {
                // TODO: Root handlers
                return;
            }

            if (cell.rowIndex === currentCell.current.rowIndex && cell.columnIndex === currentCell.current.columnIndex) {
                // Ячейка не изменилась, делать нечего
                return;
            }

            onCellLeave({
                metaKey: event.metaKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                cell: currentCell.current,
            });
            currentCell.current = cell;
            onCellEnter({
                metaKey: event.metaKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                cell: currentCell.current,
            });
        };

        const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            const cell = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            if (isFillHandleDragging.current) {
                onFillHandleMouseUp?.({ cell });
                isFillHandleDragging.current = false;
                clearInterval(scrollInterval.current);
                scrollInterval.current = undefined;
                return;
            }

            isMousePressed.current = false;

            if (resizer && resizer.mode === 'dragging' && resizer.type === 'column') {
                onColumnResizerMouseUp(event);
                return;
            }
            if (resizer && resizer.mode === 'dragging' && resizer.type === 'row') {
                onRowResizerMouseUp(event);
                return;
            }

            const mouseEvent = {
                metaKey: event.metaKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                cell,
            };

            const isColumnsHeader = hasColumnsHeader && cell.rowIndex === -1;
            const isRowsHeader = hasRowsHeader && cell.columnIndex === -1;

            if (!isColumnsHeader && !isRowsHeader) {
                const tolerance = 5;

                const targetComponent = componentsInfo.find(
                    (component) =>
                        xWithoutOffset >= component.x - tolerance &&
                        xWithoutOffset <= component.x + tolerance + component.width &&
                        yWithoutOffset >= component.y - tolerance &&
                        yWithoutOffset <= component.y + tolerance + component.height,
                );
                if (targetComponent && !targetComponent?.disabled) {
                    const componentEvent = {
                        x: targetComponent.x,
                        y: targetComponent.y,
                        width: targetComponent.width,
                        height: targetComponent.height,
                    };

                    targetComponent?.onMouseUp?.({ ...mouseEvent, component: componentEvent });
                }

                onMouseUp?.(mouseEvent);
            } else if (!isRowsHeader && isColumnsHeader) {
                onColumnsHeaderCellMouseUp?.(mouseEvent);
            } else if (isRowsHeader && !isColumnsHeader) {
                onRowsHeaderCellMouseUp?.(mouseEvent);
            } else {
                onRootMouseUp?.(mouseEvent);
            }
        };

        const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
            event.preventDefault();

            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            // Проверяем клик на индикатор свёрнутой строки (в области заголовка строк)
            if (hasRowsHeader && xWithoutOffset < ROWS_HEADER_WIDTH * camera.z) {
                const collapsedRowIndex = findCollapsedRowIndicatorByScreenY(
                    yWithoutOffset,
                    rowsMetadata,
                    camera,
                    hasColumnsHeader,
                    COLUMNS_HEADER_HEIGHT,
                    COLLAPSED_INDICATOR_TOLERANCE,
                    rowsMetadata.length,
                );
                if (collapsedRowIndex !== null) {
                    onContextMenu?.({
                        cell: { rowIndex: collapsedRowIndex, columnIndex: -1 },
                        clientX,
                        clientY,
                    });
                    return;
                }
            }

            // Проверяем клик на индикатор свёрнутой колонки (в области заголовка колонок)
            if (hasColumnsHeader && yWithoutOffset < COLUMNS_HEADER_HEIGHT * camera.z) {
                const collapsedColIndex = findCollapsedColumnIndicatorByScreenX(
                    xWithoutOffset,
                    columnsMetadata,
                    camera,
                    hasRowsHeader,
                    ROWS_HEADER_WIDTH,
                    COLLAPSED_INDICATOR_TOLERANCE, // tolerance
                    columnsMetadata.length,
                );
                if (collapsedColIndex !== null) {
                    onContextMenu?.({
                        cell: { rowIndex: -1, columnIndex: collapsedColIndex },
                        clientX,
                        clientY,
                    });
                    return;
                }
            }

            const cell = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            onContextMenu?.({ cell, clientX, clientY });
        };

        const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            const cell = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            const mouseEvent = {
                metaKey: event.metaKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                cell,
            };

            const isColumnsHeader = hasColumnsHeader && cell.rowIndex === -1;
            const isRowsHeader = hasRowsHeader && cell.columnIndex === -1;

            // Check row group indicators
            for (const group of rowGroups) {
                const startY = rowsMetadata.at(group.start).y;
                const endY = rowsMetadata.at(group.end).y + rowsMetadata.at(group.end).height;
                const indicatorX = ROWS_HEADER_WIDTH - 15;
                const indicatorY = (startY + endY) / 2;

                if (
                    xWithoutOffset >= indicatorX - 10 &&
                    xWithoutOffset <= indicatorX + 10 &&
                    yWithoutOffset >= indicatorY - 10 &&
                    yWithoutOffset <= indicatorY + 10
                ) {
                    onToggleGroup(group.id, 'row');
                    return;
                }
            }

            // Check column group indicators
            for (const group of columnGroups) {
                const startX = columnsMetadata.at(group.start).x;
                const endX = columnsMetadata.at(group.end).x + columnsMetadata.at(group.end).width;
                const indicatorX = (startX + endX) / 2;
                const indicatorY = COLUMNS_HEADER_HEIGHT - 15;

                if (
                    xWithoutOffset >= indicatorX - 10 &&
                    xWithoutOffset <= indicatorX + 10 &&
                    yWithoutOffset >= indicatorY - 10 &&
                    yWithoutOffset <= indicatorY + 10
                ) {
                    onToggleGroup(group.id, 'column');
                    return;
                }
            }

            if (!isColumnsHeader && !isRowsHeader) {
                const tolerance = 5;

                const targetComponent = componentsInfo.find(
                    (component) =>
                        xWithoutOffset >= component.x - tolerance &&
                        xWithoutOffset <= component.x + tolerance + component.width &&
                        yWithoutOffset >= component.y - tolerance &&
                        yWithoutOffset <= component.y + tolerance + component.height,
                );
                if (targetComponent && !targetComponent?.disabled) {
                    const componentEvent = {
                        x: targetComponent.x,
                        y: targetComponent.y,
                        width: targetComponent.width,
                        height: targetComponent.height,
                    };

                    targetComponent?.onClick?.({ ...mouseEvent, component: componentEvent });
                }

                onClick?.(mouseEvent);
            } else if (!isRowsHeader && isColumnsHeader) {
                onColumnsHeaderCellClick?.(mouseEvent);
            } else if (isRowsHeader && !isColumnsHeader) {
                onRowsHeaderCellClick?.(mouseEvent);
            } else {
                onRootClick?.(mouseEvent);
            }
        };

        const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
            event.stopPropagation();

            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            const cell = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            const mouseEvent = {
                metaKey: event.metaKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                cell,
            };

            const isColumnsHeader = hasColumnsHeader && cell.rowIndex === -1;
            const isRowsHeader = hasRowsHeader && cell.columnIndex === -1;

            if (!isColumnsHeader && !isRowsHeader) {
                const tolerance = 5;

                const targetComponent = componentsInfo.find(
                    (component) =>
                        xWithoutOffset >= component.x - tolerance &&
                        xWithoutOffset <= component.x + tolerance + component.width &&
                        yWithoutOffset >= component.y - tolerance &&
                        yWithoutOffset <= component.y + tolerance + component.height,
                );
                if (targetComponent && !targetComponent?.disabled) {
                    const componentEvent = {
                        x: targetComponent.x,
                        y: targetComponent.y,
                        width: targetComponent.width,
                        height: targetComponent.height,
                    };

                    targetComponent?.onDblClick?.({ ...mouseEvent, component: componentEvent });
                }

                onDblClick(mouseEvent);
            } else if (!isRowsHeader && isColumnsHeader) {
                onColumnsHeaderCellDblClick?.(mouseEvent);
            } else if (isRowsHeader && !isColumnsHeader) {
                onRowsHeaderCellDblClick?.(mouseEvent);
            } else {
                onRootDblClick?.(mouseEvent);
            }
        };

        const handleWheel = useCallback(
            (event: WheelEvent) => {
                event.preventDefault();

                const { deltaX, deltaY, ctrlKey } = event;

                if (ctrlKey) {
                    const point = {
                        x: event.clientX,
                        y: event.clientY,
                    };

                    zoomCamera(point, deltaY / 100);
                } else {
                    panCamera(deltaX, deltaY);
                }
            },
            [panCamera, zoomCamera],
        );

        const startScrollInterval = useCallback((cb: () => void) => {
            clearInterval(scrollInterval.current);
            scrollInterval.current = setInterval(cb, SCROLL_TIMER_STEP);
        }, []);

        const handleCanvasMouseOut = (event: MouseEvent<HTMLCanvasElement>) => {
            const { clientX, clientY } = event;
            const xWithoutOffset = clientX - overlayRef.current!.getBoundingClientRect().left;
            const yWithoutOffset = clientY - overlayRef.current!.getBoundingClientRect().top;

            const { columnIndex: cellColumnIndex, rowIndex: cellRowIndex } = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                hasRowsHeader,
                hasColumnsHeader,
            );

            const { columnIndex: cellColumnIndexWithoutHeader, rowIndex: cellRowIndexWithoutHeader } = screen2Cell(
                xWithoutOffset,
                yWithoutOffset,
                columnsMetadata,
                rowsMetadata,
                camera,
                frozenRows,
                frozenColumns,
                false,
                false,
            );

            const screenRowHeaderWidth = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
            const screenColumnHeaderHeight = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;
            const screenPos = worldToScreen(viewport.maxX, viewport.maxY, 'scrollable', {
                camera,
                frozenColumns,
                frozenRows,
                hasColumnsHeader,
                hasRowsHeader,
            });

            const isFillDrag = isFillHandleDragging.current;
            const shouldAutoScroll = isMousePressed.current || isFillDrag;

            if (!shouldAutoScroll) {
                clearInterval(scrollInterval.current);
                scrollInterval.current = undefined;
                return;
            }

            // Определяем новое направление
            let newDirection: 'right' | 'left' | 'down' | 'up' | null = null;
            if (screenPos.x - xWithoutOffset <= SCROLL_GAP) {
                newDirection = 'right';
            } else if (xWithoutOffset - screenRowHeaderWidth <= SCROLL_GAP) {
                newDirection = 'left';
            } else if (screenPos.y - yWithoutOffset <= SCROLL_GAP) {
                newDirection = 'down';
            } else if (yWithoutOffset - screenColumnHeaderHeight <= SCROLL_GAP) {
                newDirection = 'up';
            }
            // Если мышь не на границе - останавливаем скролл
            if (!newDirection) {
                clearInterval(scrollInterval.current);
                scrollInterval.current = undefined;
                return;
            }

            // Проверяем, изменилось ли направление
            const currentDirection = (scrollInterval.current as any)?.direction;
            if (currentDirection === newDirection && scrollInterval.current) {
                return;
            }
            // Останавливаем старый интервал
            clearInterval(scrollInterval.current);
            scrollInterval.current = undefined;

            // Во время авто-скролла обновляем текущую ячейку
            const emitScrollCellChange = (nextCell: ObjectIndexes) => {
                if (isFillDrag) {
                    // Если ячейка невалидная - используем последнюю известную
                    if (nextCell.rowIndex < 0) {
                        nextCell.rowIndex = lastFillCell.current.rowIndex;
                    }
                    if (nextCell.columnIndex < 0) {
                        nextCell.columnIndex = lastFillCell.current.columnIndex;
                    }

                    currentCell.current = nextCell;
                    lastFillCell.current = nextCell;
                    onFillHandleMouseMove?.({ cell: nextCell });
                    return;
                }

                onCellLeave({
                    metaKey: event.metaKey,
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    cell: currentCell.current,
                });
                currentCell.current = nextCell;
                onCellEnter({
                    metaKey: event.metaKey,
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    cell: currentCell.current,
                });
            };

            let scrollTimer = 0;

            if (newDirection === 'right') {
                let currentColumnIndex = cellColumnIndex;
                (scrollInterval.current as any) = { direction: 'right' };

                startScrollInterval(() => {
                    // Проверяем, не отжали ли мышь
                    if (!isFillHandleDragging.current && !isMousePressed.current) {
                        clearInterval(scrollInterval.current);
                        scrollInterval.current = undefined;
                        return;
                    }

                    if (currentColumnIndex < columnsMetadata.length - 1) {
                        let deltaX: number = columnsMetadata.at(currentColumnIndex + 1).width;
                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            deltaX += deltaX;
                        }
                        panCamera(deltaX, 0);

                        const nextCell = {
                            columnIndex: currentColumnIndex + 1,
                            rowIndex: cellRowIndex,
                        };
                        emitScrollCellChange(nextCell);

                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            currentColumnIndex++;
                        }
                        currentColumnIndex++;
                    } else {
                        const deltaX: number = columnsMetadata.at(columnsMetadata.length - 1).width;
                        panCamera(deltaX, 0);
                    }
                    scrollTimer += SCROLL_TIMER_STEP;
                });
            } else if (newDirection === 'left') {
                let currentColumnIndex = cellColumnIndexWithoutHeader;

                if (currentColumnIndex < 0) {
                    currentColumnIndex = lastFillCell.current.columnIndex;
                }
                (scrollInterval.current as any) = { direction: 'left' };

                startScrollInterval(() => {
                    if (!isFillHandleDragging.current && !isMousePressed.current) {
                        clearInterval(scrollInterval.current);
                        scrollInterval.current = undefined;
                        return;
                    }

                    if (currentColumnIndex > 0) {
                        let deltaX: number = columnsMetadata.at(currentColumnIndex - 1).width;
                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            deltaX += deltaX;
                        }
                        panCamera(-deltaX, 0);

                        const nextCell = {
                            columnIndex: currentColumnIndex - 1,
                            rowIndex: cellRowIndex,
                        };
                        emitScrollCellChange(nextCell);

                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            currentColumnIndex--;
                        }
                        currentColumnIndex--;
                    } else {
                        const deltaX: number = columnsMetadata.at(0).width;
                        panCamera(-deltaX, 0);
                    }
                    scrollTimer += SCROLL_TIMER_STEP;
                });
            } else if (newDirection === 'down') {
                let currentRowIndex = cellRowIndex;
                (scrollInterval.current as any) = { direction: 'down' };

                startScrollInterval(() => {
                    if (!isFillHandleDragging.current && !isMousePressed.current) {
                        clearInterval(scrollInterval.current);
                        scrollInterval.current = undefined;
                        return;
                    }

                    if (currentRowIndex < rowsMetadata.length - 1) {
                        let deltaY: number = rowsMetadata.at(currentRowIndex + 1).height;
                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            deltaY += deltaY;
                        }
                        panCamera(0, deltaY);

                        const nextCell = {
                            columnIndex: cellColumnIndex,
                            rowIndex: currentRowIndex + 1,
                        };
                        emitScrollCellChange(nextCell);

                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            currentRowIndex++;
                        }
                        currentRowIndex++;
                    } else {
                        const deltaY: number = rowsMetadata.at(rowsMetadata.length - 1).height;
                        panCamera(0, deltaY);
                    }
                    scrollTimer += SCROLL_TIMER_STEP;
                });
            } else if (newDirection === 'up') {
                let currentRowIndex = cellRowIndexWithoutHeader;
                if (currentRowIndex < 0) {
                    currentRowIndex = lastFillCell.current.rowIndex;
                }
                (scrollInterval.current as any) = { direction: 'up' };

                startScrollInterval(() => {
                    if (!isFillHandleDragging.current && !isMousePressed.current) {
                        clearInterval(scrollInterval.current);
                        scrollInterval.current = undefined;
                        return;
                    }

                    if (currentRowIndex > 0) {
                        let deltaY: number = rowsMetadata.at(currentRowIndex - 1).height;
                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            deltaY += deltaY;
                        }
                        panCamera(0, -deltaY);

                        const nextCell = {
                            columnIndex: cellColumnIndex,
                            rowIndex: currentRowIndex - 1,
                        };
                        emitScrollCellChange(nextCell);

                        if (scrollTimer > SCROLL_TIMER_LINE) {
                            currentRowIndex--;
                        }
                        currentRowIndex--;
                    } else {
                        const deltaY: number = rowsMetadata.at(0).height;
                        panCamera(0, -deltaY);
                    }
                    scrollTimer += SCROLL_TIMER_STEP;
                });
            }
        };

        const onMouseUpTable = useCallback(() => {
            // Останавливаем скролл
            clearInterval(scrollInterval.current);
            scrollInterval.current = undefined;

            // Завершаем fill handle если активен
            if (isFillHandleDragging.current) {
                const cell = currentCell.current;
                onFillHandleMouseUp?.({ cell });
                isFillHandleDragging.current = false;
            }

            //  Завершаем обычное выделение, если активно
            if (isMousePressed.current) {
                const cell = currentCell.current;
                // Вызываем onMouseUp с финальной ячейкой
                onMouseUp?.({
                    metaKey: false,
                    altKey: false,
                    ctrlKey: false,
                    shiftKey: false,
                    cell,
                });
                isMousePressed.current = false;
            }
        }, [onFillHandleMouseUp, onMouseUp]);

        const onMouseEnterCanvas = () => {
            clearInterval(scrollInterval.current);
            scrollInterval.current = undefined;
        };

        useEffect(() => {
            handleCanvasKeyDown();
        }, [handleCanvasKeyDown]);

        useEffect(
            () => () => {
                clearInterval(scrollInterval.current);
                scrollInterval.current = undefined;
                if (isFillHandleDragging.current) {
                    onFillHandleMouseUp?.({ cell: currentCell.current });
                    isFillHandleDragging.current = false;
                }
                isMousePressed.current = false;
            },
            [onFillHandleMouseUp],
        );

        useEffect(() => {
            document.addEventListener('mouseup', onMouseUpTable);

            return () => {
                document.removeEventListener('mouseup', onMouseUpTable);
            };
        }, [onMouseUpTable]);

        useEffect(() => {
            renderLayers();
        }, [lastupdate, hasColumnsHeader, hasRowsHeader, renderLayers]);

        useEffect(() => {
            const ref = overlayRef.current;
            if (!ref) return;

            ref.addEventListener('wheel', handleWheel, { passive: false });

            // eslint-disable-next-line consistent-return
            return () => {
                if (!ref) return;
                ref.removeEventListener('wheel', handleWheel);
            };
        }, [handleWheel, overlayRef]);

        useEffect(() => {
            [backgroundRef, contentRef, selectionRef, headersRef, overlayRef].forEach((ref) => {
                if (!ref.current) return;
                const canvas = ref.current;

                canvas.width = Math.floor(width * DPR);
                canvas.height = Math.floor(height * DPR);

                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.resetTransform();
                    ctx.scale(DPR, DPR);

                    ctx.imageSmoothingEnabled = false;
                }
            });
        }, [backgroundRef, contentRef, headersRef, height, overlayRef, selectionRef, width]);

        const getVisibleRanges = useCallback((): IVisibleRanges | null => {
            if (!viewportCache) return null;

            const { viewports } = viewportCache;

            // Вычисляем объединенный диапазон
            let minRowIndex = Infinity;
            let maxRowIndex = -Infinity;
            let minColumnIndex = Infinity;
            let maxColumnIndex = -Infinity;

            Object.values(viewports).forEach((vp) => {
                if (!vp) return;
                minRowIndex = Math.min(minRowIndex, vp.minRowIndex);
                maxRowIndex = Math.max(maxRowIndex, vp.maxRowIndex);
                minColumnIndex = Math.min(minColumnIndex, vp.minColumnIndex);
                maxColumnIndex = Math.max(maxColumnIndex, vp.maxColumnIndex);
            });

            return {
                'frozen-both': viewports['frozen-both'],
                'frozen-rows': viewports['frozen-rows'],
                'frozen-columns': viewports['frozen-columns'],
                scrollable: viewports.scrollable,
                combined: {
                    minRowIndex: minRowIndex === Infinity ? 0 : minRowIndex,
                    maxRowIndex: maxRowIndex === -Infinity ? 0 : maxRowIndex,
                    minColumnIndex: minColumnIndex === Infinity ? 0 : minColumnIndex,
                    maxColumnIndex: maxColumnIndex === -Infinity ? 0 : maxColumnIndex,
                },
            };
        }, [viewportCache]);

        useEffect(() => {
            if (viewportCache && onViewportChange) {
                const ranges = getVisibleRanges();
                if (ranges) {
                    onViewportChange(ranges);
                }
            }
        }, [viewportCache, getVisibleRanges]);

        const focus = useCallback(() => {
            if (overlayRef.current) {
                overlayRef.current.focus();
            }
        }, [overlayRef]);

        useImperativeHandle(tableRef, () => ({
            current: overlayRef.current,
            focus,
            refresh,
            getCanvasContext,
            exportToImage,
            panCamera,
            zoomCamera,
            zoomCameraIn,
            zoomCameraOut,
            scrollToColumn,
            scrollToRow,
            scrollToCell,
            getVisibleRanges,
            getMeasurementAPI: () => measurementAPI?.current ?? null,
        }));

        return (
            <div className={styles.canvasContainer} style={{ width, height }}>
                <canvas
                    ref={backgroundRef}
                    className={styles.canvasLayer}
                    width={width}
                    height={height}
                    style={{ position: 'absolute', zIndex: 0 }}
                />

                <canvas
                    ref={contentRef}
                    className={styles.canvasLayer}
                    width={width}
                    height={height}
                    style={{ position: 'absolute', zIndex: 1 }}
                />

                <canvas
                    ref={selectionRef}
                    className={styles.canvasLayer}
                    width={width}
                    height={height}
                    style={{ position: 'absolute', zIndex: 2 }}
                />

                <canvas
                    ref={headersRef}
                    className={styles.canvasLayer}
                    width={width}
                    height={height}
                    style={{ position: 'absolute', zIndex: 3 }}
                />

                <canvas
                    ref={overlayRef}
                    className={styles.canvasLayer}
                    width={width}
                    height={height}
                    style={{ position: 'absolute', zIndex: 4 }}
                    onKeyDown={onKeyDown}
                    onKeyUp={onKeyUp}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseOut={(e) => {
                        onCellLeave(e);
                        handleCanvasMouseOut(e);
                    }}
                    onMouseEnter={onMouseEnterCanvas}
                    onContextMenu={handleContextMenu}
                    onBlur={() => {}}
                    onFocus={() => {}}
                    tabIndex={0}
                />
            </div>
        );
    },
);

Canvas.displayName = 'Canvas';
