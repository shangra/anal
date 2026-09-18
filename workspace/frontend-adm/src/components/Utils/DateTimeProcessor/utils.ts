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

export function formatDate(date: Date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

export function formatDateTime(value: string, options?: {
    dateDivider?: string;
    dateTimeDivider?: string;
    timeDivider?: string;
}): string {
    const { dateDivider, dateTimeDivider = ' ', timeDivider = ':' } = options ?? {
        dateDivider: '.',
        dateTimeDivider: ' ',
        timeDivider: ':'
    };

    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        
        // Формат: день.месяц.год часы:минуты:секунды
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        const resultDate = [day, month, year].join(dateDivider)
        const resultTime = [hours, minutes, seconds].join(timeDivider)

        return resultDate + dateTimeDivider + resultTime;
    } catch (e) {
        console.error('Failed to format date', e);
        return value;
    }
}
