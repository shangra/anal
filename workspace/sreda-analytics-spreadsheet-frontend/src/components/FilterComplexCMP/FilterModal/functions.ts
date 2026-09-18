import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import {
    FILTER_TYPES_DATE,
    FILTER_TYPES_NUMBER,
    NUMBER_FILTER_OPERATORS,
    PASTE_PLACEHOLDER_DATE,
    PASTE_PLACEHOLDER_NUMBER,
    PASTE_PLACEHOLDER_STRING,
    STRING_FILTER_OPERATORS,
} from './constants';
import { TFilterType } from './types';

dayjs.extend(customParseFormat);

export function includes<T>(arr: readonly T[], value: unknown): value is T {
    return arr.includes(value as T);
}

export function getValidOperatorsForType(type: TFilterType): readonly string[] {
    if (includes(FILTER_TYPES_DATE, type) || includes(FILTER_TYPES_NUMBER, type)) {
        return NUMBER_FILTER_OPERATORS;
    }
    return STRING_FILTER_OPERATORS;
}

const SWAP_MAP: Record<string, string> = {
    $startsWith: '$endsWith',
    $endsWith: '$startsWith',
};

/**
 * Разделитель ; первый фильтр по умолчанию с or; без указания тоже or
 *   $eq:[1,2,3]  (defaults to or)
 *   and:$ne:[4,5]
 *   or:$iLike:[test]
 */
export function parseFilterString(
    str: string,
    validOps: readonly string[],
): {
    items: Array<{ operator: string; values: string[]; comparison: 'or' | 'and' }>;
    unparsed: string[];
} {
    const items: Array<{ operator: string; values: string[]; comparison: 'or' | 'and' }> = [];
    const unparsed: string[] = [];
    if (!str || !str.trim()) return { items, unparsed };

    const segments = str
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

    for (const segment of segments) {
        const comparison: 'or' | 'and' = segment.startsWith('and:') ? 'and' : 'or';
        const content = segment.replace(/^(and|or):/, '').trim();
        const match = content.match(/^(\$.+?)\s*:\s*\[([^\]]*)\]$/);

        if (match) {
            const operator = match[1];

            if (!validOps.includes(operator)) {
                unparsed.push(segment);
                continue;
            }
            const valuesStr = match[2];
            const values = valuesStr
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
            if (values.length > 0) {
                const swappedOperator = SWAP_MAP[operator] ?? operator;
                items.push({ operator: swappedOperator, values, comparison });
            } else {
                unparsed.push(segment);
            }
        } else {
            unparsed.push(segment);
        }
    }

    return { items, unparsed };
}

/*
 * Конвертация в  ISO формат (YYYY-MM-DD) если не валидно - null
 */
export function parseDateString(dateStr: string): string | null {
    if (!dateStr) return null;

    const trimmed = dateStr.trim();

    const formats = [
        'DD.MM.YYYY',
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'YYYY-MM-DD',
        'YYYY/MM/DD',
        'YYYY.MM.DD',
        'MM/DD/YYYY',
        'MM-DD-YYYY',
        'MM.DD.YYYY',
        'DD.MM.YY',
        'DD/MM/YY',
        'DD-MM-YY',
    ];

    for (const format of formats) {
        const parsed = dayjs(trimmed, format, true);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }
    }

    return null;
}

export function getPastePlaceholder(type: TFilterType): string {
    if (includes(FILTER_TYPES_DATE, type)) {
        return PASTE_PLACEHOLDER_DATE;
    }
    if (includes(FILTER_TYPES_NUMBER, type)) {
        return PASTE_PLACEHOLDER_NUMBER;
    }
    return PASTE_PLACEHOLDER_STRING;
}
