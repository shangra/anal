import $api from 'helpers/axios';
import Helper from 'helpers/helper';
import {
    Group,
    JsonGroup,
    jsonIsGroup,
    jsonIsRule,
    JsonRule,
    QueryBuilderGroupCombinatorEnum,
    QueryBuilderRuleCommonOperationEnum,
    RefField,
    Rule,
    RuleValueType,
} from '../types';
import { buildUrl } from 'helpers/buildUrl';

export const jsonToState = async (jsonString: string, nameToField: Record<string, RefField>, server?: string): Promise<Group | null> => {
    try {
        const json = JSON.parse(jsonString);
        const rootCombinator = Object.keys(json)[0] as QueryBuilderGroupCombinatorEnum;
        const rules: (Rule | Group)[] = [];

        await Promise.all(
            Object.values<JsonRule | JsonGroup>(json[rootCombinator] ?? {}).map(async (field) => {
                if (jsonIsRule(field)) {
                    const fieldName = Object.keys(field)[0] as QueryBuilderRuleCommonOperationEnum;
                    const fieldOperator = Object.keys(field[fieldName]!)[0] as QueryBuilderRuleCommonOperationEnum;
                    let value = field[fieldName]![fieldOperator]! as RuleValueType;
                    const serverPrefix = server ? `${server}/` : '';



                    if (nameToField[fieldName] && Helper.isUUID(value)) {
                        const urlMeta = buildUrl(server, 'metadata/object', nameToField[fieldName].ref.value)
                        const meta = await $api.get(urlMeta);
                        const urlRes = buildUrl(
                            server,
                            meta.data.routes,
                            `${nameToField[fieldName].ref.value}?options=${JSON.stringify({ where: { id: value }, })
                            }`
                        )
                        const res = await $api.get(urlRes);
                        if (res.data.rows.length) {
                            value = { label: res.data.rows[0].name, value: res.data.rows[0].id };
                        }
                    }
                    rules.push({ fieldName, operator: fieldOperator, value });
                } else if (jsonIsGroup(field)) {
                    const serializedGroup = await jsonToState(field.toString(), nameToField, server);
                    if (!serializedGroup) return;

                    rules.push(serializedGroup);
                }
            }),
        );

        return {
            combinator: rootCombinator,
            rules,
        };
    } catch (error) {
        console.log('Parsing error: ', error);
        return null;
    }
};
