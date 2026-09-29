import { DateRangeValue } from '../../types';
import { isValidDateValue } from '../Calendar/utils';

export const getViewDate = (
    value: DateRangeValue,
    minDate?: Date,
    maxDate?: Date
) =>
    value[0] && isValidDateValue(value[0], minDate, maxDate)
        ? value[0]
        : new Date();
