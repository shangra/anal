import { createHash } from 'crypto';

import { CellFormattingType } from '../PluginCellFormatting/types';
import { PluginPivotChunksChunkParentHeaders, PluginPivotChunksChunkParentHeadersForHash } from './classes/PluginPivotChunks';
import { NumericScale } from './types';

export const getHashHeader = (dbColumn: string, value: string, parentHeader?: string) => {
    const string = parentHeader ? `${parentHeader}->${dbColumn}::${value}` : `${dbColumn}::${value}`;

    return createHash('md5').update(string).digest('hex');
};

export const getHashChunk = (headerKeys: PluginPivotChunksChunkParentHeadersForHash) => {
    const data: PluginPivotChunksChunkParentHeadersForHash = {
        ...(headerKeys.columns && {
            columns: {
                type: headerKeys.columns.type,
                key: headerKeys.columns.key,
                chunkKey: headerKeys.columns.chunkKey,
            },
        }),
        ...(headerKeys.index && {
            index: {
                type: headerKeys.index.type,
                key: headerKeys.index.key,
                chunkKey: headerKeys.index.chunkKey,
            },
        }),
    };
    const json = JSON.stringify(data);

    return createHash('md5').update(json).digest('hex');
};

export const isIntersectionChunk = (parentHeader: PluginPivotChunksChunkParentHeaders) =>
    !!parentHeader?.columns && !!parentHeader?.index;

export const isColumnChunk = (parentHeader: PluginPivotChunksChunkParentHeaders) =>
    !!parentHeader?.columns && !parentHeader?.index;

export const isIndexChunk = (parentHeader: PluginPivotChunksChunkParentHeaders) =>
    !parentHeader?.columns && !!parentHeader?.index;

export const SCALE_FORMATTING_TYPES: readonly CellFormattingType[] = [
    CellFormattingType.money,
    CellFormattingType.finance,
    CellFormattingType.count,
    CellFormattingType.number,
] as const;

export const SCALE_DIVISORS: Record<NumericScale, number> = {
    none: 1,
    thousands: 1_000,
    millions: 1_000_000,
    billions: 1_000_000_000,
};

/**
 * Применяет масштабирование к числу (для денежных, числовых и количественных форматов).
 */
export function applyNumericScale(data: number, format: CellFormattingType, scale: NumericScale): number {
    if (!SCALE_FORMATTING_TYPES.includes(format)) {
        return data;
    }
    return data / SCALE_DIVISORS[scale];
}
