// Утилиты и реэкспорты для обратной совместимости.
// Классы VirtualColumnsMetadata / VirtualRowsMetadata теперь в core:
//   src/components/AdapterSpreadSheet/utils/VirtualMetadata.ts
// Реэкспортируются здесь чтобы не ломать существующие импорты.

import { IMeasurementAPI } from '../../AdapterSpreadSheet/measurement/types';
import { IHeaderGroup } from '../../AdapterSpreadSheet/types';

// ─── Сдвиг Set / Map / Group индексов (используются в других плагинах) ───────

/**
 * Сдвигает индексы в Set при вставке элементов.
 */
export function shiftSetIndices(set: Set<number>, insertIdx: number, count: number): Set<number> {
    const shifted = new Set<number>();
    for (const idx of set) {
        if (idx >= insertIdx) {
            shifted.add(idx + count);
        } else {
            shifted.add(idx);
        }
    }
    return shifted;
}

/**
 * Сдвигает индексы в Map при вставке элементов.
 */
export function shiftMapIndices<T>(map: Map<number, T>, insertIdx: number, count: number): Map<number, T> {
    const shifted = new Map<number, T>();
    for (const [idx, value] of map) {
        if (idx >= insertIdx) {
            shifted.set(idx + count, value);
        } else {
            shifted.set(idx, value);
        }
    }
    return shifted;
}

/**
 * Сдвигает индексы в группах заголовков при вставке элементов.
 */
export function shiftGroupIndices(groups: IHeaderGroup[], insertIdx: number, count: number): IHeaderGroup[] {
    return groups.map((group) => ({
        ...group,
        start: group.start >= insertIdx ? group.start + count : group.start,
        end: group.end >= insertIdx ? group.end + count : group.end,
    }));
}

/**
 * Удаляет индексы из Set при удалении элементов.
 */
export function deleteSetIndices(set: Set<number>, deleteIdx: number, count: number): Set<number> {
    const result = new Set<number>();
    for (const idx of set) {
        if (idx >= deleteIdx && idx <= deleteIdx + count - 1) {
            continue;
        }
        if (idx > deleteIdx + count - 1) {
            result.add(idx - count);
        } else {
            result.add(idx);
        }
    }
    return result;
}

/**
 * Удаляет индексы из Map при удалении элементов.
 */
export function deleteMapIndices<T>(map: Map<number, T>, deleteIdx: number, count: number): Map<number, T> {
    const result = new Map<number, T>();
    for (const [idx, value] of map) {
        if (idx >= deleteIdx && idx <= deleteIdx + count - 1) {
            continue;
        }
        if (idx > deleteIdx + count - 1) {
            result.set(idx - count, value);
        } else {
            result.set(idx, value);
        }
    }
    return result;
}

/**
 * Удаляет группы заголовков при удалении элементов.
 */
export function deleteGroupIndices(groups: IHeaderGroup[], deleteIdx: number, count: number): IHeaderGroup[] {
    return groups
        .map((group) => {
            if (group.start >= deleteIdx && group.end <= deleteIdx + count - 1) {
                return null;
            }
            if (
                (group.start >= deleteIdx && group.start <= deleteIdx + count - 1) ||
                (group.end >= deleteIdx && group.end <= deleteIdx + count - 1) ||
                (group.start < deleteIdx && group.end > deleteIdx + count - 1)
            ) {
                return null;
            }
            let newStart = group.start;
            let newEnd = group.end;
            if (group.start > deleteIdx + count - 1) {
                newStart = group.start - count;
            }
            if (group.end > deleteIdx + count - 1) {
                newEnd = group.end - count;
            }
            return { ...group, start: newStart, end: newEnd };
        })
        .filter((group): group is IHeaderGroup => group !== null);
}

// ─── Утилиты AutoFit ─────────────────────────────────────────────────────────

/**
 * Проверяет доступность MeasurementAPI и логирует причину недоступности.
 */
export function assertMeasurementAPI(api: IMeasurementAPI | null, action: string): api is IMeasurementAPI {
    if (api) return true;
    console.warn(
        `[PluginMetadata] ${action}: IMeasurementAPI недоступен. ` +
            'Убедитесь, что Canvas смонтирован до вызова auto-fit. ' +
            'Используйте onMount для отложенной инициализации.',
    );
    return false;
}

/**
 * Нормализует список колонок/строк.
 * Убирает дубли, сортирует, отфильтровывает out-of-bounds.
 */
export function normalizeIndices(indices: number[], maxCount: number): number[] {
    return [...new Set(indices)].filter((i) => i >= 0 && i < maxCount).sort((a, b) => a - b);
}
