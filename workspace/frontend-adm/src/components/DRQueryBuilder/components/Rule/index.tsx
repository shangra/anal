import { Component } from 'react';
import { Button, DeleteIcon, IconButton, ListAddIcon, Select, type SelectOption } from 'ui-kit';
import { Select as CommonInputSelect } from 'components/MetadataForms/Inputs/Select';
import { fieldTypeName } from 'components/MetadataForms/MetaInput/constant';
import $modal from 'components/ui/MyModal/modal.helper';
import { RuleOperationsValuesToLabels } from 'components/DRQueryBuilder/const';
import {
    type BaseMetaField,
    type MetaField,
    type MutationFn,
    QueryBuilderRuleCommonOperationEnum,
    type RefMetaField,
    type Rule as RuleType,
} from '../../types';
import { ListModal } from 'components/DRQueryBuilder/components/Rule/components/ListModal';
import { RuleBaseInput } from 'components/DRQueryBuilder/components/Rule/components/RuleBaseInput';
import { RuleBetweenInput } from 'components/DRQueryBuilder/components/Rule/components/RuleBetweenInput';
import styles from './styles.module.css';

interface IRuleProps {
    state: RuleType;
    storeAccessKey: string;
    fieldMeta: MetaField;
    fieldsMeta: MetaField[];
    receiverFields?: BaseMetaField[];
    rootFieldRule?: boolean;
    onChange?: MutationFn;
    mode?: 'query' | 'mapping' | 'flex';
}

interface IRuleState {
    localUuidValue: string;
}

const EQUALITY_OPERATORS: QueryBuilderRuleCommonOperationEnum[] = [
    QueryBuilderRuleCommonOperationEnum.$eq,
    QueryBuilderRuleCommonOperationEnum.$ne,
];

const NULL_OPERATORS: QueryBuilderRuleCommonOperationEnum[] = [
    QueryBuilderRuleCommonOperationEnum.$isNull,
    QueryBuilderRuleCommonOperationEnum.$isNotNull,
];

const STRING_OPERATORS: QueryBuilderRuleCommonOperationEnum[] = [
    ...EQUALITY_OPERATORS,
    ...NULL_OPERATORS,
    QueryBuilderRuleCommonOperationEnum.$like,
    QueryBuilderRuleCommonOperationEnum.$notLike,
    QueryBuilderRuleCommonOperationEnum.$startsWith,
    QueryBuilderRuleCommonOperationEnum.$endsWith,
];
const NUMERIC_OPERATORS: QueryBuilderRuleCommonOperationEnum[] = [
    ...EQUALITY_OPERATORS,
    ...NULL_OPERATORS,
    QueryBuilderRuleCommonOperationEnum.$gt,
    QueryBuilderRuleCommonOperationEnum.$gte,
    QueryBuilderRuleCommonOperationEnum.$lt,
    QueryBuilderRuleCommonOperationEnum.$lte,
    QueryBuilderRuleCommonOperationEnum.$between,
];

const ALL_OPERATORS: QueryBuilderRuleCommonOperationEnum[] = Object.values(QueryBuilderRuleCommonOperationEnum);

const IN_OPERATORS: QueryBuilderRuleCommonOperationEnum[] = [
    QueryBuilderRuleCommonOperationEnum.$notIn,
    QueryBuilderRuleCommonOperationEnum.$in,
];

export const FIELD_TYPE_TO_OPERATORS: Record<MetaField['type'], QueryBuilderRuleCommonOperationEnum[]> = {
    input: ALL_OPERATORS,
    boolean: [...EQUALITY_OPERATORS, ...IN_OPERATORS],
    integer: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    float: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    timestamp: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    datetime: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    uuid: [...EQUALITY_OPERATORS, ...IN_OPERATORS],
    composite: ALL_OPERATORS,
    ref: [...EQUALITY_OPERATORS, ...IN_OPERATORS],
    string: [...STRING_OPERATORS, ...IN_OPERATORS],
    text: [...STRING_OPERATORS, ...IN_OPERATORS],
    date: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    metaRef: [...EQUALITY_OPERATORS, ...IN_OPERATORS],
};

export const INPUT_TYPE_TO_OPERATORS: Record<string, QueryBuilderRuleCommonOperationEnum[]> = {
    text: ALL_OPERATORS,
    number: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    checkbox: [...EQUALITY_OPERATORS, ...IN_OPERATORS],
    date: [...NUMERIC_OPERATORS, ...IN_OPERATORS],
    select: [...EQUALITY_OPERATORS, ...IN_OPERATORS],
};

export default class Rule extends Component<IRuleProps, IRuleState> {
    constructor(props: Readonly<IRuleProps>) {
        super(props);

        this.state = {
            localUuidValue: (this.props.state.value as string) || '',
        };
    }

