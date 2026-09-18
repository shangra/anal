import {
    type Group,
    isGroup,
    type MetaField,
    QueryBuilderGroupCombinatorEnum,
    QueryBuilderRuleCommonOperationEnum,
    type Rule,
} from 'components/DRQueryBuilder/types';

// ==========================================
// МАППИНГ ОПЕРАТОРОВ СЕРВЕР <-> DRQueryBuilder
// ==========================================

const mapMongoOpToDR = (op: string): QueryBuilderRuleCommonOperationEnum => {
    switch (op) {
        case '$eq':
        case '=':
            return QueryBuilderRuleCommonOperationEnum.$eq;
        case '$ne':
        case '!=':
            return QueryBuilderRuleCommonOperationEnum.$ne;
        case '$gt':
        case '>':
            return QueryBuilderRuleCommonOperationEnum.$gt;
        case '$gte':
        case '>=':
            return QueryBuilderRuleCommonOperationEnum.$gte;
        case '$lt':
        case '<':
            return QueryBuilderRuleCommonOperationEnum.$lt;
        case '$lte':
        case '<=':
            return QueryBuilderRuleCommonOperationEnum.$lte;
        case '$in':
        case 'in':
            return QueryBuilderRuleCommonOperationEnum.$in;
        case '$nin':
        case '$notIn':
        case 'notIn':
        case '!in':
            return QueryBuilderRuleCommonOperationEnum.$notIn;
        case '$between':
        case 'between':
            return QueryBuilderRuleCommonOperationEnum.$between;
        case '$regex':
        case '$like':
        case 'like':
        case 'contains':
            return QueryBuilderRuleCommonOperationEnum.$like;
        case '$notLike':
        case 'notLike':
        case 'doesNotContain':
            return QueryBuilderRuleCommonOperationEnum.$notLike;
        case '$startsWith':
        case 'startsWith':
            return QueryBuilderRuleCommonOperationEnum.$startsWith;
        case '$endsWith':
        case 'endsWith':
            return QueryBuilderRuleCommonOperationEnum.$endsWith;
        default:
            return QueryBuilderRuleCommonOperationEnum.$eq;
    }
};

const mapJsonLogicOpToDR = (op: string): QueryBuilderRuleCommonOperationEnum => {
    switch (op) {
        case '==':
        case '===':
        case '=':
            return QueryBuilderRuleCommonOperationEnum.$eq;
        case '!=':
        case '!==':
            return QueryBuilderRuleCommonOperationEnum.$ne;
        case '>':
            return QueryBuilderRuleCommonOperationEnum.$gt;
        case '>=':
            return QueryBuilderRuleCommonOperationEnum.$gte;
        case '<':
            return QueryBuilderRuleCommonOperationEnum.$lt;
        case '<=':
            return QueryBuilderRuleCommonOperationEnum.$lte;
        case 'in':
            return QueryBuilderRuleCommonOperationEnum.$in;
        case '!in':
        case 'notIn':
            return QueryBuilderRuleCommonOperationEnum.$notIn;
        case 'contains':
            return QueryBuilderRuleCommonOperationEnum.$like;
        case 'doesNotContain':
            return QueryBuilderRuleCommonOperationEnum.$notLike;
        case 'startsWith':
            return QueryBuilderRuleCommonOperationEnum.$startsWith;
        case 'endsWith':
            return QueryBuilderRuleCommonOperationEnum.$endsWith;
        case 'between':
            return QueryBuilderRuleCommonOperationEnum.$between;
        default:
            return QueryBuilderRuleCommonOperationEnum.$eq;
    }
};

const mapDRtoMongoOp = (op: QueryBuilderRuleCommonOperationEnum): string => {
    switch (op) {
        case QueryBuilderRuleCommonOperationEnum.$notIn:
            return '$nin';
        case QueryBuilderRuleCommonOperationEnum.$like:
        case QueryBuilderRuleCommonOperationEnum.$notLike:
            return '$regex';
        default:
            return op;
    }
};

