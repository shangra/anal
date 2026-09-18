export function defaultComparator<ValueType>(first: ValueType, second: ValueType, sortDirection?: 'asc' | 'desc') {
    if (first > second) {
        return sortDirection === 'asc' ? 1 : -1;
    }
    
    if (first < second) {
        return sortDirection === 'asc' ? -1 : 1;
    }

    return 0;
}

type SORT_DIRECTION_TYPE = 'ASC' | 'DESC';

export function defaultComparatorForAllTypes<ValueType extends number | string>(
    first: ValueType,
    second: ValueType,
    fieldType: string,
    sortDirection: SORT_DIRECTION_TYPE
): number {
    const lowerCasedSortDirection = sortDirection?.toLowerCase() as Lowercase<SORT_DIRECTION_TYPE>;
    const firstStringValue = first?.toString();
    const secondStringValue = second?.toString();

    switch(fieldType) {
        case 'number':
            return defaultComparator(first, second, lowerCasedSortDirection);
        case 'date':
            return defaultComparator(Date.parse(first as string), Date.parse(second as string), lowerCasedSortDirection);
        case 'string':
            return lowerCasedSortDirection === 'asc' ? firstStringValue.localeCompare(secondStringValue) : secondStringValue.localeCompare(firstStringValue);
        default: 
            return lowerCasedSortDirection === 'asc' ? firstStringValue.localeCompare(secondStringValue) : secondStringValue.localeCompare(firstStringValue);
    }

}
