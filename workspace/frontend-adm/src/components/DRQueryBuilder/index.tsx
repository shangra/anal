import { Component, ReactNode } from 'react';
import {
    BaseMetaField,
    Group as GroupType,
    MetaField,
    MutationFn,
    QueryBuilderGroupCombinatorEnum,
} from 'components/DRQueryBuilder/types';
import { Group } from 'components/DRQueryBuilder/components/Group';

type IQueryBuilderProps = {
    mode: 'query';
    fields: MetaField[];
    initialValue?: GroupType;
    onChange?: (value: GroupType) => void;
};

type IMappingBuilderProps = {
    mode: 'mapping';
    fields: MetaField[];
    receiverFields: BaseMetaField[];
    initialValue?: GroupType;
    onChange?: (value: GroupType) => void;
};

type IFlexBuilderProps = {
    mode: 'flex';
    fields: MetaField[];
    initialValue?: GroupType;
    onChange?: (value: GroupType) => void;
}

type IDRQueryBuilderProps = IMappingBuilderProps | IQueryBuilderProps | IFlexBuilderProps;

interface IDRQueryBuilderState {
    state: GroupType;
    fieldNameToFieldMeta: Record<string, MetaField>;
    receiverFieldNameToFieldMeta?: Record<string, BaseMetaField>;
}

export class DRQueryBuilder extends Component<IDRQueryBuilderProps, IDRQueryBuilderState> {
    constructor(props: Readonly<IDRQueryBuilderProps>) {
        super(props);

        this.state = {
            state: props.initialValue || { combinator: QueryBuilderGroupCombinatorEnum.$and, rules: [] },
            fieldNameToFieldMeta: props.fields.reduce((acc, fieldMeta) => {
                acc[fieldMeta.value] = fieldMeta;
                return acc;
            }, {} as Record<string, MetaField>),
            receiverFieldNameToFieldMeta:
                props.mode === 'mapping'
                    ? props.receiverFields.reduce((acc, field) => {
                          acc[field.value] = field;

                          return acc;
                      }, {} as Record<string, BaseMetaField>)
                    : undefined,
        };
    }

    onChange: MutationFn = (operationType, key, value, options) => {
        this.setState((prev) => {
            const newState = prev.state;
            let rule: any = newState;
            const keys = key.split('.');
            keys.forEach((key, index) => {
                if (index === keys.length - 1 || key === '') return;
                rule = rule[key];
            });
            const valueKey = keys[keys.length - 1];

            switch (operationType) {
                case 'add':
                    rule[key] = value;
                    break;
                case 'set':
                    if (options?.setKey) {
                        const currentValue = rule[valueKey];
                        const newKey = value;

                        rule[newKey] = currentValue;
                        delete rule[valueKey];
                    } else {
                        const valueKey = keys[keys.length - 1];
                        rule[valueKey] = value;
                    }
                    break;
                case 'delete':
                    if (Array.isArray(rule)) {
                        let rulesWrapper: any = newState;
                        keys.forEach((key, index) => {
                            if (index >= keys.length - 2 || key === '') return;

                            rulesWrapper = rulesWrapper[key];
                        });

                        const newArray = [
                            ...rulesWrapper.rules.slice(0, parseInt(valueKey, 10)),
                            ...rulesWrapper.rules.slice(parseInt(valueKey, 10) + 1),
                        ];

                        rulesWrapper.rules = newArray;
                    } else {
                        delete rule[valueKey];
                    }
                    break;
            }

            this.props.onChange?.(newState);

            return {
                state: newState,
            };
        });
    };

    render(): ReactNode {
        return (
            <div className="p-1">
                <Group
                    root
                    mode={this.props.mode}
                    storeAccessKey=""
                    fieldsNameToFieldMeta={this.state.fieldNameToFieldMeta}
                    state={this.state.state}
                    onChange={this.onChange}
                    receiverFields={this.props.mode === 'mapping' ? this.state.receiverFieldNameToFieldMeta : undefined}
                />
            </div>
        );
    }
}
