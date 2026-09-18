/**
 * Абстрактный API измерения текста.
 * Не привязан к Canvas — может быть реализован через OffscreenCanvas,
 * SVG, текстовые метрики или любой другой механизм.
 */

import { ITextMeasureOptions, ITextMeasureResult } from '../../SpreadSheetTables/CanvasTable/measurement/types';

export interface IMeasurementAPI {
    /**
     * Синхронное измерение текста.
     * Реализация кэширует результаты по хеш-ключу опций.
     */
    measureText(options: ITextMeasureOptions): ITextMeasureResult;

    /**
     * Batch-измерение нескольких текстов за один вызов.
     * Использует тот же кэш, что и measureText.
     */
    measureBatch(items: ITextMeasureOptions[]): ITextMeasureResult[];

    /**
     * Сброс кэша (вызывается при смене темы / шрифтов).
     */
    clearCache(): void;
}
