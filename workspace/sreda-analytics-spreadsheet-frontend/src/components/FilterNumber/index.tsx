/* eslint-disable no-nested-ternary */
import React, { FC, useEffect, useState } from 'react';
import { ClearIcon, DeleteIcon, Input, Select } from 'ui-kit';

const FILTER_BY_OPTIONS = [
    { value: '$between', label: '[a;b]' },
    { value: '$eq', label: '=' },
    { value: '$ne', label: 'не =' },
    { value: '$gt', label: '>' },
    { value: '$gte', label: '>=' },
    { value: '$lt', label: '<' },
    { value: '$lte', label: '<=' },
];

const COMPARISON_OPTIONS = [
    { value: 'or', label: 'ИЛИ' },
    { value: 'and', label: 'И' },
];

type TFilterNumberItem = {
    field: string;
    from?: number | string | null;
    to?: number | string | null;
    value?: number | string | null;
};

interface IFilterNumberProps {
    isFirst: boolean;
    field: string;
    onChange: ({
        id,
        items,
        filterBy,
        comparison,
    }: {
        id: string;
        items?: TFilterNumberItem[];
        filterBy?: string;
        comparison?: string;
    }) => void;
    container: Record<string, any>;
    onDeleteFilter: (id: string) => void;
    type: string;
    autoFocus?: boolean;
}

/** Превращает переданное значение в строку для внутреннего использования (с точкой как десятичным разделителем) */
const toDisplayString = (val: unknown): string => {
    if (val === undefined || val === null || val === '') return '';
    return String(val);
};

/**
 * Конвертирует строку в число или строку (для больших чисел, выходящих за пределы
 * Number.MAX_SAFE_INTEGER, когда приведение к number приводит к потере точности).
 * Возвращает null для пустых/незавершённых значений.
 */
const toNumberOrStringOrNull = (val: string): number | string | null => {
    if (val === '' || val === '-') return null;
    if (/\.$/.test(val)) return null;
    const num = Number(val);
    if (!Number.isFinite(num)) return null;
    // Если строковое представление числа после конвертации не совпадает с исходным,
    // значит произошла потеря точности — возвращаем исходную строку
    if (String(num) !== val) return val;
    return num;
};

