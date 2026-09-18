import { CellFormattingType } from '../PluginCellFormatting/types';
import { DrpPayload } from './types';

// ─── Миграции устаревших форматов ─────────────────────────────────────────────
//
// Применяются только к файлам, для которых стратегия декодирования
// выставила isLegacy (см. strategies/IDecodeStrategy.ts).
// Заменяет финансовый формат ячеек на числовой/

function visit(node: unknown): boolean {
    if (Array.isArray(node)) {
        let found = false;
        for (const item of node) {
            if (visit(item)) found = true;
        }
        return found;
    }

    if (node === null || typeof node !== 'object') return false;

    const obj = node as Record<string, unknown>;
    let found = false;

    if (obj.format === CellFormattingType.finance) {
        obj.format = CellFormattingType.number;
        found = true;
    }

    for (const key of Object.keys(obj)) {
        if (visit(obj[key])) found = true;
    }

    return found;
}

/**
 * Включает масштабирование у всех мер (useMeasure).
 *
 * Флаг проставляется в двух местах, потому что читается из разных:
 *   - args.values — pivot-меню;
 *   - args.fields — построение ячеек (CreatePivotTable через getParamField).
 *
 * Схема в старых файлах лежит либо в args, либо в schemaSettings
 * (см. обратную совместимость в PluginPivot.import).
 */
function enableMeasureScale(payload: DrpPayload): void {
    const pivot = payload.pluginStates?.PluginPivot as Record<string, any> | undefined;
    const schema = pivot?.args ?? pivot?.schemaSettings;
    const values = schema?.values;

    if (!Array.isArray(values)) return;

    for (const measure of values) {
        if (measure && typeof measure === 'object') measure.useMeasure = true;
    }

    const fields = schema?.fields;
    if (!Array.isArray(fields)) return;

    // getParamField сопоставляет поле с мерой по id или name
    const measureKeys = new Set(values.flatMap((measure) => [measure?.id, measure?.name]).filter(Boolean));

    for (const field of fields) {
        if (field && typeof field === 'object' && (measureKeys.has(field.id) || measureKeys.has(field.name))) {
            field.useMeasure = true;
        }
    }
}

/**
 * Миграция файлов со старым финансовым форматом:
 *   1. финансовый формат -> числовой;
 *   2. если финансовый формат встречался — включает масштаб у мер пивота,
 *      иначе measureUnit из файла не применится и числа останутся в рублях.
 *
 * ВАЖНО: мутирует переданный объект.
 */
export function migrateFinanceToNumber(payload: DrpPayload): void {
    const hasFinanceFormat = visit(payload);

    if (hasFinanceFormat) {
        enableMeasureScale(payload);
    }
}
