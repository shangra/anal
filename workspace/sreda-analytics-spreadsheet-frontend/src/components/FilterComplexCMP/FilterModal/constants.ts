export const STRING_FILTER_OPERATORS = ['$eq', '$ne', '$iLike', '$notILike', '$endsWith', '$startsWith'] as const;
export const NUMBER_FILTER_OPERATORS = ['$between', '$eq', '$ne', '$gt', '$gte', '$lt', '$lte'] as const;

export const FILTER_TYPES_DATE = ['date', 'datetime', 'time'] as const;
export const FILTER_TYPES_NUMBER = ['number', 'integer', 'float'] as const;
export const FILTER_TYPES_ALL = [...FILTER_TYPES_DATE, ...FILTER_TYPES_NUMBER] as const;

export const PASTE_PLACEHOLDER_STRING = '$eq:[1,2,3];and:$ne:[4,5];or:$iLike:[test]';
export const PASTE_PLACEHOLDER_NUMBER = '$eq:[1,2,3];and:$between:[10,20];or:$ne:[4,5]';
export const PASTE_PLACEHOLDER_DATE = '$eq:[2024-01-01,2024-01-02];and:$between:[2024-01-01,2024-12-31];or:$ne:[2024-06-15]';
