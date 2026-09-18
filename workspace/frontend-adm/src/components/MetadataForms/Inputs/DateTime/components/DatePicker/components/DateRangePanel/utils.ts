import { DateRangeValue } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";
import { isValidDateValue } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Calendar/utils";

export const getViewDate = (
    value: DateRangeValue,
    minDate?: Date,
    maxDate?: Date
) =>
    value[0] && isValidDateValue(value[0], minDate, maxDate)
        ? value[0]
        : new Date();
