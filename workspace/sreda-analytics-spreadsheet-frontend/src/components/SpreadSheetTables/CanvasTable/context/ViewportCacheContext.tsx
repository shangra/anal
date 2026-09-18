import React, { createContext, ReactNode, useMemo, useRef } from 'react';

import { calculateFrozenAreas, calculateVisibleIndices, CellArea } from '../utils/coordinates';
import { JoinedCellsIndex } from '../utils/joinedCellsIndex'; // NEW
import { CanvasSpreadSheetContext } from '.';

interface AreaViewport {
    minRowIndex: number;
    maxRowIndex: number;
    minColumnIndex: number;
    maxColumnIndex: number;
}

interface ViewportCache {
    frozenAreas: { width: number; height: number };
    viewports: {
        scrollable: AreaViewport;
    } & {
        [K in Exclude<CellArea, 'scrollable'>]: AreaViewport | null;
    };
    visibleJoinedCells: any[];
    joinedCellsIndex: JoinedCellsIndex; // NEW: Индекс для быстрого поиска
}

export const ViewportCacheContext = createContext<ViewportCache | null>(null);

export const ViewportCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const ctx = React.useContext(CanvasSpreadSheetContext);
    const {
        camera,
        frozenRows,
        frozenColumns,
        rowsMetadata,
        columnsMetadata,
        hasRowsHeader,
        hasColumnsHeader,
        joinedCells,
        width,
        height,
    } = ctx;

    const prevCacheRef = useRef<ViewportCache | null>(null);
    const prevViewportKeyRef = useRef<string>('');
    const prevJoinedCellsRef = useRef<any[]>([]);

    const cache = useMemo(() => {
        if (!rowsMetadata.length || !columnsMetadata.length) {
            const empty = {
                frozenAreas: { width: 0, height: 0 },
                viewports: {
                    'frozen-both': null,
                    'frozen-rows': null,
                    'frozen-columns': null,
                    scrollable: { minRowIndex: 0, maxRowIndex: 0, minColumnIndex: 0, maxColumnIndex: 0 },
                },
                visibleJoinedCells: [],
                joinedCellsIndex: new JoinedCellsIndex([]),
            };
            prevCacheRef.current = empty;
            prevJoinedCellsRef.current = [];
            return empty;
        }

        const frozenAreas = calculateFrozenAreas(frozenRows, frozenColumns, rowsMetadata, columnsMetadata);
        const coordCtx = { camera, hasRowsHeader, hasColumnsHeader, frozenRows, frozenColumns };

        const areas: CellArea[] = ['frozen-both', 'frozen-rows', 'frozen-columns', 'scrollable'];
        const viewports: any = {};

        for (const area of areas) {
            if (area === 'frozen-both' && (frozenRows === 0 || frozenColumns === 0)) {
                viewports[area] = null;
                continue;
            }
            if (area === 'frozen-rows' && frozenRows === 0) {
                viewports[area] = null;
                continue;
            }
            if (area === 'frozen-columns' && frozenColumns === 0) {
                viewports[area] = null;
                continue;
            }
            viewports[area] = calculateVisibleIndices(
                area,
                coordCtx,
                columnsMetadata,
                rowsMetadata,
                frozenAreas.width,
                frozenAreas.height,
                width,
                height,
            );
        }

        // FIX(7.4): Проверяем, изменились ли видимые индексы
        const viewportKey = JSON.stringify(viewports);
        const joinedCellsChanged = joinedCells !== prevJoinedCellsRef.current;
        if (viewportKey === prevViewportKeyRef.current && prevCacheRef.current && !joinedCellsChanged) {
            // Viewport не изменился — возвращаем предыдущий кэш (тот же объект = нет re-render)
            return prevCacheRef.current;
        }
        prevViewportKeyRef.current = viewportKey;
        prevJoinedCellsRef.current = joinedCells;

        const visibleJoinedCells = joinedCells.filter((jc) => {
            const { topLeft, bottomRight } = jc;
            for (const area of areas) {
                const vp = viewports[area];
                if (!vp) continue;
                if (
                    topLeft.coordinates.rowIndex <= vp.maxRowIndex &&
                    bottomRight.coordinates.rowIndex >= vp.minRowIndex &&
                    topLeft.coordinates.columnIndex <= vp.maxColumnIndex &&
                    bottomRight.coordinates.columnIndex >= vp.minColumnIndex
                )
                    return true;
            }
            return false;
        });

        const result = {
            frozenAreas,
            viewports,
            visibleJoinedCells,
            joinedCellsIndex: new JoinedCellsIndex(visibleJoinedCells),
        };

        prevCacheRef.current = result;
        return result;
    }, [
        camera,
        frozenRows,
        frozenColumns,
        rowsMetadata,
        columnsMetadata,
        hasRowsHeader,
        hasColumnsHeader,
        joinedCells,
        width,
        height,
    ]);

    return <ViewportCacheContext.Provider value={cache}>{children}</ViewportCacheContext.Provider>;
};
