import { useState } from "react";
import { Days } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Days";
import { Months } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Months";
import { Years } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Years";
import { DEFAULT_TEST_ID, PANELS } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Calendar/constants";
import { CalendarProps, Panel } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Calendar/types";
import { checkDateLimit } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Calendar/utils";

export const Calendar = (props: CalendarProps) => {
    const {
        viewDate: initialViewDate,
        selectedDate,
        minDate,
        maxDate,
        onSelectDate,
        testId = DEFAULT_TEST_ID,
    } = props;

    const [panel, setPanel] = useState<Panel>(PANELS.DAYS);

    const [viewDate, setViewDate] = useState<Date>(initialViewDate);

    const setDaysPanel = () => {
        setPanel(PANELS.DAYS);
    };

    const setMonthsPanel = () => {
        setPanel(PANELS.MONTHS);
    };

    const setYearsPanel = () => {
        setPanel(PANELS.YEARS);
    };

    const handleSelectMonth = (month: number) => {
        setViewDate(new Date(viewDate.getFullYear(), month));
        setDaysPanel();
    };

    const setPrevMonth = () => {
        handleSelectMonth(viewDate.getMonth() - 1);
    };

    const setNextMonth = () => {
        handleSelectMonth(viewDate.getMonth() + 1);
    };

    const handleSelectYear = (year: number) => {
        setViewDate(new Date(year, viewDate.getMonth()));
        setDaysPanel();
    };

    const handleSelectDay = (day: number) => {
        const newDate = new Date(
            viewDate.getFullYear(),
            viewDate.getMonth(),
            day
        );
        
        onSelectDate?.(newDate);
    };

    const isDisabledMonthSwitch = (monthStep: number) => {
        if (minDate || maxDate) {
            const minMonth =
                minDate &&
                new Date(minDate?.getFullYear(), minDate?.getMonth());

            const maxMonth =
                maxDate &&
                new Date(maxDate?.getFullYear(), maxDate?.getMonth());

            const checkedMonth = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth() - monthStep
            );

            return !checkDateLimit(checkedMonth, minMonth, maxMonth);
        }

        return false;
    };

    const getPanel = () => {
        switch (panel) {
            case PANELS.DAYS:
                return (
                    <Days
                        minDate={minDate}
                        maxDate={maxDate}
                        viewDate={viewDate}
                        selectedDate={selectedDate}
                        testId={`${testId}-days`}
                        onSelectDay={handleSelectDay}
                        showPrevMonth={setPrevMonth}
                        showNextMonth={setNextMonth}
                        showMonthsPanel={setMonthsPanel}
                        showYearsPanel={setYearsPanel}
                        disabledPrevMonth={isDisabledMonthSwitch(1)}
                        disabledNextMonth={isDisabledMonthSwitch(-1)}
                    />
                );
            case PANELS.MONTHS:
                return (
                    <Months
                        minDate={minDate}
                        maxDate={maxDate}
                        viewDate={viewDate}
                        testId={`${testId}-months`}
                        showStartPanel={setDaysPanel}
                        showYearsPanel={setYearsPanel}
                        onSelectMonth={handleSelectMonth}
                    />
                );
            case PANELS.YEARS:
                return (
                    <Years
                        selectedYear={viewDate.getFullYear()}
                        minYear={minDate?.getFullYear()}
                        viewDate={viewDate}
                        maxYear={maxDate?.getFullYear()}
                        testId={`${testId}-years`}
                        onSelectYear={handleSelectYear}
                        showStartPanel={setDaysPanel}
                        showMonthsPanel={setMonthsPanel}
                    />
                );
            default:
                return null;
        }
    };

    return getPanel();
};
