import { FilterCondition, SortState } from 'components/MetadataTable/types';

/**
 * Преобразует набор фильтров в Sequelize-совместимый where-объект.
 * Каждый фильтр — отдельное поле, операторы с префиксом $ мапятся в Op.*.
 */
export function buildWhereClause(filters: Record<string, FilterCondition>): Record<string, unknown> | undefined {
    const entries = Object.entries(filters);
    if (entries.length === 0) return undefined;

    const where: Record<string, unknown> = {};

    for (const [, cond] of entries) {
        const op = cond.operator;
        const val = cond.value;

        switch (op) {
            case 'equals':
                where[cond.field] = val;
                break;
            case 'notEquals':
                where[cond.field] = { $ne: val };
                break;
            case 'startsWith':
                where[cond.field] = { $startsWith: val };
                break;
            case 'endsWith':
                where[cond.field] = { $endsWith: val };
                break;
            case 'contains':
                where[cond.field] = { $substring: val };
                break;
            case 'greaterThan':
                where[cond.field] = { $gt: val };
                break;
            case 'lessThan':
                where[cond.field] = { $lt: val };
                break;
            case 'greaterThanOrEqual':
                where[cond.field] = { $gte: val };
                break;
            case 'lessThanOrEqual':
                where[cond.field] = { $lte: val };
                break;
            case 'range':
                where[cond.field] = {
                    $gte: val,
                    $lte: cond.valueTo ?? val,
                };
                break;
            case 'booleanEquals':
                where[cond.field] = val === 'true';
                break;
            case 'refIn':
                where[cond.field] = val;
                break;
        }
    }

    return where;
}

/**
 * Преобразует состояние сортировки в Sequelize order-формат.
 */
export function buildOrderClause(sort: SortState | null): [string, 'ASC' | 'DESC'][] | undefined {
    if (!sort) return undefined;
    return [[sort.field, sort.direction]];
}
