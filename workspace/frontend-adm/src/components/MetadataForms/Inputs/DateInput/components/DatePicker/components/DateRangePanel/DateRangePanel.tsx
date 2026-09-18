import { useState } from "react";
import dayjs from 'dayjs';
import { Stack } from "ui-kit";
import { DEFAULT_TEST_ID } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/DateRangePanel/constants";
import { EMPTY_DATE, EMPTY_DATE_RANGE } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/constants";
import { END_DATE_TIME, START_DATE_TIME } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Presets/constants";
import { DateRangePanelProps } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/DateRangePanel/types";
import { getViewDate } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/DateRangePanel/utils";
import { isValidDate } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/utils";
import { DateRangeValue, DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";
import { DateValuePreset } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Presets/types";
import { Calendar } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Calendar";
import { Presets } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Presets";


export const DateRangePanel = (props: DateRangePanelProps) => {
    const {
        value,
        minDate,
        maxDate,
        showPresets,
        includeDefaultPresets,
        className,
        style,
        onSelectDate,
        testId = DEFAULT_TEST_ID,
        onClose,
        customPresets,
    } = props;

    const [selectedDateRange, setSelectedDateRange] = useState<DateRangeValue>(
        value || EMPTY_DATE_RANGE
    );

    const handleSelectDate = (newDate: DateValue | DateRangeValue) => {
        if (!Array.isArray(newDate) && newDate) {
            let dateRange: DateRangeValue;
            const [startDate, endDate] = selectedDateRange;
    
            const isValidStartDate = isValidDate(startDate);
            const isValidEndDate = isValidDate(endDate);
    
            const newDateWithEndTime = dayjs(newDate)
                .set('hour', END_DATE_TIME.hour)
                .set('minute', END_DATE_TIME.minute)
                .set('second', END_DATE_TIME.second)
                .toDate();
            const newDateWithStartTime = dayjs(newDate)
                .set('hour', START_DATE_TIME.hour)
                .set('minute', START_DATE_TIME.minute)
                .set('second', START_DATE_TIME.second)
                .toDate();
    
            if (isValidStartDate && isValidEndDate) {
                dateRange = [newDateWithStartTime, EMPTY_DATE];
            } else if (isValidStartDate) {
                dateRange = [startDate, newDateWithEndTime];
                onClose();
            } else {
                dateRange = [newDateWithStartTime, EMPTY_DATE];
            }
    
            if (dayjs(dateRange[0]).isAfter(dayjs(dateRange[1]))) {
                dateRange = [dateRange[1], dateRange[0]];
            }
            setSelectedDateRange(dateRange);
            onSelectDate?.(dateRange);
        }
    };
    const onSelectPreset = (dateRange: DateValuePreset) => {
        onSelectDate?.(dateRange);
        onClose();
    };

    return (
            <Stack
                direction="row"
                gap="12px"
                data-test-id={`date-range-panel-${testId}`}
                style={style}
                className={className}
            >
                {showPresets && 
                    <Presets
                        testId={`${testId}-presets`}
                        value={selectedDateRange}
                        onSelectDateRange={setSelectedDateRange}
                        onSelectDate={onSelectPreset}
                        maxDate={maxDate}
                        minDate={minDate}
                        customPresets={customPresets}
                        includeDefaultPresets={includeDefaultPresets}
                    />
                }
                <Calendar
                    viewDate={getViewDate(selectedDateRange, minDate, maxDate)}
                    minDate={minDate}
                    maxDate={maxDate}
                    selectedDate={selectedDateRange}
                    onSelectDate={handleSelectDate}
                    testId={`${testId}-calendar`}
                />
            </Stack>
        
    );
};
