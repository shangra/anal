import { Cell, Range } from '../../../AdapterSpreadSheet/models';
import { TPluginRange } from '../types';

/**
 * Проверяет, пересекается ли диапазон объединения ячеек с областью данных таблицы (среза).
 *
 * Алгоритм:
 * 1. Преобразует TPluginRange (x, y, width, height) в Range (topLeft, bottomRight)
 * 2. Вызывает Range.intersects() — O(1) сравнение 4 пар координат
 *
 * @param mergeRange - диапазон, который пользователь хочет объединить
 * @param pluginRange - область таблицы на листе
 * @returns true если есть пересечение (нужно наложить veto)
 */
export function isMergeVetoed(mergeRange: Range, pluginRange: TPluginRange): boolean {
    const tableTopLeft = new Cell({
        rowIndex: pluginRange.y,
        columnIndex: pluginRange.x,
    });
    const tableBottomRight = new Cell({
        rowIndex: pluginRange.y + pluginRange.height - 1,
        columnIndex: pluginRange.x + pluginRange.width - 1,
    });
    const tableRange = new Range(tableTopLeft, tableBottomRight);

    return tableRange.intersects(mergeRange);
}
