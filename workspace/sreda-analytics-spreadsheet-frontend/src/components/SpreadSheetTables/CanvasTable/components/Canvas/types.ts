import { ForwardedRef } from 'react';

import { ColumnIndex, ObjectIndexes, RowIndex } from '../../../../AdapterSpreadSheet/types';
import { ICanvasTableAPI, ISpreadsheetMouseEvent, IVisibleRanges } from '../../types';

export interface ICanvasProps {
    ref?: ForwardedRef<ICanvasTableAPI>;

    onViewportChange?: (ranges: IVisibleRanges) => void;

    onKeyDown?: (event: any) => void;
    onKeyUp?: (event: any) => void;

    onClick?: (event: { metaKey: boolean; altKey: boolean; ctrlKey: boolean; shiftKey: boolean; cell: ObjectIndexes }) => void;
    onMouseDown?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onMouseUp?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onDblClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onCellEnter?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onCellLeave?: (event: {}) => void;
    onContextMenu?: (event: { cell: ObjectIndexes; clientX: number; clientY: number }) => void;

    onRootMouseDown?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onRootMouseUp?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onRootClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;

    onRowsHeaderCellMouseDown?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onRowsHeaderCellMouseUp?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onRowsHeaderCellClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;

    onColumnsHeaderCellMouseDown?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onColumnsHeaderCellMouseUp?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onColumnsHeaderCellClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;

    onColumnsHeaderCellEnter?: (event: { metaKey: boolean }, columnIndex: ColumnIndex) => void;
    onColumnsHeaderCellLeave?: (event: { metaKey: boolean }, columnIndex: ColumnIndex) => void;

    onRowsHeaderCellEnter?: (event: { metaKey: boolean }, rowIndex: RowIndex) => void;
    onRowsHeaderCellLeave?: (event: { metaKey: boolean }, rowIndex: RowIndex) => void;

    onRowsResize?: (rows: Map<number, number>) => void;
    onColumnsResize?: (columns: Map<number, number>) => void;

    onFillHandleMouseDown?: (event: { cell: ObjectIndexes }) => void;
    onFillHandleMouseMove?: (event: { cell: ObjectIndexes }) => void;
    onFillHandleMouseUp?: (event: { cell: ObjectIndexes }) => void;

    onColumnsHeaderCellDblClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onRowsHeaderCellDblClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onRootDblClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
}
