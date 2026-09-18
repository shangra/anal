import { DateValue, DateRangeValue } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";
import { PANELS } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Calendar/constants";

export type Panel = typeof PANELS[keyof typeof PANELS];

export type CalendarProps = {
    viewDate: Date;
    minDate?: Date;
    maxDate?: Date;
    selectedDate: DateValue | DateRangeValue;
    onSelectDate:  ((date: DateValue | DateRangeValue) => void) | undefined;
    testId?: string;
};
