import dayjs from 'dayjs';
import { DateValue } from './types';

export const isValidDate = (date: DateValue): date is Date => {
    return date !== null && !!dayjs(date).isValid;
};
