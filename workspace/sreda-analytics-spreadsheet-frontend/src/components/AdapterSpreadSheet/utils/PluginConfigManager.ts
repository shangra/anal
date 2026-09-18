import { Range } from '../models';
import { CellRange, ICellPluginsConfig, StyledRange } from '../types';
import { RangeBasedManager } from './RangeBasedManager';
import { IMergeStrategy } from './RangeBasedManager/types';

const PluginConfigMergeStrategy: IMergeStrategy<ICellPluginsConfig> = {
    merge(base, override) {
        const result = { ...base };
        for (const key of Object.keys(override) as (keyof ICellPluginsConfig)[]) {
            result[key] = {
                ...(base[key] as object | undefined),
                ...(override[key] as object),
            } as ICellPluginsConfig[typeof key];
        }
        return result;
    },
    empty: () => ({}),
    equal: (a, b) => {
        // Быстрая проверка ссылок
        if (a === b) return true;

        const keysA = Object.keys(a) as (keyof ICellPluginsConfig)[];
        const keysB = Object.keys(b) as (keyof ICellPluginsConfig)[];
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!(key in b)) return false;
            // Для каждого плагина — shallow сравнение конфига
            const ca = a[key] as Record<string, unknown>;
            const cb = b[key] as Record<string, unknown>;
            if (ca === cb) continue;
            if (!ca || !cb) return false;
            const pKeysA = Object.keys(ca);
            const pKeysB = Object.keys(cb);
            if (pKeysA.length !== pKeysB.length) return false;
            if (pKeysA.some((k) => ca[k] !== cb[k])) return false;
        }
        return true;
    },
    /**
     * outer замещает inner только если outer содержит все ключи плагинов, которые есть
     * в inner, и их конфиги shallow-равны. Если у inner есть ключ (например, format),
     * которого нет в outer, — outer не замещает inner, и оба диапазона нужно хранить.
     */
    subsumes: (outer, inner) => {
        const keysInner = Object.keys(inner) as (keyof ICellPluginsConfig)[];
        for (const key of keysInner) {
            if (!(key in outer)) return false;
            const co = outer[key] as Record<string, unknown>;
            const ci = inner[key] as Record<string, unknown>;
            if (co === ci) continue;
            if (!co || !ci) return false;
            const pKeysInner = Object.keys(ci);
            const pKeysOuter = Object.keys(co);
            if (pKeysInner.length !== pKeysOuter.length) return false;
            if (pKeysInner.some((k) => co[k] !== ci[k])) return false;
        }
        return true;
    },
};

export default class PluginConfigManager extends RangeBasedManager<ICellPluginsConfig> {
    constructor(maxRows?: number, maxCols?: number) {
        super(PluginConfigMergeStrategy, maxRows, maxCols);
    }

    /** Установить конфиг одного плагина для диапазона, не трогая остальные */
    setPluginRange<K extends keyof ICellPluginsConfig>(
        range: Range,
        key: K,
        config: ICellPluginsConfig[K],
        merge = true,
    ): string {
        return this.setRange(range, { [key]: config } as ICellPluginsConfig, merge);
    }

    setPluginCell<K extends keyof ICellPluginsConfig>(
        row: number,
        col: number,
        key: K,
        config: ICellPluginsConfig[K],
        merge = false,
    ): void {
        return this.setCell(row, col, { [key]: config } as ICellPluginsConfig, merge);
    }

    /**
     * Batch-установка конфига одного плагина для массива ячеек.
     * Использует setCellsBatch с RLE-сжатием — O(N log N) вместо N × O(N) splice.
     * merge=false: каждая запись полностью заменяет предыдущий конфиг плагина в ячейке.
     */
    setPluginCellsBatch<K extends keyof ICellPluginsConfig>(
        key: K,
        cells: Array<{ row: number; col: number; data: ICellPluginsConfig[K] }>,
    ): void {
        const mapped = cells.map(({ row, col, data }) => ({
            row,
            col,
            data: { [key]: data } as ICellPluginsConfig,
        }));
        this.setCellsBatch(mapped);
    }

    /** Получить конфиг конкретного плагина для ячейки */
    getPluginConfig<K extends keyof ICellPluginsConfig>(row: number, col: number, key: K): ICellPluginsConfig[K] | undefined {
        return this.getCell(row, col)[key];
    }

    /**
     * Очистить конфиг одного плагина в диапазоне
     */
    clearPluginInRange<K extends keyof ICellPluginsConfig>(range: Range, key: K): string[] {
        this.validateRange(range);
        const { rowIndex: cutStartRow, columnIndex: cutStartCol } = range.topLeft.coordinates;
        const { rowIndex: cutEndRow, columnIndex: cutEndCol } = range.bottomRight.coordinates;

        const affected = this.spatialIndex.queryRange(
            cutStartRow,
            cutEndRow,
            cutStartCol,
            cutEndCol,
        ) as StyledRange<ICellPluginsConfig>[];

        const toRemove = new Set<string>();
        for (const sr of affected) {
            toRemove.add(sr.id);
        }

        this.ranges = this.ranges.filter((r) => !toRemove.has(r.id));

        const newRanges: StyledRange<ICellPluginsConfig>[] = [];

        for (const sr of affected) {
            const fragments = this.subtractRange(sr, cutStartRow, cutEndRow, cutStartCol, cutEndCol);

            for (const frag of fragments) {
                const data = { ...sr.data };
                delete (data as any)[key];
                if (Object.keys(data).length === 0) continue;

                newRanges.push({
                    startRow: frag.startRow,
                    endRow: frag.endRow,
                    startCol: frag.startCol,
                    endCol: frag.endCol,
                    data,
                    id: `range_${++this.idCounter}`,
                    timestamp: sr.timestamp,
                });
            }
        }

        for (const nr of newRanges) {
            this.ranges.push(nr);
        }
        this.spatialIndex.rebuild(this.ranges);

        const affectedKeys: string[] = [];

        // ── Ключи из диапазонных записей (ranges) ────────────────────────────
        for (const sr of affected) {
            // Только если в этом диапазоне действительно был наш key
            if ((sr.data as any)[key] === undefined) continue;

            const r1 = Math.max(sr.startRow, cutStartRow);
            const r2 = Math.min(sr.endRow, cutEndRow);
            const c1 = Math.max(sr.startCol, cutStartCol);
            const c2 = Math.min(sr.endCol, cutEndCol);

            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    affectedKeys.push(`${r}:${c}`);
                }
            }
        }

        return affectedKeys;
    }
}
