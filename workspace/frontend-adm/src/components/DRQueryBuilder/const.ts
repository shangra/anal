import { QueryBuilderGroupCombinatorEnum, QueryBuilderRuleCommonOperationEnum } from 'components/DRQueryBuilder/types';

export const RuleOperationsValuesToLabels: Record<QueryBuilderRuleCommonOperationEnum, string> = {
    $eq: '=',
    $ne: '!=',
    $gt: '>',
    $gte: '>=',
    $lt: '<',
    $lte: '<=',
    $like: 'Содержит',
    $notLike: 'Не содержит',
    $between: 'Между',
    $in: 'В списке',
    $notIn: 'Не в списке',
    $startsWith: 'Начинается с',
    $endsWith: 'Заканчивается на',
    $isNull: 'Равен null',
    $isNotNull: 'Не равен null',
};

export const GroupOperationsValuesToLabel: Record<QueryBuilderGroupCombinatorEnum, string> = {
    $and: 'И',
    $or: 'ИЛИ',
};
