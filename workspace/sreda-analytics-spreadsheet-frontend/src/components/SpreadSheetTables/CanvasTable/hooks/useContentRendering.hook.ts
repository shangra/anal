import { useCallback, useContext, useMemo, useRef } from 'react';

import { IButton, ICellStyles } from '../../../AdapterSpreadSheet/types';
import { drawIcon } from '../components/Canvas/components/icon';
import { drawText } from '../components/Canvas/components/text';
import {
    COMPONENT_SIZE,
    COMPONENTS_GAP,
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    DEFAULT_PADDING_X,
    DEFAULT_PADDING_Y,
    LINE_HEIGHT_FACTOR,
} from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { ViewportCacheContext } from '../context/ViewportCacheContext';
import { IComponentInfo } from '../types';
import { getAlignOffset, getCSSColor, isNil } from '../utils';
import { applyClipRegion, calculateClipBoundaries } from '../utils/clipBoundaries';
import { CellArea, getCellArea, worldToScreen } from '../utils/coordinates';
import { AnimCache, runAnimation, stopAnimation } from '../utils/runAnimation';
import { applyTransform, createCellTransform } from '../utils/transform';
import { VirtualInputState } from './useVirtualInput.hook/types';
import { getFocus } from './useVirtualInput.hook/utils';

