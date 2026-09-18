import { useCallback, useContext, useMemo } from 'react';

import { ObjectIndexes } from '../../../AdapterSpreadSheet/types';
import { COLUMNS_HEADER_HEIGHT, MAX_ZOOM, MIN_ZOOM, ROWS_HEADER_WIDTH } from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { IPoint } from '../types';
import { calculateCameraBounds, calculateFrozenAreas } from '../utils/coordinates';

export const useCamera = () => {
    const {
        hasColumnsHeader,
        hasRowsHeader,
        rowsMetadata,
        columnsMetadata,
        camera,
        width,
        height,
        setCamera,
        frozenRows,
        frozenColumns,
    } = useContext(CanvasSpreadSheetContext);

    // Размеры frozen областей
    const frozenAreas = useMemo(
        () => calculateFrozenAreas(frozenRows, frozenColumns, rowsMetadata, columnsMetadata),
        [frozenRows, frozenColumns, rowsMetadata, columnsMetadata],
    );

    // Максимальные границы камеры
    const cameraBounds = useMemo(
        () =>
            calculateCameraBounds(
                camera,
                columnsMetadata,
                rowsMetadata,
                frozenAreas.width,
                frozenAreas.height,
                width,
                height,
                hasRowsHeader,
                hasColumnsHeader,
            ),
        [camera, columnsMetadata, rowsMetadata, frozenAreas, width, height, hasRowsHeader, hasColumnsHeader],
    );

    const panCamera = useCallback(
        (dx: number, dy: number): void => {
            setCamera((prev) => {
                const newX = Math.max(-cameraBounds.maxX, Math.min(0, prev.x - dx / prev.z));
                const newY = Math.max(-cameraBounds.maxY, Math.min(0, prev.y - dy / prev.z));
                return { ...prev, x: newX, y: newY };
            });
        },
        [cameraBounds, setCamera],
    );

    const zoomCameraTo = useCallback(
        (screenPoint: IPoint, newZoom: number): void => {
            setCamera((prev) => {
                // Преобразуем screen point в world point для обоих зумов
                const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
                const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

                // World координаты точки под курсором (без camera offset)
                const worldPointOld = {
                    x: screenPoint.x / prev.z - headersWidth,
                    y: screenPoint.y / prev.z - headersHeight,
                };

                const worldPointNew = {
                    x: screenPoint.x / newZoom - headersWidth,
                    y: screenPoint.y / newZoom - headersHeight,
                };

                // Корректируем camera чтобы точка осталась на месте
                let newX = prev.x + (worldPointNew.x - worldPointOld.x);
                let newY = prev.y + (worldPointNew.y - worldPointOld.y);

                // Пересчитываем границы для нового зума
                const newBounds = calculateCameraBounds(
                    { ...prev, z: newZoom },
                    columnsMetadata,
                    rowsMetadata,
                    frozenAreas.width,
                    frozenAreas.height,
                    width,
                    height,
                    hasRowsHeader,
                    hasColumnsHeader,
                );

                // Применяем границы
                newX = Math.max(-newBounds.maxX, Math.min(0, newX));
                newY = Math.max(-newBounds.maxY, Math.min(0, newY));

                return { x: newX, y: newY, z: newZoom };
            });
        },
        [columnsMetadata, rowsMetadata, frozenAreas, width, height, hasRowsHeader, hasColumnsHeader, setCamera],
    );

    const zoomCamera = useCallback(
        (point: IPoint, dz: number): void => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.z - dz * camera.z));
            zoomCameraTo(point, newZoom);
        },
        [camera.z, zoomCameraTo],
    );

    const zoomCameraIn = useCallback(() => {
        const center = { x: width / 2, y: height / 2 };
        const newZoom = Math.min(MAX_ZOOM, camera.z * 1.2);
        zoomCameraTo(center, newZoom);
    }, [width, height, camera.z, zoomCameraTo]);

    const zoomCameraOut = useCallback(() => {
        const center = { x: width / 2, y: height / 2 };
        const newZoom = Math.max(MIN_ZOOM, camera.z / 1.2);
        zoomCameraTo(center, newZoom);
    }, [width, height, camera.z, zoomCameraTo]);

    const scrollToColumn = useCallback(
        (columnIndex: number) => {
            if (columnIndex < frozenColumns) return;
            const colMeta = columnsMetadata.at(columnIndex);
            if (!colMeta) return;

            setCamera((prev) => {
                const headersWidth = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) / prev.z;
                const scrollableViewportWidth = width / prev.z - headersWidth - frozenAreas.width;
                const targetX = colMeta.x - frozenAreas.width - scrollableViewportWidth / 2;
                const newX = Math.max(-cameraBounds.maxX, Math.min(0, -targetX));
                return { ...prev, x: newX };
            });
        },
        [frozenColumns, columnsMetadata, width, hasRowsHeader, frozenAreas, cameraBounds, setCamera],
    );

    const scrollToRow = useCallback(
        (rowIndex: number) => {
            if (rowIndex < frozenRows) return;
            const rowMeta = rowsMetadata.at(rowIndex);
            if (!rowMeta) return;

            setCamera((prev) => {
                const headersHeight = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) / prev.z;
                const scrollableViewportHeight = height / prev.z - headersHeight - frozenAreas.height;
                const targetY = rowMeta.y - frozenAreas.height - scrollableViewportHeight / 2;
                const newY = Math.max(-cameraBounds.maxY, Math.min(0, -targetY));
                return { ...prev, y: newY };
            });
        },
        [frozenRows, rowsMetadata, height, hasColumnsHeader, frozenAreas, cameraBounds, setCamera],
    );

    const scrollToCell = useCallback(
        ({ columnIndex, rowIndex }: ObjectIndexes) => {
            if (rowIndex >= frozenRows) scrollToRow(rowIndex);
            if (columnIndex >= frozenColumns) scrollToColumn(columnIndex);
        },
        [frozenRows, frozenColumns, scrollToRow, scrollToColumn],
    );

    return {
        maxCameraX: cameraBounds.maxX,
        maxCameraY: cameraBounds.maxY,
        zoomCameraIn,
        zoomCameraOut,
        panCamera,
        zoomCamera,
        scrollToColumn,
        scrollToRow,
        scrollToCell,
    };
};
