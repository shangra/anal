const mapStringOperator = (operator, value) => {
    const op = operator?.startsWith('$') ? operator : `$${operator}`;
    if (typeof value !== 'string') {
        return op;
    }
    if (op === '$like') return '$iLike';
    if (op === '$notLike') return '$notILike';
    return op;
};

export const convertFiltersToWhereOptions = (filters) => {
    if (!filters || !filters.rules || filters.rules.length === 0) {
        return undefined;
    }

    const isEmptyValue = (value) => value === undefined || value === '' ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && value !== null && Object.keys(value).length === 0);

    const convertRule = (rule) => {
        const { fieldName, operator, value, link, type } = rule;

        if (isEmptyValue(value)) {
            return undefined;
        }

        if ('link' in rule && 'type' in rule) {
            const [table, field] = fieldName.split('.');
            const fieldKey = fieldName.includes('.') ? `${table}.${field}` : fieldName;

            if (operator === '$ne' && typeof value === 'boolean') {
                return {
                    $or: [
                        {
                            [fieldKey]: {
                                [operator]: {
                                    link,
                                    value,
                                    type
                                }
                            }
                        },
                        {
                            [fieldKey]: {
                                $eq: {
                                    link,
                                    value: null,
                                    type
                                }
                            }
                        }
                    ]
                };
            }

            return {
                [fieldKey]: {
                    [operator]: {
                        link,
                        value,
                        type
                    }
                }
            };
        }

        if (operator === '$ne' && typeof value === 'boolean') {
            if (fieldName.includes('.')) {
                const [table, field] = fieldName.split('.');
                return {
                    $or: [
                        { [`${table}.${field}`]: { [operator]: value } },
                        { [`${table}.${field}`]: null }
                    ]
                };
            }

            return {
                $or: [
                    { [fieldName]: { [operator]: value } },
                    { [fieldName]: null }
                ]
            };
        }

        const mappedOperator = mapStringOperator(operator, value);

        if (fieldName.includes('.')) {
            const [table, field] = fieldName.split('.');
            return { [`${table}.${field}`]: { [mappedOperator]: value } };
        }

        return { [fieldName]: { [mappedOperator]: value } };
    };

    const convertGroup = (group) => {
        if (!group.rules || group.rules.length === 0) {
            return undefined;
        }

        const convertedRules = group.rules.map(rule => {
            if (rule.rules) {
                return convertGroup(rule);
            } 
                return convertRule(rule);
            
        }).filter(Boolean);

        if (convertedRules.length === 0) {
            return undefined;
        }

        if (convertedRules.length === 1) {
            return convertedRules[0];
        }

        return { [`${group.combinator}`]: convertedRules };
    };

    return convertGroup(filters);
};