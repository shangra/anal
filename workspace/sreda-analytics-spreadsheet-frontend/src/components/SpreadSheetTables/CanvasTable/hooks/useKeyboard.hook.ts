import { useContext, useRef } from 'react';

import { ICursor } from '../../../SpreadSheetPlugins/PluginCursorCell/types';
import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { viewportXOverflowSize, viewportYOverflowSize } from '../utils';

export const useKeyboard = () => {
    const prevCursorRef = useRef<ICursor | null>(null);

    const { cursor, viewport, rowsMetadata, columnsMetadata, setCamera } = useContext(CanvasSpreadSheetContext);

    const handleCanvasKeyDown = () => {
        if (!cursor) return;

        if (prevCursorRef.current && cursor && prevCursorRef.current.cell.isEqual(cursor.cell)) {
            return;
        }

        // if (cursor.source === 'mouse') return;

        prevCursorRef.current = cursor;

        const columnMetadata = columnsMetadata.at(cursor.cell.coordinates.columnIndex);
        const rowMetadata = rowsMetadata.at(cursor.cell.coordinates.rowIndex);

        const isCellXInRange = viewportXOverflowSize(viewport, {
            x: columnMetadata.x + ROWS_HEADER_WIDTH,
            width: columnMetadata.width,
        });
        const isCellYInRange = viewportYOverflowSize(viewport, {
            y: rowMetadata.y + COLUMNS_HEADER_HEIGHT,
            height: rowMetadata.height,
        });

        if (isCellXInRange || isCellYInRange) {
            setCamera((prevCamera) => {
                const newCamera = { ...prevCamera };

                // Left
                if (isCellXInRange === 'left') {
                    const newX = columnMetadata.x;
                    newCamera.x = -newX;
                }
                // Right
                else if (isCellXInRange === 'right') {
                    const newX = columnMetadata.x + columnMetadata.width + ROWS_HEADER_WIDTH - viewport.width;
                    newCamera.x = -newX;
                }
                // Top
                if (isCellYInRange === 'top') {
                    const newY = rowMetadata.y;
                    newCamera.y = -newY;
                }
                // Bottom
                else if (isCellYInRange === 'bottom') {
                    const newY = rowMetadata.y + rowMetadata.height + COLUMNS_HEADER_HEIGHT - viewport.height;
                    newCamera.y = -newY;
                }

                return newCamera;
            });
        }
    };

    return { handleCanvasKeyDown };
};
