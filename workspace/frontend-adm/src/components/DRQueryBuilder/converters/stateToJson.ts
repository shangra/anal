import { Group, isGroup, isRule, JsonGroup, JsonRule, JsonType } from 'components/DRQueryBuilder/types';

export const stateToJson = (group: Group): JsonType => {
    const result: (JsonRule | JsonGroup)[] = [];

    group.rules.forEach((entity) => {
        if (isRule(entity)) {
            let { value } = entity;
            if (value && typeof value === "object" && !('length' in value)) {
                value = value.value;
            }

            result.push({
                [entity.fieldName]: {
                    [entity.operator]: value,
                },
            });
        } else if (isGroup(entity)) {
            result.push(stateToJson(entity));
        }
    });

    return {
        [group.combinator]: result,
    };
};
