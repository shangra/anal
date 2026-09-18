import { CSSProperties } from "react";
import { DateRangeValue } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";
import { PresetItem } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Presets/types";

export type DateRangePanelProps = {
    value?: DateRangeValue;
    minDate?: Date;
    maxDate?: Date;
    showPresets?: boolean;
    customPresets?: PresetItem[];
    includeDefaultPresets?: boolean;
    className?: string;
    style?: CSSProperties;
    onSelectDate?: (date: DateRangeValue) => void;
    onClose: () => void;
    testId?: string;
};