const mapDRtoJsonLogicOp = (op: QueryBuilderRuleCommonOperationEnum): string => {
    switch (op) {
        case QueryBuilderRuleCommonOperationEnum.$eq:
            return '==';
        case QueryBuilderRuleCommonOperationEnum.$ne:
            return '!=';
        case QueryBuilderRuleCommonOperationEnum.$gt:
            return '>';
        case QueryBuilderRuleCommonOperationEnum.$gte:
            return '>=';
        case QueryBuilderRuleCommonOperationEnum.$lt:
            return '<';
        case QueryBuilderRuleCommonOperationEnum.$lte:
            return '<=';
        case QueryBuilderRuleCommonOperationEnum.$like:
            return 'in';
        case QueryBuilderRuleCommonOperationEnum.$in:
            return 'in';
        case QueryBuilderRuleCommonOperationEnum.$notLike:
            return '!in';
        case QueryBuilderRuleCommonOperationEnum.$notIn:
            return '!in';
        case QueryBuilderRuleCommonOperationEnum.$startsWith:
            return 'startsWith';
        case QueryBuilderRuleCommonOperationEnum.$endsWith:
            return 'endsWith';
        case QueryBuilderRuleCommonOperationEnum.$isNull:
            return '==';
        case QueryBuilderRuleCommonOperationEnum.$isNotNull:
            return '!=';
        default:
            return '==';
    }
};

// Извлечение переменной (включая атрибуты с точечной нотацией вида attributes.<UUID>.value)
const extractVarName = (node: any): string | null => {
    if (!node) return null;
    if (typeof node === 'object' && node.var !== undefined) {
        return String(node.var);
    }
    return null;
};

// ==========================================
// ПАРСИНГ: СЕРВЕРНЫЙ JSON -> DRQueryBuilder Group
// ==========================================

export const parseMongoDB = (obj: any, fields?: MetaField[]): Group => {
    const defaultGroup: Group = { combinator: QueryBuilderGroupCombinatorEnum.$and, rules: [] };
    if (!obj || typeof obj !== 'object') return defaultGroup;

    const combinatorKey = Object.keys(obj).find((k) => k === '$and' || k === '$or');
    const combinator = combinatorKey === '$or' ? QueryBuilderGroupCombinatorEnum.$or : QueryBuilderGroupCombinatorEnum.$and;

    const items = combinatorKey ? obj[combinatorKey] : [obj];
    if (!Array.isArray(items)) return defaultGroup;

    const rules: (Rule | Group)[] = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        if (item.$and || item.$or) {
            rules.push(parseMongoDB(item, fields));
        } else {
            for (const fieldName of Object.keys(item)) {
                const conditions = item[fieldName];
                if (typeof conditions === 'object' && conditions !== null && !Array.isArray(conditions)) {
                    // $gte + $lte → $between [a, b]
                    if (conditions.$gte !== undefined && conditions.$lte !== undefined) {
                        rules.push({
                            fieldName,
                            operator: QueryBuilderRuleCommonOperationEnum.$between,
                            value: [conditions.$gte, conditions.$lte],
                        });
                        continue;
                    }
                    for (const operator of Object.keys(conditions)) {
                        const drOp = mapMongoOpToDR(operator);
                        const val = conditions[operator];
                        // $eq с null → $isNull, $ne с null → $isNotNull
                        if (drOp === QueryBuilderRuleCommonOperationEnum.$eq && val === null && operator === '$eq') {
                            rules.push({
                                fieldName,
                                operator: QueryBuilderRuleCommonOperationEnum.$isNull,
                                value: null,
                            });
                            continue;
                        }
                        if (drOp === QueryBuilderRuleCommonOperationEnum.$ne && val === null && operator === '$ne') {
                            rules.push({
                                fieldName,
                                operator: QueryBuilderRuleCommonOperationEnum.$isNotNull,
                                value: null,
                            });
                            continue;
                        }
                        // $regex: "^foo" → $startsWith, $regex: "foo$" → $endsWith
                        if (operator === '$regex' && typeof val === 'string') {
                            if (val.startsWith('^') && !val.endsWith('$')) {
                                rules.push({
                                    fieldName,
                                    operator: QueryBuilderRuleCommonOperationEnum.$startsWith,
                                    value: val.slice(1),
                                });
                                continue;
                            }
                            if (val.endsWith('$') && !val.startsWith('^')) {
                                rules.push({
                                    fieldName,
                                    operator: QueryBuilderRuleCommonOperationEnum.$endsWith,
                                    value: val.slice(0, -1),
                                });
                                continue;
                            }
                        }
                        rules.push({
                            fieldName, // Передаем точное имя ключа (attributes.<UUID>.value)
                            operator: drOp,
                            value: val,
                        });
                    }
                } else {
                    // Короткая форма {field: value} — трактуем как $eq; если null → $isNull
                    const drOp =
                        conditions === null
                            ? QueryBuilderRuleCommonOperationEnum.$isNull
                            : QueryBuilderRuleCommonOperationEnum.$eq;
                    rules.push({
                        fieldName,
                        operator: drOp,
                        value: conditions,
                    });
                }
            }
        }
    }
    return { combinator, rules };
};

