import { ReactNode } from 'react';
import { IconButton, SortAscIcon, SortDescIcon, SortIcon, TableCell, Tooltip } from 'ui-kit';
import { Column, ColumnType, detectColumnType, FilterCondition, RefOption, SortState } from '../types';
import { FilterPopover } from 'components/MetadataTable/components/FilterPopover';
import style from '../metadataTable.module.css';

interface DataTableHeaderCellProps {
    col: Column;
    sort: SortState | null;
    currentFilter: FilterCondition | undefined;
    refOptions: RefOption[] | undefined;
    onToggleSort: (field: string) => void;
    onFilterApply: (field: string, condition: FilterCondition | null) => void;
}

/**
 * Заголовок колонки таблицы.
 * Содержит:
 * - имя колонки (с Tooltip если есть description)
 * - иконку сортировки (цикл: off → ASC → DESC → off) и фильтра
 */
export function DataTableHeaderCell({
    col,
    sort,
    currentFilter,
    refOptions,
    onToggleSort,
    onFilterApply,
}: DataTableHeaderCellProps): ReactNode {
    const colType: ColumnType = detectColumnType(col);
    const isSortActive = sort?.field === col.field;

    const sortIcon = (): ReactNode => {
        if (!isSortActive) {
            return (
                <IconButton
                    icon={SortIcon}
                    size="small"
                    variant="text"
                    className={`${style.sortIconBtn} ${style.sortIconBtn_idle}`}
                    onClick={() => onToggleSort(col.field)}
                />
            );
        }

        const IconCmp = sort!.direction === 'ASC' ? SortAscIcon : SortDescIcon;
        return (
            <IconButton
                icon={IconCmp}
                size="small"
                variant="text"
                className={`${style.sortIconBtn} ${style.sortIconBtn_active}`}
                onClick={() => onToggleSort(col.field)}
            />
        );
    };

    return (
        <TableCell key={col.id} className={style.headerCell}>
            <div className={style.headerCellContent}>
                {col.description ? (
                    <Tooltip content={col.description} placement="top" openDelay={100} closeDelay={100} offset={10}>
                        <span>{col.name}</span>
                    </Tooltip>
                ) : (
                    <span>{col.name}</span>
                )}

                {sortIcon()}

                <FilterPopover
                    column={col}
                    columnType={colType}
                    currentFilter={currentFilter}
                    refOptions={refOptions}
                    onApply={(cond) => onFilterApply(col.field, cond)}
                />
            </div>
        </TableCell>
    );
}
