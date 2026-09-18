import { DateValue, DateRangeValue } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";

export const EMPTY_DATE: DateValue = null;
export const EMPTY_DATE_RANGE: DateRangeValue = [EMPTY_DATE, EMPTY_DATE];

export const EMPTY_INPUT_VALUE = "";

export const DEFAULT_TEST_ID = "datepicker";

export const DEFAULT_DATE_PLACEHOLDER = "ДД.ММ.ГГ";
export const DEFAULT_DATE_RANGE_PLACEHOLDER = `${DEFAULT_DATE_PLACEHOLDER} - ${DEFAULT_DATE_PLACEHOLDER}`;

export const FORMAT_DATE_STRING = "DD.MM.YYYY";

export const allowedKeyboardKeys = [
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            ':', ' ', '.', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
            'ArrowUp', 'ArrowDown', 'Tab'
        ];