export const useContentRendering = (
    animCache: React.MutableRefObject<AnimCache>,
    onRedrawContentRef: React.MutableRefObject<() => void>,
) => {
    const {
        editingCell,
        // currentValue,
        rowsMetadata,
        columnsMetadata,
        theme,
        hasColumnsHeader,
        hasRowsHeader,
        measurementAPI,
        setComponentsInfo,
        camera,
        frozenRows,
        frozenColumns,
        width,
        height,
        getCellDisplayValue,
        getCellComponents,
        getCellStyle,
    } = useContext(CanvasSpreadSheetContext);

    const viewportCache = useContext(ViewportCacheContext);

    const componentsInfoRef = useRef<IComponentInfo[]>([]);

    const clipBoundaries = useMemo(
        () =>
            calculateClipBoundaries(
                camera,
                frozenRows,
                frozenColumns,
                rowsMetadata,
                columnsMetadata,
                hasRowsHeader,
                hasColumnsHeader,
                width,
                height,
            ),
        [camera, frozenRows, frozenColumns, rowsMetadata, columnsMetadata, hasRowsHeader, hasColumnsHeader, width, height],
    );

    /**
     * Рендерит иконку компонента
     */
    const renderCellComponent = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            component: IButton,
            worldX: number,
            worldY: number,
            styles: ICellStyles,
            componentsInfo: IComponentInfo[],
            rowIndex: number,
            columnIndex: number,
            area: CellArea,
        ) => {
            let cmpColor = getCSSColor(theme.cmpSecondaryColor ?? theme.cmpColor);

            if (component.color === 'primary') {
                cmpColor = getCSSColor(theme.cmpPrimaryColor ?? theme.cmpColor);
            } else if (component.color === 'controlled') {
                cmpColor = getCSSColor(theme.cmpControlledColor ?? theme.cmpColor);
            }

            if (typeof cmpColor === 'object') cmpColor = '';

            // Рисуем в world space
            // Полупрозрачность для disabled-кнопок
            const disabledOpacity = component.disabled ? { opacity: 0.5 } : undefined;

            if (component.animation) {
                const animValues = runAnimation(
                    animCache.current,
                    component,
                    component.animation.keyframes,
                    component.animation.options,
                    () => onRedrawContentRef.current(),
                );

                drawIcon(
                    ctx,
                    {
                        x: worldX,
                        y: worldY,
                        size: COMPONENT_SIZE,
                        icon: component.icon,
                        color: cmpColor as string,
                        verticalAlign: styles?.verticalAlign,
                        fontSize: styles?.fontSize || DEFAULT_FONT_SIZE,
                    },
                    { ...animValues, ...disabledOpacity },
                );
            } else {
                stopAnimation(animCache.current, component);

                drawIcon(
                    ctx,
                    {
                        x: worldX,
                        y: worldY,
                        size: COMPONENT_SIZE,
                        icon: component.icon,
                        color: cmpColor as string,
                        verticalAlign: styles?.verticalAlign,
                        fontSize: styles?.fontSize || DEFAULT_FONT_SIZE,
                    },
                    disabledOpacity,
                );
            }

            // Конвертируем в screen space для componentsInfo
            const coordCtx = {
                camera,
                hasRowsHeader,
                hasColumnsHeader,
                frozenRows,
                frozenColumns,
            };

            const screenPos = worldToScreen(worldX, worldY, area, coordCtx);

            componentsInfo.push({
                x: screenPos.x,
                y: screenPos.y,
                width: COMPONENT_SIZE * camera.z,
                height: COMPONENT_SIZE * camera.z,
                rowIndex,
                columnIndex,
                loading: !!component.loading,
                ...(!component.disabled && { onMouseDown: component.onMouseDown }),
                ...(!component.disabled && { onClick: component.onClick }),
                ...(!component.disabled && { onMouseUp: component.onMouseUp }),
                ...(!component.disabled && { onDblClick: component.onDblClick }),
                disabled: component.disabled,
            });
        },
        [
            theme.cmpSecondaryColor,
            theme.cmpColor,
            theme.cmpPrimaryColor,
            theme.cmpControlledColor,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            frozenRows,
            frozenColumns,
            animCache,
            onRedrawContentRef,
        ],
    );

    /**
     * Рендерит содержимое одной ячейки
     */
    const renderCellContent = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            rowIndex: number,
            columnIndex: number,
            cellBounds: { x: number; y: number; width: number; height: number },
            value: string | number | null | undefined,
            components: IButton[],
            styles: ICellStyles,
            componentsInfo: IComponentInfo[],
            area: CellArea,
        ) => {
            let { x } = cellBounds;

            if (isNil(value) && !components.length) return;

            // ── Единственный вызов measurementAPI ────────────────────────────────
            const measurement =
                value && measurementAPI?.current
                    ? measurementAPI.current.measureText({
                          text: String(value),
                          fontSize: styles?.fontSize,
                          fontFamily: styles?.fontFamily,
                          fontWeight: styles?.fontWeight as string,
                          fontStyle: styles?.fontStyle,
                          maxWidth: cellBounds.width,
                          componentsCount: components.length,
                          componentSize: COMPONENT_SIZE,
                          componentGap: COMPONENTS_GAP,
                      })
                    : null;

            const textWidth = measurement?.width ?? 0;
            const componentsWidth =
                measurement?.componentsWidth ??
                (components.length ? COMPONENT_SIZE * components.length + COMPONENTS_GAP * (components.length - 1) : 0);

            const hasComponentsBefore = components.some((c) => c.positionRelativeToText === 'before');
            const hasComponentsAfter = components.some((c) => c.positionRelativeToText === 'after');
            const contentWidth =
                measurement?.totalWidth ??
                textWidth +
                    componentsWidth +
                    (hasComponentsBefore ? COMPONENTS_GAP : 0) +
                    (hasComponentsAfter ? COMPONENTS_GAP : 0);

            x += getAlignOffset(cellBounds.width, contentWidth, styles?.horizontalAlign);

            // ── Цвет ─────────────────────────────────────────────────────────────
            const isOdd = (rowIndex + 1) % 2 === 0;
            let color = getCSSColor(styles?.color ?? '');
            if (!color) {
                color = getCSSColor((isOdd ? theme.oddRowsCellColor : theme.evenRowsCellColor) ?? theme.color);
            }
            if (typeof color === 'object') color = '';

            const fontSize = styles?.fontSize || DEFAULT_FONT_SIZE;
            const lineHeight = fontSize * LINE_HEIGHT_FACTOR;

            // ── Before components ─────────────────────────────────────────────────
            components.forEach((component) => {
                if (component.positionRelativeToText !== 'before') return;

                const componentY = cellBounds.y + getAlignOffset(cellBounds.height, lineHeight, styles?.verticalAlign);
                renderCellComponent(ctx, component, x, componentY, styles, componentsInfo, rowIndex, columnIndex, area);
                x += COMPONENT_SIZE + COMPONENTS_GAP;
            });

            // ── Text ──────────────────────────────────────────────────────────────
            if (!isNil(value)) {
                drawText(ctx, {
                    x,
                    y: cellBounds.y,
                    width: textWidth,
                    height: cellBounds.height,
                    value: String(value),
                    hyphenation: styles?.hyphenation,
                    horizontalAlign: styles?.horizontalAlign,
                    verticalAlign: styles?.verticalAlign,
                    color: color as string,
                    fontStyle: styles?.fontStyle,
                    fontSize,
                    fontFamily: styles?.fontFamily,
                    fontWeight: styles?.fontWeight,
                    fontDecoration: styles?.fontDecoration,
                    cellSize: cellBounds,
                });
            }

            x += textWidth;

            // ── After components ──────────────────────────────────────────────────
            components.forEach((component) => {
                if (component.positionRelativeToText !== 'after') return;

                const componentY = cellBounds.y + getAlignOffset(cellBounds.height, lineHeight, styles?.verticalAlign);
                renderCellComponent(
                    ctx,
                    component,
                    x + COMPONENTS_GAP * 2,
                    componentY,
                    styles,
                    componentsInfo,
                    rowIndex,
                    columnIndex,
                    area,
                );
                x += COMPONENT_SIZE + COMPONENTS_GAP;
            });
        },
        [measurementAPI, theme.oddRowsCellColor, theme.evenRowsCellColor, theme.color, renderCellComponent],
    );

    const renderInlineEditor = useCallback(
        (ctx: CanvasRenderingContext2D, timestamp: number, inputState?: VirtualInputState) => {
            if (!editingCell || !inputState) return;

            const { rowIndex, columnIndex } = editingCell.coordinates;
            const rowMeta = rowsMetadata.at(rowIndex);
            const colMeta = columnsMetadata.at(columnIndex);
            if (!rowMeta || !colMeta) return;

            const area = getCellArea(rowIndex, columnIndex, frozenRows, frozenColumns);
            const clip = clipBoundaries[area];
            if (!clip || clip.width <= 0 || clip.height <= 0) return;

            ctx.save();
            applyClipRegion(ctx, clip);
            const transform = createCellTransform(area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            const styles = getCellStyle(rowIndex, columnIndex);
            const fontSize = styles?.fontSize || DEFAULT_FONT_SIZE;
            const lineHeight = fontSize * LINE_HEIGHT_FACTOR;
            const paddingLeft = DEFAULT_PADDING_X + (styles?.paddingLeft ?? 0);
            const paddingTop = DEFAULT_PADDING_Y + (styles?.paddingTop ?? 0);

            const textX = colMeta.x + paddingLeft;
            const textY = rowMeta.y; // baseline origin — скорректируем ниже

            ctx.font = `${styles?.fontStyle ?? ''} ${styles?.fontWeight ?? ''} ${fontSize}px ${
                styles?.fontFamily || DEFAULT_FONT_FAMILY
            }`.trim();

            const color = getCSSColor(styles?.color || theme.color);
            const colorStr = typeof color === 'string' ? color : '#000';

            const { value, selectionStart, selectionEnd } = inputState;
            const lines = value.split('\n');

            // ── Фон ячейки (белый при редактировании) ────────────────────────────────
            ctx.fillStyle = '#fff';
            ctx.fillRect(colMeta.x, rowMeta.y, colMeta.width, rowMeta.height);

            // ── Рендер строк ──────────────────────────────────────────────────────────
            let absoluteIndex = 0; // абсолютная позиция начала текущей строки

            lines.forEach((line, lineIdx) => {
                const lineY = rowMeta.y + paddingTop + lineIdx * lineHeight;
                const lineStart = absoluteIndex;
                const lineEnd = lineStart + line.length;

                // ── Highlight выделения ─────────────────────────────────────────────
                if (selectionStart !== selectionEnd) {
                    const selFrom = Math.max(selectionStart, lineStart);
                    const selTo = Math.min(selectionEnd, lineEnd);

                    if (selFrom < selTo) {
                        const beforeSel = line.slice(0, selFrom - lineStart);
                        const selected = line.slice(selFrom - lineStart, selTo - lineStart);

                        const highlightX = textX + ctx.measureText(beforeSel).width;
                        const highlightW = ctx.measureText(selected).width;

                        // На первой/последней строке - частичная подсветка;
                        // на средних строках — подсветка до конца строки плюс символ \n
                        const isPartialEnd = selTo < lineEnd;
                        const finalW = isPartialEnd ? highlightW : highlightW + ctx.measureText(' ').width; // визуально включаем \n

                        ctx.fillStyle = 'rgba(0, 120, 215, 0.3)';
                        ctx.fillRect(highlightX, lineY, finalW, lineHeight);
                    }
                }

                // ── Текст ────────────────────────────────────────────────────────────
                ctx.fillStyle = colorStr;
                ctx.fillText(line, textX, lineY + fontSize);

                // ── Мигающий курсор ───────────────────────────────────────────────────
                const cursorVisible = Math.floor(timestamp / 530) % 2 === 0;
                const cursorPos = getFocus(inputState);

                if (cursorVisible && selectionStart === selectionEnd && cursorPos >= lineStart && cursorPos <= lineEnd) {
                    const beforeCursor = line.slice(0, cursorPos - lineStart);
                    const cursorX = textX + ctx.measureText(beforeCursor).width;

                    ctx.fillStyle = colorStr;
                    ctx.fillRect(cursorX, lineY + 2, 1.5, fontSize);
                }

                absoluteIndex += line.length + 1; // +1 за \n
            });

            ctx.restore();
        },
        [
            editingCell,
            rowsMetadata,
            columnsMetadata,
            frozenRows,
            frozenColumns,
            clipBoundaries,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            getCellStyle,
            theme.color,
        ],
    );

    /**
     * Рендерит ячейки для одной области
     */
    const renderAreaCells = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            area: CellArea,
            vp: { minRowIndex: number; maxRowIndex: number; minColumnIndex: number; maxColumnIndex: number },
            componentsInfo: IComponentInfo[],
            clip: { x: number; y: number; width: number; height: number } | null,
        ) => {
            const { minRowIndex, maxRowIndex, minColumnIndex, maxColumnIndex } = vp;

            if (minRowIndex < 0 || maxRowIndex < 0 || minColumnIndex < 0 || maxColumnIndex < 0) return;
            if (!clip || clip.width <= 0 || clip.height <= 0) return;

            if (!viewportCache) return;
            const { joinedCellsIndex } = viewportCache;

            const totalCells = (maxRowIndex - minRowIndex + 1) * (maxColumnIndex - minColumnIndex + 1);
            if (totalCells > 2000 && localStorage.getItem('DBG_PERF') === '1') {
                console.warn(`⚠️ renderAreaCells: Many cells (${totalCells})`, vp);
            }

            ctx.save();
            applyClipRegion(ctx, clip);

            const transform = createCellTransform(area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            for (let rowIndex = minRowIndex; rowIndex <= maxRowIndex; rowIndex++) {
                const rowMeta = rowsMetadata.at(rowIndex);
                if (rowMeta.height === 0) {
                    continue;
                }
                if (!rowMeta) continue;

                for (let columnIndex = minColumnIndex; columnIndex <= maxColumnIndex; columnIndex++) {
                    const colMeta = columnsMetadata.at(columnIndex);
                    if (!colMeta || colMeta.width === 0) continue;

                    const joinedCell = joinedCellsIndex.get(rowIndex, columnIndex);
                    if (joinedCell && !joinedCellsIndex.isMainCell(rowIndex, columnIndex)) {
                        continue;
                    }

                    const value = getCellDisplayValue(rowIndex, columnIndex);
                    const components = getCellComponents(rowIndex, columnIndex);
                    const styles = getCellStyle(rowIndex, columnIndex);

                    if (isNil(value) && !components.length) continue;

                    if (!styles.hyphenation || styles.hyphenation === 'ncrop') {
                        let _value;
                        let _components = [];
                        if (!styles.horizontalAlign || styles.horizontalAlign === 'start') {
                            _value = getCellDisplayValue(rowIndex, columnIndex + 1);
                            _components = getCellComponents(rowIndex, columnIndex + 1);
                        } else if (styles.horizontalAlign === 'end') {
                            _value = getCellDisplayValue(rowIndex, columnIndex - 1);
                            _components = getCellComponents(rowIndex, columnIndex - 1);
                        }
                        if (!isNil(_value) || _components.length) {
                            styles.hyphenation = 'crop';
                        }
                    }

                    const paddingLeft = DEFAULT_PADDING_X + (styles?.paddingLeft ?? 0);
                    let paddingRight = DEFAULT_PADDING_X + (styles?.paddingRight ?? 0);
                    // Увеличиваем отступ справа, если есть after-компоненты, чтобы создать gap перед границей ячейки
                    if (components.some((c) => c.positionRelativeToText === 'after')) {
                        paddingRight += COMPONENTS_GAP;
                    }

                    const paddingTop = DEFAULT_PADDING_Y + (styles?.paddingTop ?? 0);
                    const paddingBottom = DEFAULT_PADDING_Y + (styles?.paddingBottom ?? 0);

                    let cellCoords;
                    if (joinedCell) {
                        const startRow = rowsMetadata.at(joinedCell.topLeft.coordinates.rowIndex);
                        const startCol = columnsMetadata.at(joinedCell.topLeft.coordinates.columnIndex);
                        const endRow = rowsMetadata.at(joinedCell.bottomRight.coordinates.rowIndex);
                        const endCol = columnsMetadata.at(joinedCell.bottomRight.coordinates.columnIndex);

                        if (!startRow || !startCol || !endRow || !endCol) continue;

                        cellCoords = {
                            x: startCol.x + paddingLeft,
                            y: startRow.y + paddingTop,
                            width: endCol.x + endCol.width - startCol.x - paddingLeft - paddingRight,
                            height: endRow.y + endRow.height - startRow.y - paddingTop - paddingBottom,
                        };
                    } else {
                        cellCoords = {
                            x: colMeta.x + paddingLeft,
                            y: rowMeta.y + paddingTop,
                            width: colMeta.width - paddingLeft - paddingRight,
                            height: rowMeta.height - paddingTop - paddingBottom,
                        };
                    }

                    renderCellContent(ctx, rowIndex, columnIndex, cellCoords, value, components, styles, componentsInfo, area);
                }
            }

            ctx.restore();
        },
        [viewportCache, camera, hasRowsHeader, hasColumnsHeader, rowsMetadata, columnsMetadata, renderCellContent],
    );

    /**
     * Главная функция рендеринга контента
     */
    const renderContent = useCallback(
        (canvas: HTMLCanvasElement | null, timestamp = 0 /* , inputState?: VirtualInputState */) => {
            if (!canvas || !viewportCache) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const newComponentsInfo: IComponentInfo[] = [];
            const { viewports } = viewportCache;

            if (viewports['frozen-both']) {
                renderAreaCells(
                    ctx,
                    'frozen-both',
                    viewports['frozen-both'],
                    newComponentsInfo,
                    clipBoundaries['frozen-both'],
                );
            }
            if (viewports['frozen-rows']) {
                renderAreaCells(
                    ctx,
                    'frozen-rows',
                    viewports['frozen-rows'],
                    newComponentsInfo,
                    clipBoundaries['frozen-rows'],
                );
            }
            if (viewports['frozen-columns']) {
                renderAreaCells(
                    ctx,
                    'frozen-columns',
                    viewports['frozen-columns'],
                    newComponentsInfo,
                    clipBoundaries['frozen-columns'],
                );
            }
            renderAreaCells(ctx, 'scrollable', viewports.scrollable, newComponentsInfo, clipBoundaries.scrollable);

            // Рендерим inline editor поверх (если редактируется)
            renderInlineEditor(ctx, timestamp /* , inputState */);

            // Обновляем componentsInfo
            const hasChanges =
                componentsInfoRef.current.length !== newComponentsInfo.length ||
                newComponentsInfo.some((info, idx) => {
                    const prev = componentsInfoRef.current[idx];
                    return (
                        !prev ||
                        Math.abs(prev.x - info.x) > 0.1 ||
                        Math.abs(prev.y - info.y) > 0.1 ||
                        prev.rowIndex !== info.rowIndex ||
                        prev.columnIndex !== info.columnIndex ||
                        prev.onClick !== info.onClick
                    );
                });

            if (hasChanges) {
                componentsInfoRef.current = newComponentsInfo;
                setComponentsInfo(newComponentsInfo);
            }
        },
        [viewportCache, clipBoundaries, renderAreaCells, renderInlineEditor, setComponentsInfo],
    );

    return renderContent;
};
