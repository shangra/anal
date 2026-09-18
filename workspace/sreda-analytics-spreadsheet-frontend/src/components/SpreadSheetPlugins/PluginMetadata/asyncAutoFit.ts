import { IMeasurementAPI } from '../../AdapterSpreadSheet/measurement/types';
import { ICellStyles } from '../../AdapterSpreadSheet/types';
import { DEFAULT_PADDING_X } from './constants';

export interface AutoFitTask {
    cancel: () => void;
}

export interface ColumnMeasureInputRow {
    rowIndex: number;
    text: string;
    styles: ICellStyles;
    componentsCount: number;
}

export interface ColumnMeasureInput {
    colIdx: number;
    rows: Array<ColumnMeasureInputRow>;
    paddingX: number;
    componentSize?: number;
    componentGap?: number;
}

export interface RowMeasureInputColumn {
    colIdx: number;
    text: string;
    styles: ICellStyles;
    colWidth: number;
    componentsCount: number;
}

export interface RowMeasureInput {
    rowIdx: number;
    columns: Array<RowMeasureInputColumn>;
    paddingY: number;
    componentSize?: number;
    componentGap?: number;
}

// ── Chunk-based async processing ──────────────────────────────────────────────

const CHUNK_SIZE = 50; // колонок / строк за одну итерацию IdleCallback
const IDLE_TIMEOUT_MS = 100; // максимальное ожидание idle

/**
 * Запускает измерение ширин колонок чанками через requestIdleCallback.
 * Возвращает Promise<Map<colIdx, width>> и объект для отмены.
 */
export function measureColumnsAsync(
    tasks: ColumnMeasureInput[],
    api: IMeasurementAPI,
    minWidth: number,
): { promise: Promise<Map<number, number>>; task: AutoFitTask } {
    let cancelled = false;
    let idleHandle: number | undefined;

    const promise = new Promise<Map<number, number>>((resolve) => {
        const results = new Map<number, number>();
        let cursor = 0;

        function measureRow(
            row: ColumnMeasureInputRow,
            paddingX: number,
            componentSize?: number,
            componentGap?: number,
        ): number {
            const r = api.measureText({
                text: row.text,
                fontSize: row.styles.fontSize,
                fontFamily: row.styles.fontFamily,
                fontWeight: row.styles.fontWeight as string,
                fontStyle: row.styles.fontStyle,
                // maxWidth не передаём — нужна натуральная ширина
                componentsCount: row.componentsCount,
                componentSize,
                componentGap,
            });
            // totalWidth уже включает компоненты + gap
            return r.totalWidth + paddingX * 2 + (row.styles.paddingLeft ?? 0) + (row.styles.paddingRight ?? 0);
        }

        function processChunk(deadline?: IdleDeadline): void {
            if (cancelled) {
                resolve(results);
                return;
            }

            const limit = Math.min(cursor + CHUNK_SIZE, tasks.length);
            while (cursor < limit) {
                if (deadline && deadline.timeRemaining() < 1) break;
                const { colIdx, rows, paddingX, componentSize, componentGap } = tasks[cursor];
                let maxW = minWidth;
                for (const row of rows) {
                    const total = measureRow(row, paddingX, componentSize, componentGap);
                    if (total > maxW) maxW = total;
                }
                results.set(colIdx, Math.ceil(maxW));
                cursor++;
            }

            if (cursor >= tasks.length) {
                resolve(results);
            } else {
                idleHandle = requestIdleCallback(processChunk, { timeout: IDLE_TIMEOUT_MS });
            }
        }

        function processChunkFallback(): void {
            if (cancelled) {
                resolve(results);
                return;
            }

            const limit = Math.min(cursor + CHUNK_SIZE, tasks.length);
            while (cursor < limit) {
                const { colIdx, rows, paddingX, componentSize, componentGap } = tasks[cursor];
                let maxW = minWidth;
                for (const row of rows) {
                    const total = measureRow(row, paddingX, componentSize, componentGap);
                    if (total > maxW) maxW = total;
                }
                results.set(colIdx, Math.ceil(maxW));
                cursor++;
            }
            if (cursor >= tasks.length) resolve(results);
            else setTimeout(processChunkFallback, 0);
        }

        if (typeof requestIdleCallback !== 'undefined') {
            idleHandle = requestIdleCallback(processChunk, { timeout: IDLE_TIMEOUT_MS });
        } else {
            setTimeout(processChunkFallback, 0);
        }
    });

    const task: AutoFitTask = {
        cancel(): void {
            cancelled = true;
            if (idleHandle !== undefined) cancelIdleCallback(idleHandle);
        },
    };

    return { promise, task };
}

