import { DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";
import { isValidDateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Calendar/utils";

export const getViewDate = (value: DateValue, minDate?: Date, maxDate?: Date) =>
    value && isValidDateValue(value, minDate, maxDate) ? value : new Date();
