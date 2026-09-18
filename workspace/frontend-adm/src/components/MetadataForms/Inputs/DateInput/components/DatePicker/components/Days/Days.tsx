import cn from "classnames";
import { LeftIcon, RightIcon, Button, Stack } from "ui-kit";
import { checkDateLimit } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Calendar/utils";
import {
    getWeeksOfMonth,
    isSameDates,
    isSameMonths,
    isRangeMode,
} from "./utils";
import { WEEKDAYS, MONTHS_NAMES, DEFAULT_TEST_ID } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Days/constants";
import { DayNumber, DaysProps } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Days/types";
import { Day } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Days/components";

import styles from './styles/styles.module.css'

export const Days = (props: DaysProps) => {
    const {
        minDate,
        maxDate,
        viewDate,
        selectedDate,
        onSelectDay,
        showPrevMonth,
        showNextMonth,
        showMonthsPanel,
        showYearsPanel,
        disabledPrevMonth = false,
        disabledNextMonth = false,
        testId = DEFAULT_TEST_ID,
    } = props;

    const today = new Date();
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const monthWeeks = getWeeksOfMonth(viewYear, viewMonth);

    const isRange = isRangeMode(selectedDate);

    const viewMonthIsSelected = isRange
        ? selectedDate.some(date => date && isSameMonths(viewDate, date))
        : selectedDate && isSameMonths(viewDate, selectedDate);

    const handleSelectDay = (day: DayNumber) => {
        if (day) {
            onSelectDay(day);
        }
    };

    const isCurrentDay = (day: DayNumber) => {
        if (day && isSameMonths(today, viewDate)) {
            const checkedDate = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth(),
                day
            );

            return isSameDates(checkedDate, today);
        }

        return false;
    };

    const isSelectedDay = (day: DayNumber) => {
        if (day && viewMonthIsSelected) {
            const checkedDate = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth(),
                day
            );

            return isRange
                ? selectedDate.some(
                      date => date && isSameDates(date, checkedDate)
                  )
                : Boolean(
                      selectedDate && isSameDates(selectedDate, checkedDate)
                  );
        }

        return false;
    };

    const isDisabledDay = (day: DayNumber) => {
        if (day) {
            const checkedDate = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth(),
                day
            );
            return !checkDateLimit(checkedDate, minDate, maxDate);
        }

        return false;
    };

    const getRangeStatusOfDay = (day: DayNumber) => {
        if (day && isRange) {
            const [startDay, endDay] = selectedDate;
            const isFilledRange = startDay && endDay;
            const isOneDayRange =
                isFilledRange && isSameDates(startDay, endDay);
            const checkedDate = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth(),
                day
            );

            return {
                starting: Boolean(
                    isFilledRange &&
                        !isOneDayRange &&
                        isSameDates(startDay, checkedDate)
                ),
                ranging: Boolean(
                    startDay &&
                        startDay < checkedDate &&
                        endDay &&
                        endDay > checkedDate
                ),
                ending: Boolean(
                    isFilledRange &&
                        !isOneDayRange &&
                        isSameDates(endDay, checkedDate)
                ),
            };
        }

        return {};
    };

    const arrowLeftClassName = cn(
        styles.arrow,
        {[styles.arrow_disabled]: disabledPrevMonth,}
    );
    const arrowRightClassName = cn(
        styles.arrow,
        {[styles.arrow_disabled]: disabledNextMonth,}
    );
    const weekdayClassName = cn(
        "subtitle2",
        styles.weekday,
    )
    const monthClassName = cn(
        "body",
        styles['month-name'],
    );

    return (
        <div className={styles.container} data-test-id={testId}>
            <div className={styles["nav-container"]}>
                <Stack style={{width: '100%'}} direction="row" gap="16px" alignItems="center" justifyContent='space-between'>
                    <LeftIcon
                        testId={`${testId}-prev-month`}
                        onClick={showPrevMonth}
                        className={arrowLeftClassName}
                        size="small"
                    />
                    <Stack>
                        <Button
                            variant="text"
                            size="small"
                            color="primary"
                            type="button"
                            data-test-id={`${testId}-select-month`}
                            className={monthClassName}
                            onClick={showMonthsPanel}
                        >
                            {MONTHS_NAMES[viewMonth]}
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            color="primary"
                            type="button"
                            data-test-id={`${testId}-select-year`}
                            onClick={showYearsPanel}
                        >
                            {viewYear}
                        </Button>
                    </Stack>
                    <RightIcon
                        testId={`${testId}-next-month`}
                        onClick={showNextMonth}
                        className={arrowRightClassName}
                        size="small"
                    />
                </Stack>
            </div>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {WEEKDAYS.map(weekday => (
                            <th key={weekday} className={weekdayClassName}>{weekday}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {monthWeeks.map((week, index) => (
                        <tr key={`week-${index}`}>
                            {week.map((day, dayIndex) => {
                                const {starting, ending, ranging} = getRangeStatusOfDay(day);
                                const isFirstInRow = dayIndex === 0;
                                const isLastInRow = dayIndex === week.length - 1;
                                return <td key={`day-${dayIndex}`} className={styles.td}>
                                            <Day
                                                today={isCurrentDay(day)}
                                                disabled={isDisabledDay(day)}
                                                selected={isSelectedDay(day)}
                                                empty={day === null}
                                                onClick={() => handleSelectDay(day)}
                                                starting={starting}
                                                ending={ending}
                                                ranging={ranging}
                                                isFirstInRow={isFirstInRow}
                                                isLastInRow={isLastInRow}
                                            >
                                        {day}
                                    </Day>
                                </td>
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
