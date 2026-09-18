import { Button, IconButton, Input, Popover, SearchIcon, Select, type SelectOption } from 'ui-kit';
import { Component, ReactNode } from 'react';
import { Column, ColumnType, FilterCondition, FilterOperator } from '../types';
import style from '../metadataTable.module.css';

// --- helpers ---

const TEXT_OPS: { label: string; value: FilterOperator }[] = [
    { label: 'начинается с', value: 'startsWith' },
    { label: 'заканчивается на', value: 'endsWith' },
    { label: 'равно', value: 'equals' },
    { label: 'не равно', value: 'notEquals' },
    { label: 'содержит', value: 'contains' },
];

const NUMBER_OPS: { label: string; value: FilterOperator }[] = [
    { label: 'равно', value: 'equals' },
    { label: 'не равно', value: 'notEquals' },
    { label: 'больше', value: 'greaterThan' },
    { label: 'меньше', value: 'lessThan' },
    { label: 'больше или равно', value: 'greaterThanOrEqual' },
    { label: 'меньше или равно', value: 'lessThanOrEqual' },
    { label: 'диапазон', value: 'range' },
];

const DATE_OPS: { label: string; value: FilterOperator }[] = [
    { label: 'равно', value: 'equals' },
    { label: 'не равно', value: 'notEquals' },
    { label: 'больше', value: 'greaterThan' },
    { label: 'меньше', value: 'lessThan' },
    { label: 'диапазон', value: 'range' },
];

const BOOLEAN_OPS: { label: string; value: FilterOperator }[] = [{ label: 'равно', value: 'booleanEquals' }];

const REF_OPS: { label: string; value: FilterOperator }[] = [{ label: 'равно', value: 'equals' }];

const UUID_OPS: { label: string; value: FilterOperator }[] = [
    { label: 'равно', value: 'equals' },
    { label: 'не равно', value: 'notEquals' },
];

function getOperators(colType: ColumnType): { label: string; value: FilterOperator }[] {
    switch (colType) {
        case 'string':
            return TEXT_OPS;
        case 'number':
            return NUMBER_OPS;
        case 'date':
            return DATE_OPS;
        case 'boolean':
            return BOOLEAN_OPS;
        case 'ref':
            return REF_OPS;
        case 'uuid':
            return UUID_OPS;
        default:
            return TEXT_OPS;
    }
}

function getDefaultOp(colType: ColumnType): FilterOperator {
    return getOperators(colType)[0].value;
}

// --- locale for number input ---
function parseLocaleNumber(raw: string): string {
    // allow both dot and comma as decimal separator
    return raw.replace(',', '.');
}

// --- Component ---

interface FilterPopoverProps {
    column: Column;
    columnType: ColumnType;
    currentFilter?: FilterCondition;
    refOptions?: { value: string; label: string }[];
    onApply: (condition: FilterCondition | null) => void;
}

interface FilterPopoverState {
    operator: FilterOperator;
    value: string;
    valueTo: string;
}

export class FilterPopover extends Component<FilterPopoverProps, FilterPopoverState> {
    constructor(props: FilterPopoverProps) {
        super(props);
        const f = props.currentFilter;
        this.state = {
            operator: f?.operator ?? getDefaultOp(props.columnType),
            value: f?.value ?? '',
            valueTo: f?.valueTo ?? '',
        };
    }

    private handleOperatorChange = (op: FilterOperator | null): void => {
        if (op === null) return;
        const _ops = getOperators(this.props.columnType);
        const needsValueTo = op === 'range';
        this.setState((prev) => ({
            operator: op,
            valueTo: needsValueTo ? prev.valueTo : '',
        }));
    };

    private handleApply = (): void => {
        const { operator, value, valueTo } = this.state;
        const trimmed = value.trim();
        if (!trimmed && operator !== 'booleanEquals') {
            this.props.onApply(null);
            return;
        }
        this.props.onApply({
            field: this.props.column.field,
            operator,
            value: trimmed,
            valueTo: operator === 'range' ? valueTo.trim() : undefined,
        });
    };

