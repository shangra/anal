import { PluginPivotDataSettingsParams } from '../types';

export interface SortInfo {
    isSorted: boolean;
    order: 'ASC' | 'DESC' | null;
}

/**
 * Получить информацию о сортировке для заданных значений поиска
 * @param searchValues - массив возможных значений для поиска (имена полей)
 * @param orderType - тип сортировки ('rows', 'columns', 'values')
 * @param orders - объект с информацией о сортировке из параметров
 * @returns объект с информацией о сортировке
 */
export function getSortInfo(
    searchValues: string[],
    orderType: keyof NonNullable<PluginPivotDataSettingsParams['order']>,
    orders: PluginPivotDataSettingsParams['order'] | undefined,
): SortInfo {
    if (!orders || !orders[orderType]) {
        return { isSorted: false, order: null };
    }

    const orderEntries = orders[orderType];

    // Ищем первое совпадение из searchValues в orderEntries
    for (const fieldName of searchValues) {
        if (!fieldName) continue;

        const entry = orderEntries.find(([field]) => field === fieldName);
        if (entry) {
            return { isSorted: true, order: entry[1] };
        }
    }

    return { isSorted: false, order: null };
}
