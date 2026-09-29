export type YearsProps = {
    selectedYear?: number;
    minYear?: number;
    maxYear?: number;
    viewDate: Date;
    onSelectYear: (year: number) => void;
    showStartPanel?: () => void;
    showMonthsPanel?: () => void;
    testId?: string;
};
