import dayjs from 'dayjs';
import React, { FC, useState } from 'react';
import { Accordion, AccordionItem, CalendarIcon, DatePicker, DateValue, DeleteIcon, Popover, Select } from 'ui-kit';

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

// возвращает диапазон текущего квартала
const getQuarter = (month: any) => {
    if (month >= 0 && month < 3) return { from: 0, to: 3 };
    if (month >= 3 && month < 6) return { from: 3, to: 6 };
    if (month >= 6 && month < 9) return { from: 6, to: 9 };
    if (month >= 9) return { from: 9, to: 12 };
    return { from: 0, to: 3 };
};

// возвращает диапазон текущего полугодия
const getHalfYear = (month: any) => {
    if (month >= 0 && month < 6) return { from: 0, to: 6 };
    if (month >= 6) return { from: 6, to: 12 };
    return { from: 0, to: 3 };
};

const DATE_ITEMS: (func: any) => AccordionItem[] = (func) => {
    const result = { from: new Date(Date.now()), to: new Date(Date.now()) };
    return [
        {
            title: 'День',
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginLeft: '6px',
                        marginTop: '-8px',
                    }}
                >
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.setDate(result.from.getDate() - 1)),
                                new Date(result.to.setDate(result.to.getDate() - 1)),
                            ])
                        }
                    >
                        Вчера
                    </div>
                    <div style={{ cursor: 'pointer' }} onClick={() => func([result.from, result.to])}>
                        Сегодня
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.setDate(result.from.getDate() + 1)),
                                new Date(result.to.setDate(result.to.getDate() + 1)),
                            ])
                        }
                    >
                        Завтра
                    </div>
                </div>
            ),
        },
        {
            title: 'Неделя',
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginLeft: '6px',
                        marginTop: '-8px',
                    }}
                >
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.setDate(result.from.getDate() - result.from.getDay() - 6)),
                                new Date(result.to.setDate(result.to.getDate() - result.to.getDay())),
                            ])
                        }
                    >
                        Прошлая
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.setDate(result.from.getDate() - result.from.getDay() + 1)),
                                new Date(result.to.setDate(result.to.getDate() - result.to.getDay() + 7)),
                            ])
                        }
                    >
                        Текущая
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.setDate(result.from.getDate() - result.from.getDay() + 8)),
                                new Date(result.to.setDate(result.to.getDate() - result.to.getDay() + 14)),
                            ])
                        }
                    >
                        Следующая
                    </div>
                </div>
            ),
        },
        {
            title: 'Месяц',
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginLeft: '6px',
                        marginTop: '-8px',
                    }}
                >
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), result.from.getMonth() - 1, 1),
                                new Date(result.to.getFullYear(), result.to.getMonth(), 0),
                            ])
                        }
                    >
                        Прошлый
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), result.from.getMonth(), 1),
                                new Date(result.to.getFullYear(), result.to.getMonth() + 1, 0),
                            ])
                        }
                    >
                        Текущий
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), result.from.getMonth() + 1, 1),
                                new Date(result.to.getFullYear(), result.to.getMonth() + 2, 0),
                            ])
                        }
                    >
                        Следующий
                    </div>
                </div>
            ),
        },
        {
            title: 'Квартал',
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginLeft: '6px',
                        marginTop: '-8px',
                    }}
                >
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from - 3, 1),
                                new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to - 3, 0),
                            ])
                        }
                    >
                        Прошлый
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from, 1),
                                new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to, 0),
                            ])
                        }
                    >
                        Текущий
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from + 3, 1),
                                new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to + 3, 0),
                            ])
                        }
                    >
                        Следующий
                    </div>
                </div>
            ),
        },
        {
            title: 'Полугодие',
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginLeft: '6px',
                        marginTop: '-8px',
                    }}
                >
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from - 6, 1),
                                new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to - 6, 0),
                            ])
                        }
                    >
                        Прошлое
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from, 1),
                                new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to, 0),
                            ])
                        }
                    >
                        Текущее
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([
                                new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from + 6, 1),
                                new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to + 6, 0),
                            ])
                        }
                    >
                        Следующее
                    </div>
                </div>
            ),
        },
        {
            title: 'Год',
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginLeft: '6px',
                        marginTop: '-8px',
                    }}
                >
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([new Date(result.from.getFullYear() - 1, 0, 1), new Date(result.to.getFullYear() - 1, 12, 0)])
                        }
                    >
                        Прошлый
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([new Date(result.from.getFullYear(), 0, 1), new Date(result.to.getFullYear(), 12, 0)])
                        }
                    >
                        Текущий
                    </div>
                    <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            func([new Date(result.from.getFullYear() + 1, 0, 1), new Date(result.to.getFullYear() + 1, 12, 0)])
                        }
                    >
                        Следующий
                    </div>
                </div>
            ),
        },
    ];
};

