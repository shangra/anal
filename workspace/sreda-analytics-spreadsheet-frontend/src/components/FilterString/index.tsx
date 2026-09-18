import React, { FC, useState } from 'react';
import { ClearIcon, DeleteIcon, Input, Select } from 'ui-kit';

const FILTER_BY_OPTIONS = [
    {
        value: '$eq',
        label: '=',
    },
    {
        value: '$ne',
        label: 'не =',
    },
    {
        value: '$iLike',
        label: '*абв*',
    },
    {
        value: '$notILike',
        label: 'не *абв*',
    },
    // на сервер идет как  iLike: "value%"
    {
        value: '$endsWith',
        label: 'абв*',
    },
    // на сервер идет как  $iLike: "%value
    {
        value: '$startsWith',
        label: '*абв',
    },
];

const COMPARISON_OPTIONS = [
    { value: 'or', label: 'ИЛИ' },
    { value: 'and', label: 'И' },
];

interface IFilterStringProps {
    isFirst: boolean;
    field: string;
    onChange: ({
        id,
        items,
        filterBy,
        comparison,
    }: {
        id: string;
        items?: Record<string, any>;
        filterBy?: string;
        comparison?: string;
    }) => void;
    container: Record<string, any>;
    onDeleteFilter: (id: string) => void;
    autoFocus?: boolean;
}

const FilterString: FC<IFilterStringProps> = ({
    isFirst,
    onChange: onSelectFilter,
    field,
    container,
    onDeleteFilter: deleteFilter,
    autoFocus,
}) => {
    const [comparison, setComparison] = useState<string>(container?.comparison || 'or');

    const [filterBy, setFilterBy] = useState<string>(container?.filterBy || '$eq');

    const [value, setValue] = useState<string>(container.items?.[0]?.value || '');

    const handleChangeComparision: (val: string) => void = (val) => {
        setComparison(val);
        onSelectFilter({ id: container.id, comparison: val });
    };
    const handleChangeFilterBy: (val: string) => void = (val) => {
        setFilterBy(val);
        onSelectFilter({ id: container.id, filterBy: val });
    };

    const handleChangeValue: (val: string) => void = (val) => {
        const result: Record<string, any> = { field: field ?? 'string', value: val };

        setValue(val);

        onSelectFilter({ id: container.id, items: [result] });
    };

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
                <Select
                    testId="orAndSelect"
                    variant="contained"
                    style={{ width: '101px' }}
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
            <Input
                fullWidth
                placeholder="Значение"
                value={value}
                onChange={(e) => handleChangeValue(e.target.value)}
                rightIcon={ClearIcon}
                onClickRightIcon={() => handleChangeValue('')}
                // @ts-ignore
                autoFocusInput={autoFocus}
            />
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

export { FilterString };
