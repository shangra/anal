import cn from 'classnames';
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import React, { type ChangeEvent, Component, type ReactNode, useState, useRef } from 'react';
import type { DateRangeValue } from 'ui-kit';
import { CommonInput, type CommonInputProps } from '../../../CommonInput';
import { ErrorBoundary } from '../../../ErrorBoundary';
import { DateRangePicker } from 'ui-kit';
import commonStyle from '../style.module.css';
import { generateLogsFileName } from '../utils';

interface IDateRangeInputProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value?: [string | undefined, string | undefined];
    onChange?: (value: [string | undefined, string | undefined]) => void;
}

const DATE_FORMAT = 'DD.MM.YYYY';

interface DateRangeInputState {
    opened: boolean
}

export class DateRangeInput extends Component<IDateRangeInputProps, DateRangeInputState> {
    private readonly refContainer: React.RefObject<HTMLDivElement>;

    constructor(props: IDateRangeInputProps) {
        super(props);
        dayjs.extend(customParseFormat);
        this.refContainer = useRef<HTMLDivElement>(null);
        this.state = { opened: false };
    }

    private getStartDayjs(): Dayjs | null {
        if (!this.props.value || !this.props.value[0]) return null;
        return dayjs(this.props.value[0]);
    }

    private getEndDayjs(): Dayjs | null {
        if (!this.props.value || !this.props.value[1]) return null;
        return dayjs(this.props.value[1]);
    }

    /**
     * Форматирует значение для отображения в CommonInput
     */
    private getDisplayString(): string | undefined {
        const start = this.getStartDayjs();
        const end = this.getEndDayjs();
        if (!start && !end) return undefined;
        if (start && end) return `${start.format(DATE_FORMAT)} — ${end.format(DATE_FORMAT)}`;
        if (start) return start.format(DATE_FORMAT);
        if (end) return end.format(DATE_FORMAT);
        return undefined;
    }

    /**
     * Обработка клика по кнопке календаря
     */
    onClickDateChange = () => {
        this.setState({ opened: true });
    };

    onClear = () => {
        this.setState({ opened: false });
        this.props.onChange?.([undefined, undefined]);
    };

    /**
     * Обработка выбора диапазона в DateRangePicker
     * @param value - [Date | null, Date | null]
     */
    onSelectDateRange = (value: DateRangeValue) => {
        const [start, end] = value;
        const startIso = start ? dayjs(start).format('YYYY-MM-DDTHH:mm:ss') : undefined;
        const endIso = end ? dayjs(end).format('YYYY-MM-DDTHH:mm:ss') : undefined;
        this.props.onChange?.([startIso, endIso]);
        this.setState({ opened: false });
    };

    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_Inputs_DateRangeInput'),
                }}
            >
                <div className={cn(commonStyle.commonInputWrapper, this.props.containerClassName)} ref={this.refContainer}>
                    <CommonInput
                        {...this.props}
                        value={this.getDisplayString()}
                        dateButton
                        deleteButton
                        onClickDateChange={this.onClickDateChange}
                        onClear={this.onClear}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            // Ручной ввод не поддерживаем для диапазона, открываем календарь
                            this.onClickDateChange();
                        }}
                    />
                    <DateRangePicker
                        value={
                            [
                                this.getStartDayjs()?.toDate() ?? null,
                                this.getEndDayjs()?.toDate() ?? null,
                            ] as DateRangeValue
                        }
                        onChange={this.onSelectDateRange}
                        opened={this.state.opened}
                        onSetOpen={(opened) => this.setState({ opened })}
                    />
                </div>
            </ErrorBoundary>
        );
    }
}
