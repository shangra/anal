import { PresetItem } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Presets/types";
import {
    getRangeAllTime,
    getRangeYear,
    getRangeThreeMonth,
    getRangeMonth,
    getRangeWeek,
    getRangeYesterday,
    getRangeToday,
    getRangeDay,
} from "./utils";

export const START_DATE_TIME = {
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
};

export const END_DATE_TIME = {
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
};

export const DEFAULT_TEST_ID = "presets";

export const PRESET_ITEMS = {
    ALL_TIME: 'all_time',
    YEAR: 'year',
    THREE_MONTHS: 'three_months',
    MONTH: 'month',
    WEEK: 'week',
    YESTERDAY: 'yesterday',
    TODAY: 'today',
    DAY: 'day',
}


export const DEFAULT_PRESETS: PresetItem[] = [
    {
        label: "За все время",
        value: PRESET_ITEMS.ALL_TIME,
        testId: "all-time",
        getRange: (minDate, maxDate)=>getRangeAllTime(minDate, maxDate),
    },
    {
        label: "Год",
        value: PRESET_ITEMS.YEAR,
        testId: "year",
        getRange: () => getRangeYear(),
    },
    {
        label: "3 месяца",
        value: PRESET_ITEMS.THREE_MONTHS,
        testId: "three-months",
        getRange: () => getRangeThreeMonth(),
    },
    {
        label: "Месяц",
        value: PRESET_ITEMS.MONTH,
        testId: "month",
        getRange: () => getRangeMonth(),
    },
    {
        label: "Неделя",
        value: PRESET_ITEMS.WEEK,
        testId: "week",
        getRange: () => getRangeWeek(),
    },
    {
        label: "Вчера",
        value: PRESET_ITEMS.YESTERDAY,
        testId: "yesterday",
        getRange: () => getRangeYesterday(),
    },
    {
        label: "Сегодня",
        value: PRESET_ITEMS.TODAY,
        testId: "today",
        getRange: () => getRangeToday(),
    },
    {
        label: "Сутки",
        value: PRESET_ITEMS.DAY,
        testId: "day",
        getRange: () => getRangeDay(),
    },
];
