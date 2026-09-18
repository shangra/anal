export interface ITextMeasureOptions {
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: 'normal' | 'italic';
    /** Если задан — текст переносится и высота считается по строкам. */
    maxWidth?: number;
    /** Множитель межстрочного интервала. По умолчанию 1.3. */
    lineHeightFactor?: number;
    // ── Компоненты ───────────────────────────────────────
    componentsCount?: number;
    componentSize?: number; // COMPONENT_SIZE
    componentGap?: number; // COMPONENTS_GAP
}

export interface ITextMeasureResult {
    /** Максимальная ширина строки (ceil). */
    width: number;
    /** Суммарная высота всех строк (ceil). */
    height: number;
    /** Строки после переноса */
    lines: string[];
    // ── Компоненты ───────────────────────────────────────
    /** Суммарная ширина: текст + компоненты + отступы */
    totalWidth: number;
    /** Ширина компонентов */
    componentsWidth: number;
}
