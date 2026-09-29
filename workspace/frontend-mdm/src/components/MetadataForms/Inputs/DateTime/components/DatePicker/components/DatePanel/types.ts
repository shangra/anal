import { DateValue } from '../../types';

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
