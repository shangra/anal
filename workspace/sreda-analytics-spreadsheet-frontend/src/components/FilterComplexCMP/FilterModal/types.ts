import { INode } from '../../FilterRef/types';
import { FILTER_TYPES_ALL } from './constants';

/**
 * Все возможные операторы фильтрации.
 * Экспортируется для использования в FilterModal и FilterRef.
 */
export type TFilterBy =
    | '$between'
    | '$eq'
    | '$ne'
    | '$gt'
    | '$gte'
    | '$lt'
    | '$lte'
    | '$iLike'
    | '$notILike'
    | '$endsWith'
    | '$startsWith';

/** Элемент items для range-фильтров (date, number). */
export type TFilterRangeItem = { from: string | number; to: string | number };
/** Элемент items для value-фильтров (string, number). */
export type TFilterValueItem = { value: string | number };
/** Элемент items для ref-фильтров (tree). */
export type TFilterRefItem = { label: string; value: string | number; level?: number };

/** Параметр, который приходит в onSelectFilter от любого дочернего фильтра. */
export interface IOnSelectFilterParam {
    id: string;
    filterBy: TFilterBy;
    comparison: 'or' | 'and';
    items: Array<TFilterRangeItem | TFilterValueItem | TFilterRefItem>;
    cached?: INode[];
}

export type TFilterType = (typeof FILTER_TYPES_ALL)[number];
