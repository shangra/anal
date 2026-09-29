import { useState } from 'react';
import { DEFAULT_TEST_ID } from './constants';
import { EMPTY_DATE } from '../../constants';
import { DateRangeValue, DateValue } from '../../types';
import { DateTimeProps } from './types';
import { getViewDate } from './utils';
import { Calendar } from '../Calendar';
import cn from 'classnames';
import styles from './styles/styles.module.css';

export const DatePanel = (props: DateTimeProps) => {
    const {
        value,
        minDate,
        maxDate,
        className,
        style,
        onSelectDate,
        testId = DEFAULT_TEST_ID,
        onClose,
    } = props;

    const [selectedDate, setSelectedDate] = useState<DateValue>(
        value || EMPTY_DATE
    );

    const handleApply = (date: DateValue | DateRangeValue) => {
        if (!Array.isArray(date)) {
            setSelectedDate(date);
            onSelectDate?.(date);
        }
    };
    const panelClassName = cn(styles['date-panel-container'], className);

    return (
        <div className={panelClassName} style={style} data-test-id={testId}>
            <Calendar
                viewDate={getViewDate(selectedDate, minDate, maxDate)}
                minDate={minDate}
                maxDate={maxDate}
                selectedDate={selectedDate}
                onSelectDate={handleApply}
                testId={`${testId}-calendar`}
            />
        </div>
    );
};
