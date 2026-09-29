import { DateValue } from '../../types';
import { isValidDateValue } from '../Calendar/utils';

export const getViewDate = (value: DateValue, minDate?: Date, maxDate?: Date) =>
    value && isValidDateValue(value, minDate, maxDate) ? value : new Date();