export const parseJsonLogic = (obj: any, fields?: MetaField[]): Group => {
    const defaultGroup: Group = { combinator: QueryBuilderGroupCombinatorEnum.$and, rules: [] };
    if (!obj || typeof obj !== 'object') return defaultGroup;

    const combinatorKey = Object.keys(obj).find((k) => k === 'and' || k === 'or');
    const combinator = combinatorKey === 'or' ? QueryBuilderGroupCombinatorEnum.$or : QueryBuilderGroupCombinatorEnum.$and;

    const items = combinatorKey ? obj[combinatorKey] : [obj];
    if (!Array.isArray(items)) return defaultGroup;

    const rules: (Rule | Group)[] = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        if (item.and || item.or) {
            rules.push(parseJsonLogic(item, fields));
        } else if ('!' in item) {
            // {"!": {op: [...]}} — инвертированный оператор (например, "Не содержит": !{in: [val, {var}]})
            const inner = item['!'];
            if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
                const innerOp = Object.keys(inner)[0];
                if (innerOp) {
                    const args = inner[innerOp];
                    if (Array.isArray(args) && args.length >= 2) {
                        const [first, second] = args;
                        const var0 = extractVarName(first);
                        const var1 = extractVarName(second);
                        if (var1 !== null) {
                            // {"!": {"in": [val, {var}]}} → $notLike (Не содержит)
                            rules.push({
                                fieldName: var1,
                                operator: QueryBuilderRuleCommonOperationEnum.$notLike,
                                value: first,
                            });
                        } else if (var0 !== null) {
                            // {"!": {"in": [{var}, [vals]]}} → $notIn (Не в списке)
                            rules.push({
                                fieldName: var0,
                                operator: QueryBuilderRuleCommonOperationEnum.$notIn,
                                value: second,
                            });
                        }
                    }
                }
            }
        } else {
            const op = Object.keys(item)[0];
            if (!op) continue;
            const args = item[op];

            if (Array.isArray(args) && args.length >= 2) {
                const [first, second] = args;
                let fieldName: string | null = null;
                let value: any = null;
                let drOperator: QueryBuilderRuleCommonOperationEnum | '$link' = QueryBuilderRuleCommonOperationEnum.$eq;

                const var0 = extractVarName(first);
                const var1 = extractVarName(second);

                if (op === 'in') {
                    // {in: [val, {var}]} → $like (Содержит)
                    // {in: [{var}, [vals]]} → $in (В списке)
                    if (var1 !== null) {
                        fieldName = var1;
                        value = first;
                        drOperator = QueryBuilderRuleCommonOperationEnum.$like;
                    } else if (var0 !== null) {
                        fieldName = var0;
                        value = second;
                        drOperator = QueryBuilderRuleCommonOperationEnum.$in;
                    }
                } else if (op === '!in') {
                    // {!in: [val, {var}]} → $notLike (Не содержит)
                    // {!in: [{var}, [vals]]} → $notIn (Не в списке)
                    if (var1 !== null) {
                        fieldName = var1;
                        value = first;
                        drOperator = QueryBuilderRuleCommonOperationEnum.$notLike;
                    } else if (var0 !== null) {
                        fieldName = var0;
                        value = second;
                        drOperator = QueryBuilderRuleCommonOperationEnum.$notIn;
                    }
                } else if (var0 !== null) {
                    fieldName = var0;
                    value = second;
                    drOperator = mapJsonLogicOpToDR(op);
                } else if (var1 !== null) {
                    fieldName = var1;
                    value = first;
                    drOperator = mapJsonLogicOpToDR(op);
                }

                if (fieldName !== null) {
                    // $eq с null → $isNull, $ne с null → $isNotNull
                    if (
                        drOperator === QueryBuilderRuleCommonOperationEnum.$eq &&
                        value === null &&
                        (op === '==' || op === '===')
                    ) {
                        drOperator = QueryBuilderRuleCommonOperationEnum.$isNull;
                    } else if (
                        drOperator === QueryBuilderRuleCommonOperationEnum.$ne &&
                        value === null &&
                        (op === '!=' || op === '!==')
                    ) {
                        drOperator = QueryBuilderRuleCommonOperationEnum.$isNotNull;
                    }

                    rules.push({
                        fieldName, // Сохраняет путь 'attributes.<UUID>.value'
                        operator: drOperator,
                        value,
                    });
                }
            }
        }
    }
    return { combinator, rules };
};

