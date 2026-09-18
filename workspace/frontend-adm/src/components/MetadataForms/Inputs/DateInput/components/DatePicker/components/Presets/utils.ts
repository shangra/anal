import { PresetItems , DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";
import { PRESET_ITEMS , END_DATE_TIME, START_DATE_TIME } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Presets/constants";
import { DateValuePreset } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Presets/types";
import dayjs from "dayjs";

export const getRangeToday = (): DateValuePreset => {
    const startDateTime = dayjs().set('hour', START_DATE_TIME.hour)
                             .set('minute', START_DATE_TIME.minute)
                             .set('second', START_DATE_TIME.second)
                             .set('millisecond', START_DATE_TIME.millisecond);
    const endDateTime = dayjs().set('hour', END_DATE_TIME.hour)
                             .set('minute', END_DATE_TIME.minute)
                             .set('second', END_DATE_TIME.second)
                             .set('millisecond', END_DATE_TIME.millisecond);
    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeYesterday = (): DateValuePreset => {
    const startDateTime = dayjs().set('hour', START_DATE_TIME.hour)
                                 .set('minute', START_DATE_TIME.minute)
                                 .set('second', START_DATE_TIME.second)
                                 .set('millisecond', START_DATE_TIME.millisecond)
                                 .subtract(1, 'day');

    const endDateTime = dayjs().set('hour', END_DATE_TIME.hour)
                               .set('minute', END_DATE_TIME.minute)
                               .set('second', END_DATE_TIME.second)
                               .set('millisecond', END_DATE_TIME.millisecond)
                               .subtract(1, 'day');

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeDay = (): DateValuePreset => {
    const endDateTime = dayjs().second(0).millisecond(0);

    const startDateTime = dayjs().subtract(1, 'day').second(0).millisecond(0);

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeWeek = (): DateValuePreset => {
    const startDateTime = dayjs().set('hour', START_DATE_TIME.hour)
                                 .set('minute', START_DATE_TIME.minute)
                                 .set('second', START_DATE_TIME.second)
                                 .set('millisecond', START_DATE_TIME.millisecond)
                                 .subtract(1, 'week');

    const endDateTime = dayjs().set('hour', END_DATE_TIME.hour)
                               .set('minute', END_DATE_TIME.minute)
                               .set('second', END_DATE_TIME.second)
                               .set('millisecond', END_DATE_TIME.millisecond);

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeMonth = (): DateValuePreset => {
    const startDateTime = dayjs().set('hour', START_DATE_TIME.hour)
                                 .set('minute', START_DATE_TIME.minute)
                                 .set('second', START_DATE_TIME.second)
                                 .set('millisecond', START_DATE_TIME.millisecond)
                                 .subtract(1, 'month');

    const endDateTime = dayjs().set('hour', END_DATE_TIME.hour)
                               .set('minute', END_DATE_TIME.minute)
                               .set('second', END_DATE_TIME.second)
                               .set('millisecond', END_DATE_TIME.millisecond);

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeThreeMonth = (): DateValuePreset => {
    const startDateTime = dayjs().set('hour', START_DATE_TIME.hour)
                                 .set('minute', START_DATE_TIME.minute)
                                 .set('second', START_DATE_TIME.second)
                                 .set('millisecond', START_DATE_TIME.millisecond)
                                 .subtract(3, 'month');

    const endDateTime = dayjs().set('hour', END_DATE_TIME.hour)
                               .set('minute', END_DATE_TIME.minute)
                               .set('second', END_DATE_TIME.second)
                               .set('millisecond', END_DATE_TIME.millisecond);

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeAllTime = (
    minDate?: Date,
    maxDate?: Date
): DateValuePreset => {
    const startDateTime = dayjs(minDate || new Date(0))
                                 .set('hour', START_DATE_TIME.hour)
                                 .set('minute', START_DATE_TIME.minute)
                                 .set('second', START_DATE_TIME.second)
                                 .set('millisecond', START_DATE_TIME.millisecond);

    const endDateTime = dayjs(maxDate || new Date())
                               .set('hour', END_DATE_TIME.hour)
                               .set('minute', END_DATE_TIME.minute)
                               .set('second', END_DATE_TIME.second)
                               .set('millisecond', END_DATE_TIME.millisecond);

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeYear = (): DateValuePreset => {
    const startDateTime = dayjs().set('hour', START_DATE_TIME.hour)
                                 .set('minute', START_DATE_TIME.minute)
                                 .set('second', START_DATE_TIME.second)
                                 .set('millisecond', START_DATE_TIME.millisecond)
                                 .subtract(1, 'year');

    const endDateTime = dayjs().set('hour', END_DATE_TIME.hour)
                               .set('minute', END_DATE_TIME.minute)
                               .set('second', END_DATE_TIME.second)
                               .set('millisecond', END_DATE_TIME.millisecond);

    return [startDateTime.toDate(), endDateTime.toDate()];
};

export const getRangeByPresetItem = (
    item?: PresetItems,
    minDate?: Date,
    maxDate?: Date
): DateValuePreset | undefined => {
    switch (item) {
        case PRESET_ITEMS.ALL_TIME:
            return getRangeAllTime(minDate, maxDate);
        case PRESET_ITEMS.DAY:
            return getRangeDay();
        case PRESET_ITEMS.MONTH:
            return getRangeMonth();
        case PRESET_ITEMS.THREE_MONTHS:
            return getRangeThreeMonth();
        case PRESET_ITEMS.TODAY:
            return getRangeToday();
        case PRESET_ITEMS.WEEK:
            return getRangeWeek();
        case PRESET_ITEMS.YEAR:
            return getRangeYear();
        case PRESET_ITEMS.YESTERDAY:
            return getRangeYesterday();
        default:
            return undefined;
    }
};

export const checkEqualDate = (date1: DateValue, date2: DateValue): boolean => {
    const dateTime1 = dayjs(date1);
    const dateTime2 = dayjs(date2);

    return dateTime1.valueOf() === dateTime2.valueOf();
};