export function measureRowsAsync(
    tasks: RowMeasureInput[],
    api: IMeasurementAPI,
    minHeight: number,
): { promise: Promise<Map<number, number>>; task: AutoFitTask } {
    let cancelled = false;
    let idleHandle: number | undefined;

    const promise = new Promise<Map<number, number>>((resolve) => {
        const results = new Map<number, number>();
        let cursor = 0;

        function measureColumn(
            col: RowMeasureInputColumn,
            paddingY: number,
            componentSize?: number,
            componentGap?: number,
        ): number {
            const maxWidth =
                col.colWidth - (col.styles.paddingLeft ?? 0) - (col.styles.paddingRight ?? 0) - DEFAULT_PADDING_X * 2;

            const result = api.measureText({
                text: col.text,
                fontSize: col.styles.fontSize,
                fontFamily: col.styles.fontFamily,
                fontWeight: col.styles.fontWeight as string,
                fontStyle: col.styles.fontStyle,
                maxWidth: maxWidth > 0 ? maxWidth : undefined,
                // ── компоненты сужают доступную ширину -> больше строк -> выше строка
                componentsCount: col.componentsCount,
                componentSize,
                componentGap,
            });

            return result.height + paddingY * 2 + (col.styles.paddingTop ?? 0) + (col.styles.paddingBottom ?? 0);
        }

        function processChunk(deadline?: IdleDeadline): void {
            if (cancelled) {
                resolve(results);
                return;
            }

            const limit = Math.min(cursor + CHUNK_SIZE, tasks.length);

            while (cursor < limit) {
                if (deadline && deadline.timeRemaining() < 1) break;

                const { rowIdx, columns, paddingY, componentSize, componentGap } = tasks[cursor];
                let maxHeight = minHeight;

                for (const col of columns) {
                    const h = measureColumn(col, paddingY, componentSize, componentGap);
                    if (h > maxHeight) maxHeight = h;
                }

                results.set(rowIdx, Math.ceil(maxHeight));
                cursor++;
            }

            if (cursor >= tasks.length) {
                resolve(results);
            } else {
                idleHandle = requestIdleCallback(processChunk, { timeout: IDLE_TIMEOUT_MS });
            }
        }

        function processChunkFallback(): void {
            if (cancelled) {
                resolve(results);
                return;
            }

            const limit = Math.min(cursor + CHUNK_SIZE, tasks.length);

            while (cursor < limit) {
                const { rowIdx, columns, paddingY, componentSize, componentGap } = tasks[cursor];
                let maxHeight = minHeight;
                for (const col of columns) {
                    const h = measureColumn(col, paddingY, componentSize, componentGap);
                    if (h > maxHeight) maxHeight = h;
                }
                results.set(rowIdx, Math.ceil(maxHeight));
                cursor++;
            }

            if (cursor >= tasks.length) resolve(results);
            else setTimeout(processChunkFallback, 0);
        }

        if (typeof requestIdleCallback !== 'undefined') {
            idleHandle = requestIdleCallback(processChunk, { timeout: IDLE_TIMEOUT_MS });
        } else {
            setTimeout(processChunkFallback, 0);
        }
    });

    const task: AutoFitTask = {
        cancel(): void {
            cancelled = true;
            if (idleHandle !== undefined) cancelIdleCallback(idleHandle);
        },
    };

    return { promise, task };
}
