import { ReactNode } from 'react';
import { Column, DataRow, TableData } from 'components/MetadataTable/types';
import style from '../metadataTable.module.css';
import cn from 'classnames';

interface DataTableCellProps {
    row: DataRow;
    col: Column;
    refs: TableData['refs'];
}

/**
 * Рендерит значение ячейки в зависимости от типа колонки:
 * - ref    → подставляет лейбл из refs
 * - date   → форматирует через toLocaleDateString
 * - bool   → ✓ / ✗
 * - uuid   → укорачивает, полное значение в title
 * - пусто  → приведение к строке
 */
export function DataTableCell({ row, col, refs }: DataTableCellProps): ReactNode {
    const value = row[col.field];

    /* ref — подменяем ID на лейбл */
    if (col.ref && value != null) {
        const refLabel = refs[col.field]?.[String(value)];
        if (refLabel !== undefined) {
            return <span className={cn(style.ref, style.cell)}>{refLabel}</span>;
        }
    }

    /* timestamp / datetime */
    if (col.type === 'timestamp' || col.type === 'datetime') {
        if (!value) return <span className="empty-value">—</span>;
        return <span className={cn(style.date, style.cell)}>{new Date(value as string).toLocaleDateString()}</span>;
    }

    /* boolean */
    if (col.type === 'boolean') {
        return <span className={cn(style.boolean, value ? style.true : style.false, style.cell)}>{value ? '✓' : '✗'}</span>;
    }

    /* uuid */
    if (col.type === 'uuid' && typeof value === 'string' && value.length > 0) {
        return (
            <span className={cn(style.string, style.cell)} title={value}>
                {value}
            </span>
        );
    }

    /* пусто */
    if (value === undefined || value === null || value === '') {
        return <span className={cn(style.empty, style.cell)}>—</span>;
    }

    /* по умолчанию */
    return <span>{String(value)}</span>;
}
