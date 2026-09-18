import React, { Component, Suspense } from 'react';
import { IconButton } from 'ui-kit';
import { DRQueryBuilder } from 'components/DRQueryBuilder';
import { type Group, type MetaField, QueryBuilderRuleCommonOperationEnum } from 'components/DRQueryBuilder/types';
import $windows from 'components/WindowsCMP/windows.helper';
import { getNewIcon } from 'helpers/icon-adapter.helper';
import { backendToGroup, groupToBackend } from './conditionConverter';

// ==========================================
// ФУНКЦИЯ НОРМАЛИЗАЦИИ ОПЕРАТОРОВ В CONDITION
// ==========================================

/**
 * Преобразует внешние/серверные имена операторов в enum DRQueryBuilder ($in, $eq, $like)
 */
export const normalizeOperator = (op: string): QueryBuilderRuleCommonOperationEnum => {
    if (!op) return QueryBuilderRuleCommonOperationEnum.$eq;
    if (op.startsWith('$')) return op as QueryBuilderRuleCommonOperationEnum;

    switch (op) {
        case '=':
        case '==':
        case '===':
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
        case 'like':
        case 'contains':
            return QueryBuilderRuleCommonOperationEnum.$like;
        case 'notLike':
        case 'doesNotContain':
            return QueryBuilderRuleCommonOperationEnum.$notLike;
        case 'between':
            return QueryBuilderRuleCommonOperationEnum.$between;
        case 'in':
            return QueryBuilderRuleCommonOperationEnum.$in;
        case 'notIn':
        case 'nin':
        case '!in':
            return QueryBuilderRuleCommonOperationEnum.$notIn;
        default:
            return `$${op}` as QueryBuilderRuleCommonOperationEnum;
    }
};

// ==========================================
// КОМПОНЕНТ CONDITION
// ==========================================

interface ConditionProps {
    title: string;
    fields: MetaField[];
    icon?: string;
    id: string;
    format?: 'mongodb' | 'jsonlogic' | string;
    mode?: 'query' | 'mapping' | 'flex';
    receiverFields?: MetaField[];
    getValue: () => string;
    onChange?: (value: string) => void;
}

interface ConditionState {
    transformedFields: MetaField[];
}

export class Condition extends Component<ConditionProps, ConditionState> {
    constructor(props: ConditionProps) {
        super(props);
        this.state = {
            transformedFields: this.transformFields(props.fields),
        };
    }

    componentDidUpdate(prevProps: ConditionProps) {
        if (prevProps.fields !== this.props.fields) {
            this.setState({
                transformedFields: this.transformFields(this.props.fields),
            });
        }
    }

    /**
     * Подготовка метаданных полей:
     * 1. Приведение ключей (поддержка attributes.<UUID>.value).
     * 2. Нормализация всех входящих операторов через normalizeOperator.
     */
    transformFields(fields: MetaField[]): MetaField[] {
        if (!Array.isArray(fields)) return [];

        return fields.map((f: any) => {
            const fieldKey = f.value ?? f.key ?? f.name ?? '';
            const inputType = f.type ?? f.valueEditorType ?? f.inputType ?? (f.values || f.options ? 'select' : 'input');

            // Выделенная нормализация операторов
            const rawOperators = f.operators ?? f.allowedOperators;
            const normalizedOperators =
                Array.isArray(rawOperators) && rawOperators.length > 0
                    ? rawOperators
                          .map((op: any) => {
                              if (op == null) return undefined as any;
                              if (typeof op === 'string') return normalizeOperator(op);
                              if (typeof op === 'object') {
                                  const opName = op.value ?? op.name ?? '';
                                  return normalizeOperator(String(opName));
                              }
                              return normalizeOperator(String(op));
                          })
                          .filter(Boolean)
                    : undefined;

            return {
                ...f,
                label: f.label || fieldKey,
                value: fieldKey,
                key: fieldKey,
                name: fieldKey,
                type: inputType,
                operators: normalizedOperators, // В DRQueryBuilder передается уже готовый Enum-массив
                values: Array.isArray(f.values)
                    ? f.values.map((v: any) => ({
                          name: v.name ?? v.value,
                          label: v.label ?? v.name ?? v.value,
                          value: v.value ?? v.name,
                      }))
                    : f.options,
            };
        });
    }

    onQueryChange = (group: Group) => {
        const formattedValue = groupToBackend(group, this.props.format, this.state.transformedFields);

        this.props.onChange?.(formattedValue);
    };

    onClick = () => {
        const rawValue = this.props.getValue();
        const initialGroupState = backendToGroup(rawValue, this.props.format, this.state.transformedFields);
        const mode = this.props.mode || 'flex';

        const content = (
            <Suspense fallback={<div>Загрузка...</div>}>
                <DRQueryBuilder
                    mode={mode as any}
                    fields={this.state.transformedFields}
                    receiverFields={
                        this.props.receiverFields
                            ? this.transformFields(this.props.receiverFields)
                            : this.state.transformedFields
                    }
                    initialValue={initialGroupState}
                    onChange={this.onQueryChange}
                />
            </Suspense>
        );

        $windows.open(this.props.title, content, {
            uuid: this.props.id,
            portal: document.querySelector('#my-modal')?.parentElement,
        });
    };

    render() {
        return (
            <IconButton
                title={this.props.title}
                icon={getNewIcon(this.props.icon)}
                onClick={this.onClick}
                color="controlled"
                style={{ borderRadius: 0 }}
            />
        );
    }
}
