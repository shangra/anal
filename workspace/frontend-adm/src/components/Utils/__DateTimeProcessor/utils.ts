import dayjs from 'dayjs';

export const getTimezone = (dateInString: string | null) =>
    dateInString
        ?.split(':')
        .at(-1)
        ?.split('')
        .filter((char) => /[a-zA-Z]/.test(char))
        .join('');

export const dateConvertToNeedFormat = (dateInString: string | null, needFormat: string = 'DD.MM.YYYY[,] HH:mm:ss.SSS') =>
    dateInString === null ? dateInString : dayjs(new Date(dateInString)).format(needFormat);