const FilterNumber: FC<IFilterNumberProps> = ({
    isFirst,
    onChange: onSelectFilter,
    field,
    container,
    onDeleteFilter: deleteFilter,
    type,
    autoFocus,
}) => {
    const item = container?.items?.[0] ?? {};

    const [comparison, setComparison] = useState<string>(container?.comparison ?? 'or');
    const [filterBy, setFilterBy] = useState<string>(container?.filterBy ?? '$between');
    const [from, setFrom] = useState<string>(toDisplayString(item.from));
    const [to, setTo] = useState<string>(toDisplayString(item.to));
    const [value, setValue] = useState<string>(toDisplayString(item.value));

    // Синхронизация с внешним контейнером (если он изменился извне)
    useEffect(() => {
        setComparison(container?.comparison ?? 'or');
        setFilterBy(container?.filterBy ?? '$between');

        const extFrom = item.from ?? null;
        const extTo = item.to ?? null;
        const extValue = item.value ?? null;

        setFrom((old) =>
            toDisplayString(toNumberOrStringOrNull(old)) === toDisplayString(extFrom) ? old : toDisplayString(extFrom),
        );
        setTo((old) =>
            toDisplayString(toNumberOrStringOrNull(old)) === toDisplayString(extTo) ? old : toDisplayString(extTo),
        );
        setValue((old) =>
            toDisplayString(toNumberOrStringOrNull(old)) === toDisplayString(extValue) ? old : toDisplayString(extValue),
        );
    }, [container?.comparison, container?.filterBy, item.from, item.to, item.value]);

    /** Формирует items с числовыми значениями */
    const buildItems = (
        currentFilterBy: string,
        currentFrom: string,
        currentTo: string,
        currentValue: string,
    ): TFilterNumberItem[] => {
        const result: TFilterNumberItem = { field };

        if (currentFilterBy === '$between') {
            result.from = toNumberOrStringOrNull(currentFrom);
            result.to = toNumberOrStringOrNull(currentTo);
        } else {
            result.value = toNumberOrStringOrNull(currentValue);
        }
        return [result];
    };

    const handleChangeComparision = (val: string) => {
        setComparison(val);

        onSelectFilter({
            id: container.id,
            comparison: val,
            items: buildItems(filterBy, from, to, value),
        });
    };

    const handleChangeFilterBy = (val: string) => {
        const wasBetween = filterBy === '$between';
        const willBeBetween = val === '$between';

        let newFrom = from;
        let newTo = to;
        let newValue = value;

        if (wasBetween && !willBeBetween) {
            newValue = '';
            setValue('');
        } else if (!wasBetween && willBeBetween) {
            newFrom = '';
            newTo = '';
            setFrom('');
            setTo('');
        }

        setFilterBy(val);

        onSelectFilter({
            id: container.id,
            filterBy: val,
            items: buildItems(val, newFrom, newTo, newValue),
        });
    };

    const handleChangeValue = (newValue: string, position: 'from' | 'to' | 'value') => {
        const isFloat = type === 'float';
        const pattern = isFloat ? /^-?\d*([.,]\d*)?$/ : /^-?\d*$/;

        const normalized = newValue.replace(',', '.');
        const isCorrect = pattern.test(normalized);

        if (!isCorrect) return;

        if (position === 'from') {
            setFrom(normalized);
        } else if (position === 'to') {
            setTo(normalized);
        } else {
            setValue(normalized);
        }

        const currentFrom = position === 'from' ? normalized : from;
        const currentTo = position === 'to' ? normalized : to;
        const currentValue = position === 'value' ? normalized : value;

        onSelectFilter({
            id: container.id,
            items: buildItems(filterBy, currentFrom, currentTo, currentValue),
        });
    };

    return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            {!isFirst && (
                <Select
                    testId="orAndSelect"
                    variant="contained"
                    style={{ width: '101px', overflowX: 'hidden' }}
                    value={comparison}
                    onChange={handleChangeComparision}
                    options={COMPARISON_OPTIONS}
                    resettable={false}
                    hasSearch={false}
                />
            )}
            <Select
                variant="contained"
                style={{ width: '101px' }}
                value={filterBy}
                onChange={handleChangeFilterBy}
                options={FILTER_BY_OPTIONS}
                resettable={false}
                hasSearch={false}
            />

            {filterBy === '$between' ? (
                <>
                    <Input
                        prefix="От"
                        value={from.replace('.', ',')}
                        onChange={(e) => handleChangeValue(e.target.value, 'from')}
                        rightIcon={ClearIcon}
                        onClickRightIcon={() => handleChangeValue('', 'from')}
                        // @ts-ignore
                        autoFocusInput={autoFocus}
                    />
                    <Input
                        prefix="До"
                        value={to.replace('.', ',')}
                        onChange={(e) => handleChangeValue(e.target.value, 'to')}
                        rightIcon={ClearIcon}
                        onClickRightIcon={() => handleChangeValue('', 'to')}
                    />
                </>
            ) : (
                <Input
                    fullWidth
                    placeholder="Значение"
                    value={value.replace('.', ',')}
                    onChange={(e) => handleChangeValue(e.target.value, 'value')}
                    rightIcon={ClearIcon}
                    onClickRightIcon={() => handleChangeValue('', 'value')}
                    // @ts-ignore
                    autoFocusInput={autoFocus}
                />
            )}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px', height: '32px' }}>
                <DeleteIcon
                    testId="delete-icon"
                    size="small"
                    style={{ cursor: 'pointer' }}
                    color="error"
                    onClick={() => deleteFilter(container.id)}
                />
            </div>
        </div>
    );
};

export { FilterNumber };
