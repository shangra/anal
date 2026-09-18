import { DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";

export type DayNumber = number | null;

export type DaysProps = {
    minDate?: Date;
    maxDate?: Date;
    viewDate: Date;
    selectedDate?: DateValue | [DateValue, DateValue];
    onSelectDay: (day: number) => void;
    showPrevMonth: () => void;
    showNextMonth: () => void;
    showMonthsPanel: () => void;
    showYearsPanel: () => void;
    disabledPrevMonth?: boolean;
    disabledNextMonth?: boolean;
    testId?: string;
};
