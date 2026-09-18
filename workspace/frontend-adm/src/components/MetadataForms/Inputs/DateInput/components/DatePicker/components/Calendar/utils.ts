import { DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";
import { isValidDate } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/utils";

export const checkDateLimit = (
    checkedDate: Date,
    minDate?: Date,
    maxDate?: Date
) => {
    if (minDate && !maxDate) {
        return checkedDate.getTime() >= minDate.getTime();
    } if (maxDate && !minDate) {
        return checkedDate.getTime() <= maxDate.getTime();
    } if (minDate && maxDate) {
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
) => isValidDate(value) && checkDateLimit(value, minDate, maxDate);

export const getViewDate = (value: DateValue) => (value || new Date());
