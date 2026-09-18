import { CellFormattingType } from '../../PluginCellFormatting/types';
import { IPluginPivotCellConfig } from '../types';

/**
 * Приватное O(1)-хранилище pivot-owned данных ячеек.
 *
 * Не пишет в PluginConfigManager — хранит defaults прямо здесь.
 * Читается через Plugin.provideCellPluginConfig() → context.getCellPluginConfig() fallback.
 *
 * Инвариант: user overrides (PluginConfigManager) всегда бьют provider.
 * Пользователь применил «%» на пивот-ячейку — PluginConfigManager запишет override,
 * getCellPluginConfig() вернёт его раньше, чем дойдёт до provideCellPluginConfig().
 */
export class PluginPivotConfigStore {
    /**
     * Per-cell данные: row → col → { format, pivot }.
     * Плотное хранилище: Map<Map> — O(1) read/write, аналог dataMatrix.
     */
    private byRow = new Map<number, Map<number, PivotCellEntry>>();

    /**
     * Границы области данных пивота (абсолютные координаты).
     * null = область не установлена (нет данных / после clearArea).
     */
    private area: PivotArea | null = null;

    // ── Запись ──────────────────────────────────────────────────────────────

    /**
     * Установить границы области данных (вызывается перед заполнением из RenderController).
     */
    setArea(area: PivotArea): void {
        this.area = area;
    }

    /**
     * Записать defaults одной ячейки (абсолютные координаты).
     */
    setCellEntry(row: number, col: number, entry: PivotCellEntry): void {
        let rowMap = this.byRow.get(row);
        if (!rowMap) {
            rowMap = new Map();
            this.byRow.set(row, rowMap);
        }
        rowMap.set(col, entry);
    }

    /**
     * Очистить весь store (вызывается перед каждым renderTable,
     * аналог clearPivotPluginConfig).
     */
    clearAll(): void {
        this.byRow.clear();
        this.area = null;
    }

    // ── Чтение ──────────────────────────────────────────────────────────────

    /**
     * Проверить, попадает ли ячейка в пивот-область.
     * O(1), без итерации.
     */
    isInArea(row: number, col: number): boolean {
        if (!this.area) return false;
        const { r0, r1, c0, c1 } = this.area;
        return row >= r0 && row <= r1 && col >= c0 && col <= c1;
    }

    /**
     * Получить format для ячейки.
     * undefined = ячейка не в store (не в пивот-области или нет данных).
     */
    getFormat(row: number, col: number): CellFormattingType | undefined {
        return this.byRow.get(row)?.get(col)?.format;
    }

    /**
     * Получить pivot meta для ячейки.
     * undefined = ячейка не в store.
     */
    getPivotMeta(row: number, col: number): IPluginPivotCellConfig | undefined {
        return this.byRow.get(row)?.get(col)?.pivot;
    }

    /**
     * Полная запись для ячейки (для отладки / тестов).
     */
    getEntry(row: number, col: number): PivotCellEntry | undefined {
        return this.byRow.get(row)?.get(col);
    }

    /**
     * Текущая область (для тестов).
     */
    getArea(): PivotArea | null {
        return this.area;
    }

    /**
     * Количество записанных ячеек (для тестов / диагностики).
     */
    getCellCount(): number {
        let count = 0;
        for (const rowMap of this.byRow.values()) {
            count += rowMap.size;
        }
        return count;
    }
}

// ── Типы ────────────────────────────────────────────────────────────────────

export interface PivotCellEntry {
    /** Числовой формат ячейки (из меры / defaultMeasureFormat). */
    format?: CellFormattingType;
    /** Пивот-метаданные ячейки (index/columns/data/scalable). */
    pivot?: IPluginPivotCellConfig;
}

export interface PivotArea {
    /** Первая строка области данных (включительно, абсолютный индекс). */
    r0: number;
    /** Последняя строка области данных (включительно, абсолютный индекс). */
    r1: number;
    /** Первая колонка (включительно, абсолютный индекс). */
    c0: number;
    /** Последняя колонка (включительно, абсолютный индекс). */
    c1: number;
}