interface IFilterDateProps {
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
    isFirst: boolean;
    type: string;
    autoFocus: boolean;
}

export const FORMAT_DATE_TO_STRING = 'YYYY-MM-DD';

const getFormattedDate = (date: Date | null) => (date ? dayjs(date).format(FORMAT_DATE_TO_STRING) : '');

const FilterDate: FC<IFilterDateProps> = ({
    isFirst,
    onChange: onSelectFilter,
    field,
    container,
    onDeleteFilter: deleteFilter,
    autoFocus,
}) => {
    const [opened, setOpen] = useState<number[]>([]);
    const [filterBy, setFilterBy] = useState<string>(container?.filterBy || '$between');
    const [comparison, setComparison] = useState<string>(container?.comparison || 'or');
    const [date, setDate] = useState<DateValue>(container?.items?.[0]?.value ? new Date(container.items[0].value) : null);
    const [dateFrom, setDateFrom] = useState<DateValue>(
        container?.items?.[0]?.from ? new Date(container.items?.[0].from) : null,
    );
    const [dateTo, setDateTo] = useState<DateValue>(container?.items?.[0]?.to ? new Date(container.items?.[0].to) : null);

    const handleChangeDate: (val: DateValue, which: 'value' | 'from' | 'to') => void = (val, which) => {
        const result: Record<string, any> = { field: field ?? 'date' };

        switch (which) {
            case 'value':
                setDate(val);
                break;
            case 'from':
                setDateFrom(val);
                result.to = getFormattedDate(dateTo);
                break;
            case 'to':
                setDateTo(val);
                result.from = getFormattedDate(dateFrom);
                break;
        }

        const formatDate = getFormattedDate(val);

        result[which] = formatDate;

        onSelectFilter({ id: container.id, items: [result] });
    };

    const handleChangeComparision: (val: string) => void = (val) => {
        setComparison(val);
        onSelectFilter({ id: container.id, comparison: val });
    };

    const handleSelectPreset: (dates: [from: Date, to: Date]) => void = (dates) => {
        const [from, to] = dates;
        setDateFrom(from);
        setDateTo(to);
        const formatDatesFrom = getFormattedDate(from);
        const formatDatesTo = getFormattedDate(to);

        const result: Record<string, any> = { field: field ?? 'date' };

        result.from = formatDatesFrom;
        result.to = formatDatesTo;

        onSelectFilter({ id: container.id, items: [result] });
    };

    const handleChangeFilterBy: (val: string) => void = (val) => {
        setFilterBy(val);
        onSelectFilter({ id: container.id, filterBy: val });
    };

    //! кринж надо обсудить с китом
    const args = {
        minDate: new Date(2015, 1, 1),
        maxDate: new Date(2030, 12, 31),
    };

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
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
                {filterBy === '$between' ? (
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginLeft: '-8px' }}>
                        <Popover
                            style={{ width: '200px' }}
                            content={
                                <Accordion
                                    style={{ marginTop: '8px' }}
                                    items={DATE_ITEMS((v: [from: Date, to: Date]) => handleSelectPreset(v))}
                                    opened={opened}
                                    onSetOpen={setOpen}
                                />
                            }
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', width: '40px' }}>
                                <CalendarIcon size="small" style={{ cursor: 'pointer' }} color="primary" />
                            </div>
                        </Popover>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                marginRight: '8px',
                            }}
                        >
                            <DatePicker
                                {...args}
                                value={dateFrom}
                                onChange={(val) => handleChangeDate(val, 'from')}
                                // @ts-ignore
                                autoFocusInput={autoFocus}
                            />
                            ➜
                            <DatePicker {...args} value={dateTo} onChange={(val) => handleChangeDate(val, 'to')} />
                        </div>
                    </div>
                ) : (
                    <div style={{ marginLeft: '8px' }}>
                        <DatePicker
                            {...args}
                            value={date}
                            onChange={(val) => handleChangeDate(val, 'value')}
                            // @ts-ignore
                            autoFocusInput={autoFocus}
                        />
                    </div>
                )}
            </div>
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

export { FilterDate };
