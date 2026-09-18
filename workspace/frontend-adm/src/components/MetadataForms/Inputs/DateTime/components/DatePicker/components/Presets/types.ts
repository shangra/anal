import { DateRangeValue, ListOption } from "ui-kit";
import { PresetItems } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";

export type PresetsProps = {
    testId?: string;
    customPresets?: PresetItem[];
    includeDefaultPresets?: boolean;
    onSelectDateRange?: (date: DateRangeValue) => void;
    onSelectDate?: (date: DateValuePreset) => void;
    minDate?: Date;
    maxDate?: Date;
    value?: DateRangeValue;
    optionList?: ListOption<PresetItems>[];
};

export type DateValuePreset = [Date, Date];

export type PresetItem = {
    label: string;
    value: string;
    testId?: string;
    getRange: (minDate?: Date, maxDate?: Date) => DateRangeValue;
};