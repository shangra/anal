// ─── Hook-ключи (константы, не функции) ──────────────────────────────────────

// ─── Парсинг диапазона в данные графика ──────────────────────────────────────

import { CellDataType } from '../../AdapterSpreadSheet/types';
import { LineComputedDataProps } from '../../ChartGenerationCMP/src/types';

export const CHART_GET_DATA_KEY = '$chart__getData';
export const CHART_GET_META_KEY = '$chart__getMeta';

export const getChartSetDataKey = (uuid: string) => `$chart-${uuid}__setData`;
export const getChartSetMetaKey = (uuid: string) => `$chart-${uuid}__setMeta`;

// ─── Конвертеры значений ─────────────────────────────────────────────────────

export const convertNumber = (content: string): number | null => {
    if (content === '') return 0;
    const n = Number(content.replace(',', '.').replace(/\s+/gi, '').replace('&nbsp;', ''));
    return Number.isNaN(n) ? null : n;
};

export const convertDate = (content: string): string | null =>
    new Date(content).toString() !== 'Invalid Date' ? content : null;

/**
 * Преобразует двумерный массив ячеек в структуру данных для графика.
 *
 * Поддерживаемые раскладки:
 *   A) Все строки — числа (нет заголовков):
 *      каждая строка = отдельная серия данных.
 *
 *   B) Смешанные данные (есть заголовки):
 *      строка 0, col > 0  -> категории (ось X)
 *      строка N > 0, col 0 -> имя серии
 *      строка N > 0, col > 0 -> значения серии
 *
 * Функция чистая (pure) — не читает внешнее состояние.
 */
export function parseRangesForChart(dataRange: (CellDataType | null)[][]): LineComputedDataProps {
    const empty: LineComputedDataProps = { titleData: [], categoryData: [], itemsData: [] };

    if (!dataRange.length) return empty;

    const firstRow = dataRange[0];
    if (!firstRow.length) return empty;

    // ── Раскладка A: все значения — числа ────────────────────────────────────
    const firstRowAllNumbers = firstRow.every((v) => v !== null && v !== undefined && v !== '' && typeof v === 'number');

    if (firstRowAllNumbers) {
        return {
            titleData: [],
            categoryData: [],
            itemsData: dataRange.map((row) => row.filter((v): v is CellDataType => v !== null && v !== undefined && v !== '')),
        };
    }

    // ── Раскладка B: смешанные данные ─────────────────────────────────────────
    const categoryData: CellDataType[] = [];
    const titleData: CellDataType[] = [];
    const itemsData: CellDataType[][] = [];

    // Строка 0 — категории (пропускаем угловую ячейку col 0)
    for (let col = 1; col < firstRow.length; col++) {
        const v = firstRow[col];
        if (v !== null && v !== undefined && v !== '') categoryData.push(v);
    }

    // Строки 1..N — серии данных
    for (let row = 1; row < dataRange.length; row++) {
        const dataRow = dataRange[row];
        if (!dataRow.length) continue;

        // Col 0 = имя серии
        const name = dataRow[0];
        if (name !== null && name !== undefined && name !== '') titleData.push(name);

        // Col 1+ = значения
        const values: CellDataType[] = [];
        for (let col = 1; col < dataRow.length; col++) {
            const v = dataRow[col];
            if (v !== null && v !== undefined && v !== '') values.push(v);
        }

        // Добавляем серию даже если пустая (сохраняем структуру)
        itemsData.push(values);
    }

    return { titleData, categoryData, itemsData };
}
