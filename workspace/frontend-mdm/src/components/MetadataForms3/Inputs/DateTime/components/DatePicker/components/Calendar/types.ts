import { DateValue, DateRangeValue } from '../../types';
import { PANELS } from './constants';

export type Panel = (typeof PANELS)[keyof typeof PANELS];

export type CalendarProps = {
    viewDate: Date;
    minDate?: Date;
    maxDate?: Date;
    selectedDate: DateValue | DateRangeValue;
    onSelectDate: ((date: DateValue | DateRangeValue) => void) | undefined;
    testId?: string;
};
