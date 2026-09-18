import cn from 'classnames';
import { Component, type ReactNode } from 'react';
import { Button, Select, type SelectOption } from 'ui-kit';
import { GroupOperationsValuesToLabel } from 'components/DRQueryBuilder/const';
import { AddIcon } from 'components/DRQueryBuilder/icons/AddIcon';
import {
    type BaseMetaField,
    type Group as GroupType,
    isGroup,
    isRule,
    type MetaField,
    type MutationFn,
    QueryBuilderGroupCombinatorEnum,
    QueryBuilderRuleCommonOperationEnum,
    type Rule as RuleType,
} from '../../types';
import Rule from 'components/DRQueryBuilder/components/Rule';
import styles from './styles.module.css';

interface IGroupProps {
    storeAccessKey: string;
    state: GroupType;
    fieldsNameToFieldMeta: Record<string, MetaField>;
    onChange?: MutationFn;
    root?: boolean;
    receiverFields?: Record<string, BaseMetaField>;
    mode?: 'query' | 'mapping' | 'flex'; // <-- Добавлено
}

export class Group extends Component<IGroupProps> {
    onGroupCombinatorChange = (combinator: QueryBuilderGroupCombinatorEnum) => {
        this.props.state.combinator = combinator;
        this.props.onChange?.(
            'set',
            `${this.props.storeAccessKey}.combinator`,
            combinator,
        );
    };

    onAddRule = () => {
        const currentState = this.props.state.rules;
        currentState.push({
            operator: QueryBuilderRuleCommonOperationEnum.$eq,
            value: '',
            fieldName: Object.keys(this.props.fieldsNameToFieldMeta)[0],
        } as RuleType);

        this.props.onChange?.('set', `${this.props.storeAccessKey}.rules`, currentState);
    };

    onAddGroup = () => {
        const currentState = this.props.state.rules;
        currentState.push({ combinator: QueryBuilderGroupCombinatorEnum.$and, rules: [] } as GroupType);

        this.props.onChange?.('set', `${this.props.storeAccessKey}.rules`, currentState);
    };

    onDeleteGroup = () => {
        this.props.onChange?.('delete', `${this.props.storeAccessKey}`, null);
    };

    render(): ReactNode {
        const combinatorOptions = this.props.receiverFields ? [
            {
                label: GroupOperationsValuesToLabel[QueryBuilderGroupCombinatorEnum.$and as QueryBuilderGroupCombinatorEnum],
                value: QueryBuilderGroupCombinatorEnum.$and,
            }
        ] as SelectOption<any>[] :
            Object.keys(QueryBuilderGroupCombinatorEnum).map((key) => ({
                label: GroupOperationsValuesToLabel[key as QueryBuilderGroupCombinatorEnum],
                value: key,
        })) as SelectOption<any>[];
        
        return (
            <div className={cn(styles.wrapper, { [styles.notRootGroupWrapper]: !this.props.root } as any)}>
                <div className={styles.controls}>
                    <Select
                        style={{ width: 150 }}
                        value={this.props.state.combinator}
                        onChange={this.onGroupCombinatorChange}
                        options={combinatorOptions}
                        variant="contained"
                        resettable
                    />

                    <Button
                        variant="text"
                        onClick={this.onAddRule}
                        leftIcon={AddIcon}
                    >
                        Правило
                    </Button>

                    {!this.props.receiverFields ? (
                        <Button
                            variant="text"
                            onClick={this.onAddGroup}
                            leftIcon={AddIcon}
                        >
                            Группу
                        </Button>
                    ) : null}

                    {!this.props.root ? (
                        <Button
                            variant="text"
                            color="error"
                            style={{ marginLeft: 'auto' }}
                            onClick={this.onDeleteGroup}
                        >
                            Удалить
                        </Button>
                    ) : null}
                </div>

                <div className={styles.content}>
                    {this.props.state.rules.map((el, index) => {
                        if (isRule(el)) {
                            return (
                                <Rule
                                    receiverFields={
                                        this.props.receiverFields ? Object.values(this.props.receiverFields) : undefined
                                    }
                                    fieldsMeta={Object.values(this.props.fieldsNameToFieldMeta)}
                                    key={index}
                                    mode={this.props.mode} // <-- передал mode
                                    fieldMeta={
                                        this.props.fieldsNameToFieldMeta[el.fieldName] || {
                                            id: el.fieldName,
                                            value: el.fieldName,
                                            type: 'input',
                                        }
                                    }
                                    storeAccessKey={`${this.props.storeAccessKey}.rules.${index}`}
                                    state={el}
                                    onChange={this.props.onChange}
                                />
                            );
                        }
                        if (isGroup(el)) {
                            return (
                                <Group
                                    receiverFields={this.props.receiverFields}
                                    key={index}
                                    
                                    fieldsNameToFieldMeta={this.props.fieldsNameToFieldMeta}
                                    storeAccessKey={`${this.props.storeAccessKey}.rules.${index}`}
                                    state={el as GroupType}
                                    onChange={this.props.onChange}
                                    mode={this.props.mode} // <-- передал mode
                                />
                            );
                        }

                        return null;
                    })}
                </div>
            </div>
        );
    }
}