    onFieldNameChange = (name: string | null) => {
        const currentOperator = this.props.state.operator;
        // Сохраняем значение при смене поля для операторов, работающих со списком значений
        const keepValue =
            currentOperator === QueryBuilderRuleCommonOperationEnum.$in ||
            currentOperator === QueryBuilderRuleCommonOperationEnum.$notIn;

        this.props.onChange?.('set', `${this.props.storeAccessKey}.fieldName`, name);

        if (keepValue) return;

        const foundObject = this.props.fieldsMeta.find((item) => item.value === name);
        const fieldType = foundObject?.type;

        // Устанавливаем для boolean полей по умолчанию null
        if (fieldType === 'boolean') {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, null);
        } else {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, '');
        }
    };

    onOperatorChange = (operator: string | null) => {
        const newOperator = operator;

        // Обрабатываем изменение оператора на ссылку
        if (this.props.state.operator !== '$link' && newOperator === '$link') {
            const value = this.props.receiverFields?.length ? this.props.receiverFields[0].value : '';
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, value);
        }
        // Обрабатываем изменение оператора с ссылки
        else if (this.props.state.operator === '$link' && newOperator !== '$link') {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, '');
        }

        // Обрабатываем изменение оператора на between
        if (
            this.props.state.operator !== QueryBuilderRuleCommonOperationEnum.$between &&
            newOperator === QueryBuilderRuleCommonOperationEnum.$between
        ) {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, [null, null]);
        } else if (
            this.props.state.operator === QueryBuilderRuleCommonOperationEnum.$between &&
            newOperator !== QueryBuilderRuleCommonOperationEnum.$between
        ) {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, '');
        }

        if (
            !(
                [QueryBuilderRuleCommonOperationEnum.$in, QueryBuilderRuleCommonOperationEnum.$notIn] as (
                    | QueryBuilderRuleCommonOperationEnum
                    | '$link'
                )[]
            ).includes(this.props.state.operator) &&
            (
                [QueryBuilderRuleCommonOperationEnum.$in, QueryBuilderRuleCommonOperationEnum.$notIn] as (
                    | QueryBuilderRuleCommonOperationEnum
                    | '$link'
                )[]
            ).includes(newOperator as QueryBuilderRuleCommonOperationEnum | '$link')
        ) {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, []);
        } else if (
            (
                [QueryBuilderRuleCommonOperationEnum.$in, QueryBuilderRuleCommonOperationEnum.$notIn] as (
                    | QueryBuilderRuleCommonOperationEnum
                    | '$link'
                )[]
            ).includes(this.props.state.operator) &&
            !(
                [QueryBuilderRuleCommonOperationEnum.$in, QueryBuilderRuleCommonOperationEnum.$notIn] as (
                    | QueryBuilderRuleCommonOperationEnum
                    | '$link'
                )[]
            ).includes(newOperator as QueryBuilderRuleCommonOperationEnum | '$link')
        ) {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, '');
        }

        // $isNull / $isNotNull — значение всегда null, инпут не нужен
        if (
            newOperator === QueryBuilderRuleCommonOperationEnum.$isNull ||
            newOperator === QueryBuilderRuleCommonOperationEnum.$isNotNull
        ) {
            this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, null);
        }

        this.props.onChange?.('set', `${this.props.storeAccessKey}.operator`, newOperator);
    };

    onListValueChange = (payload: any[]) => {
        this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, payload);
    };

    onValueSelectChange = (value: string | boolean | null) => {
        this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, value);
    };

    onRuleDelete = () => {
        this.props.onChange?.('delete', this.props.storeAccessKey, null);
    };

    commonHandleChange = (value: any) => {
        this.props.onChange?.('set', `${this.props.storeAccessKey}.value`, value);
    };

    #transformOperator(operatorOptions: SelectOption<string>[], fieldType: MetaField['type'] | null): SelectOption<string>[] {
        if (this.props.state.operator === '$link') {
            return operatorOptions;
        }

        const customOperators = this.props.fieldMeta?.operators;
        const inputType = this.props.fieldMeta?.inputType;
        let allowedOperators: QueryBuilderRuleCommonOperationEnum[];

        if (Array.isArray(customOperators) && customOperators.length > 0) {
            allowedOperators = customOperators as QueryBuilderRuleCommonOperationEnum[];
        } else if (this.props.mode === 'flex') {
            const isStringLike =
                fieldType === 'string' ||
                fieldType === 'input' ||
                (fieldType == null && inputType == null);
            if (isStringLike) {
                allowedOperators = STRING_OPERATORS;
            } else if (inputType === 'text') {
                allowedOperators = ALL_OPERATORS;
            } else if (inputType && INPUT_TYPE_TO_OPERATORS[inputType]) {
                allowedOperators = INPUT_TYPE_TO_OPERATORS[inputType];
            } else if (fieldType) {
                allowedOperators = FIELD_TYPE_TO_OPERATORS[fieldType];
            } else {
                allowedOperators = ALL_OPERATORS;
            }
        } else {
            allowedOperators = fieldType ? FIELD_TYPE_TO_OPERATORS[fieldType] : ALL_OPERATORS;
        }

        const filtered = operatorOptions.filter((option) =>
            allowedOperators.includes(option.value as QueryBuilderRuleCommonOperationEnum),
        );

        if (this.props.receiverFields) {
            filtered.push({
                label: 'Ссылка на',
                value: '$link',
            });
        }

        return filtered;
    }

    openListEditModal = () => {
        const inputProps = {
            metaRef:
                this.props.fieldMeta.type === fieldTypeName.REF && 'metaRef' in this.props.fieldMeta
                    ? this.props.fieldMeta.metaRef.value
                    : undefined,
        };

        $modal.show(
            'Выбрать',
            <ListModal
                fieldType={this.props.fieldMeta.type}
                initialItems={this.props.state.value as unknown as any[]}
                inputMetaProps={inputProps}
                onSave={(newItems) => {
                    this.onListValueChange(newItems);
                    $modal.hide();
                }}
            />,
        );
    };

    render() {
        const { operator, value } = this.props.state;
        const isLinkOperator = operator === '$link';
        const fieldType = !isLinkOperator ? this.props.fieldMeta.type : null;

        const fieldNameOptions = this.props.fieldsMeta
            .filter((field) => field.value !== this.props.fieldMeta.value)
            .map(({ label, value }) => ({ label, value }));

        fieldNameOptions.unshift({
            label: this.props.fieldMeta.label,
            value: this.props.fieldMeta.value,
        });

        const operatorKeys = Object.keys(QueryBuilderRuleCommonOperationEnum);
        const operatorOptions = operatorKeys.map(
            (key) =>
                ({
                    label: RuleOperationsValuesToLabels[key as QueryBuilderRuleCommonOperationEnum],
                    value: key,
                } as SelectOption<string>),
        );

        if (this.props.receiverFields) {
            operatorOptions.push({
                label: 'Ссылка на',
                value: '$link',
            } as SelectOption<string>);
        }

        const fieldValues = (this.props.fieldMeta as any)?.values as
            | { label?: string; name?: string; value?: string }[]
            | undefined;
        const hasValueOptions =
            this.props.mode === 'flex' && Array.isArray(fieldValues) && fieldValues.length > 0;

        return (
            <div className={styles.wrapper}>
                <Select
                    onChange={this.onFieldNameChange}
                    value={this.props.fieldMeta.value}
                    options={fieldNameOptions}
                    fullWidth
                    resettable
                />

                <Select
                    onChange={this.onOperatorChange}
                    value={operator}
                    options={this.#transformOperator(operatorOptions, fieldType)}
                    className={styles.operatorSelect}
                    resettable
                />

                {operator === QueryBuilderRuleCommonOperationEnum.$between ? (
                    <RuleBetweenInput
                        type={fieldType!}
                        value={value as unknown as [any, any]}
                        handleChange={this.commonHandleChange}
                    />
                ) : null}

                {isLinkOperator && this.props.receiverFields ? (
                    <CommonInputSelect
                        onChange={this.onValueSelectChange}
                        value={value as string}
                        options={
                            this.props.receiverFields?.map(({ value, label }) => ({ value, label } as SelectOption<any>)) ??
                            ([] as SelectOption<any>[])
                        }
                        onClickRightIcon={() => this.onValueSelectChange(null)}
                    />
                ) : null}

                {!hasValueOptions && (
                    [
                        QueryBuilderRuleCommonOperationEnum.$in,
                        QueryBuilderRuleCommonOperationEnum.$notIn,
                    ] as (QueryBuilderRuleCommonOperationEnum | '$link')[]
                ).includes(operator) ? (
                    <Button style={{ width: '100%' }} leftIcon={ListAddIcon} onClick={this.openListEditModal}>
                        Редактировать список
                    </Button>
                ) : null}

                {hasValueOptions ? (
                    <Select
                        value={(value as string) ?? null}
                        onChange={this.onValueSelectChange}
                        options={fieldValues!.map(({ label, name, value: v }: any) => ({
                            label: label ?? name ?? v,
                            value: v ?? name,
                        }))}
                        fullWidth
                        resettable
                    />
                ) : operator === QueryBuilderRuleCommonOperationEnum.$isNull ||
                  operator === QueryBuilderRuleCommonOperationEnum.$isNotNull ? null : !(
                    [
                        QueryBuilderRuleCommonOperationEnum.$in,
                        QueryBuilderRuleCommonOperationEnum.$notIn,
                    ] as (QueryBuilderRuleCommonOperationEnum | '$link')[]
                ).includes(operator) ? (
                    <RuleBaseInput
                        type={fieldType!}
                        value={value}
                        handleChange={this.commonHandleChange}
                        inputMetaProps={{
                            metaRef:
                                fieldType === fieldTypeName.REF
                                    ? (this.props.fieldMeta as RefMetaField).metaRef.value
                                    : undefined,
                            dataTypes: 'dataTypes' in this.props.fieldMeta ? this.props.fieldMeta.dataTypes : undefined,
                        }}
                    />
                ) : null}

                {!this.props.rootFieldRule && (
                    <IconButton
                        onClick={this.onRuleDelete}
                        icon={DeleteIcon}
                        color="error"
                        variant="text"
                        style={{ padding: '0 8px' }}
                    />
                )}
            </div>
        );
    }
}
