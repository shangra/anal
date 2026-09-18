import { DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";

export type DateTimeProps = {
    value: DateValue;
    minDate?: Date;
    maxDate?: Date;
    className?: string;
    style?: React.CSSProperties;
    onSelectDate?: (date: DateValue) => void;
    onClose: () => void;
    testId?: string;
};