    private handleClear = (): void => {
        this.setState({
            operator: getDefaultOp(this.props.columnType),
            value: '',
            valueTo: '',
        });
        this.props.onApply(null);
    };

    private renderInputs(): ReactNode {
        const { columnType, refOptions } = this.props;
        const { operator, value, valueTo } = this.state;

        if (columnType === 'boolean') {
            const boolOpts: SelectOption<string>[] = [
                { label: 'Да', value: 'true' },
                { label: 'Нет', value: 'false' },
            ];
            return (
                <Select<string, false>
                    value={value || 'true'}
                    resettable={false}
                    options={boolOpts}
                    onChange={(v) => this.setState({ value: v ?? 'true' })}
                />
            );
        }

        if (columnType === 'ref' && refOptions) {
            const allRefOpts: SelectOption<string>[] = [...refOptions.map((r) => ({ label: r.label, value: r.value }))];
            return (
                <Select<string, false>
                    value={value}
                    resettable={false}
                    options={allRefOpts}
                    onChange={(v) => this.setState({ value: v ?? '' })}
                />
            );
        }

        if (operator === 'range' && columnType === 'number') {
            return (
                <div className={style.filterRow}>
                    <Input
                        value={value}
                        type="number"
                        placeholder="от"
                        onChange={(e) => this.setState({ value: e.target.value })}
                    />
                    <span>—</span>
                    <Input
                        value={valueTo}
                        type="number"
                        placeholder="до"
                        onChange={(e) => this.setState({ valueTo: e.target.value })}
                    />
                </div>
            );
        }

        if (operator === 'range') {
            return (
                <div className={style.filterRow}>
                    <Input value={value} placeholder="от" onChange={(e) => this.setState({ value: e.target.value })} />
                    <span>—</span>
                    <Input value={valueTo} placeholder="до" onChange={(e) => this.setState({ valueTo: e.target.value })} />
                </div>
            );
        }

        if (columnType === 'date') {
            return <Input value={value} placeholder="гггг-мм-дд" onChange={(e) => this.setState({ value: e.target.value })} />;
        }

        if (columnType === 'number') {
            return (
                <Input
                    type="number"
                    value={value}
                    placeholder="0"
                    onChange={(e) => this.setState({ value: parseLocaleNumber(e.target.value) })}
                />
            );
        }

        // default: text
        return <Input value={value} placeholder="значение" onChange={(e) => this.setState({ value: e.target.value })} />;
    }

    render(): ReactNode {
        const { column, columnType } = this.props;
        const { operator } = this.state;
        const ops = getOperators(columnType);

        const content = (
            <div className={style.popoverContent}>
                <div className={style.popoverTitle}>{column.name}</div>

                <Select<FilterOperator, false>
                    value={operator}
                    resettable={false}
                    options={ops.map((o) => ({ label: o.label, value: o.value }))}
                    onChange={this.handleOperatorChange}
                />

                {this.renderInputs()}

                <div className={style.popoverActions}>
                    <Button size="small" variant="outlined" onClick={this.handleClear}>
                        Сбросить
                    </Button>
                    <Button size="small" onClick={this.handleApply}>
                        Применить
                    </Button>
                </div>
            </div>
        );

        const hasFilter = !!this.props.currentFilter;

        return (
            <Popover content={content} placement="bottom-start" offset={4} closeOnOutsideClick>
                <IconButton
                    icon={SearchIcon}
                    size="small"
                    variant="text"
                    className={style.filterIconBtn}
                    style={{
                        opacity: hasFilter ? 1 : 0.4,
                        color: hasFilter ? 'var(--color-primary, #1976d2)' : undefined,
                    }}
                />
            </Popover>
        );
    }
}
