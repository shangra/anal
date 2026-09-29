export type MonthsProps = {
    minDate?: Date;
    maxDate?: Date;
    viewDate: Date;
    onSelectMonth: (monthIndex: number) => void;
    showStartPanel?: () => void;
    showYearsPanel?: () => void;
    testId?: string;
};
