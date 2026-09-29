import { DateValue } from '../../types';
import { isValidDate } from '../../utils';

export const checkDateLimit = (
    checkedDate: Date,
    minDate?: Date,
    maxDate?: Date
) => {
    if (minDate && !maxDate) {
        return checkedDate.getTime() >= minDate.getTime();
    } else if (maxDate && !minDate) {
        return checkedDate.getTime() <= maxDate.getTime();
    } else if (minDate && maxDate) {
        return (
            checkedDate.getTime() >= minDate.getTime() &&
            checkedDate.getTime() <= maxDate.getTime()
        );
    }

    return true;
};

export const isValidDateValue = (
    value: DateValue,
    minDate?: Date,
    maxDate?: Date
) => {
    return isValidDate(value) && checkDateLimit(value, minDate, maxDate);
};

export const getViewDate = (value: DateValue) => (value ? value : new Date());