export const backendToGroup = (rawValue: any, format?: string, fields?: MetaField[]): Group => {
    if (!rawValue) return { combinator: QueryBuilderGroupCombinatorEnum.$and, rules: [] };

    let parsedVal = rawValue;
    if (typeof rawValue === 'string') {
        try {
            parsedVal = JSON.parse(rawValue);
        } catch {
            return { combinator: QueryBuilderGroupCombinatorEnum.$and, rules: [] };
        }
    }

    if (parsedVal && parsedVal.combinator && Array.isArray(parsedVal.rules)) {
        return parsedVal as Group;
    }

    if (format === 'mongodb' || (parsedVal && (parsedVal.$and || parsedVal.$or))) {
        return parseMongoDB(parsedVal, fields);
    }
    return parseJsonLogic(parsedVal, fields);
};

// ==========================================
// СЕРИАЛИЗАЦИЯ: DRQueryBuilder Group -> СЕРВЕРНЫЙ JSON
// ==========================================

export const exportMongoDB = (group: Group): any => {
    const rules = group.rules.map((entity) => {
        if (isGroup(entity)) return exportMongoDB(entity);
        let val = entity.value;
        if (val && typeof val === 'object' && 'value' in val) val = (val as any).value;

        // $isNull → {field: null} (короткая форма)
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$isNull) {
            return { [entity.fieldName]: null };
        }
        // $isNotNull → {field: {$ne: null}}
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$isNotNull) {
            return { [entity.fieldName]: { $ne: null } };
        }

        // $startsWith → {field: {$regex: "^val"}}
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$startsWith) {
            return { [entity.fieldName]: { $regex: `^${val}` } };
        }
        // $endsWith → {field: {$regex: "val$"}}
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$endsWith) {
            return { [entity.fieldName]: { $regex: `${val}$` } };
        }

        // $between [a, b] → {field: {$gte: a, $lte: b}}
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$between && Array.isArray(val) && val.length >= 2) {
            return {
                [entity.fieldName]: {
                    $gte: val[0],
                    $lte: val[1],
                },
            };
        }

        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$eq) {
            return { [entity.fieldName]: val };
        }

        return {
            [entity.fieldName]: {
                // @ts-ignore $link вообще по-другому обрабатывается
                [mapDRtoMongoOp(entity.operator)]: val,
            },
        };
    });
    if (!rules.length) return {};
    // Укорочение: одно правило — без обёртки $and/$or
    if (rules.length === 1) return rules[0];
    return { [group.combinator]: rules };
};

export const exportJsonLogic = (group: Group, fields?: MetaField[]): any => {
    const combinator = group.combinator === QueryBuilderGroupCombinatorEnum.$or ? 'or' : 'and';
    const rules = group.rules.map((entity) => {
        if (isGroup(entity)) return exportJsonLogic(entity, fields);

        let val = entity.value;
        if (val && typeof val === 'object' && 'value' in val) val = (val as any).value;

        // $isNull → {"==": [{"var": field}, null]}
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$isNull) {
            return { '==': [{ var: entity.fieldName }, null] };
        }
        // $isNotNull → {"!=": [{"var": field}, null]}
        if (entity.operator === QueryBuilderRuleCommonOperationEnum.$isNotNull) {
            return { '!=': [{ var: entity.fieldName }, null] };
        }

        // @ts-ignore $link по-другому обрабатывается
        const op = mapDRtoJsonLogicOp(entity.operator);

        if (op === 'in' || op === '!in') {
            const isArrayValue = Array.isArray(val);
            if (isArrayValue) {
                // В списке / Не в списке: var слева, массив справа
                return { [op]: [{ var: entity.fieldName }, val] };
            }
            // Содержит / Не содержит: примитив слева, var справа; "Не содержит" оборачивается в "!"
            if (op === '!in') {
                return { '!': { in: [val, { var: entity.fieldName }] } };
            }
            return { [op]: [val, { var: entity.fieldName }] };
        }
        return { [op]: [{ var: entity.fieldName }, val] };
    });
    if (!rules.length) return {};
    // Укорочение: одно правило — без обёртки and/or
    if (rules.length === 1) return rules[0];
    return { [combinator]: rules };
};

export const groupToBackend = (group: Group, format?: string, fields?: MetaField[]): string => {
    const rawObject = format === 'mongodb' ? exportMongoDB(group) : exportJsonLogic(group, fields);

    if (!rawObject || Object.keys(rawObject).length === 0) {
        return '{}';
    }
    return JSON.stringify(rawObject);
};
