/**
 * Парсер и генератор cron-выражений для UI-формы расписания.
 *
 * Структура scheduleObject повторяет модель из старого `panel/.../ScheduleCMP`:
 *  - поля second/minute/hour + typeX (0 = каждые N, 1 = раз в N)
 *  - weekdays: 7 булевых флагов (Пн..Вс)
 *  - months: 12 булевых флагов
 *  - days: массив длиной 31 с булевыми флагами дней месяца
 *
 * Поддерживает 5- и 6-позиционный cron (5-позиционный автоматически получает
 * seconds=0 — стандартный cron без секунд).
 */

export type Flag = 0 | 1;

export interface ScheduleObject {
    second: number;
    minute: number;
    hour: number;

    typeSecond: Flag;
    typeMinute: Flag;
    typeHour: Flag;

    monday: Flag;
    tuesday: Flag;
    wednesday: Flag;
    thursday: Flag;
    friday: Flag;
    saturday: Flag;
    sunday: Flag;

    January: Flag;
    February: Flag;
    March: Flag;
    April: Flag;
    May: Flag;
    June: Flag;
    July: Flag;
    August: Flag;
    September: Flag;
    October: Flag;
    November: Flag;
    December: Flag;

    days: Array<boolean>;
}

export const WEEKDAY_NAMES_RU = [
    'понедельник',
    'вторник',
    'среда',
    'четверг',
    'пятница',
    'суббота',
    'воскресенье',
] as const;

export const MONTH_NAMES_RU = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
] as const;

const WEEKDAY_KEYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;

const MONTH_KEYS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const;

export const getDefaultSchedule = (): ScheduleObject => ({
    second: 0,
    minute: 0,
    hour: 0,

    typeSecond: 0,
    typeMinute: 0,
    typeHour: 0,

    monday: 1,
    tuesday: 1,
    wednesday: 1,
    thursday: 1,
    friday: 1,
    saturday: 1,
    sunday: 1,

    January: 1,
    February: 1,
    March: 1,
    April: 1,
    May: 1,
    June: 1,
    July: 1,
    August: 1,
    September: 1,
    October: 1,
    November: 1,
    December: 1,

    days: new Array<boolean>(31).fill(true),
});

/**
 * Превращает один cron-фрагмент (например "*", "5", "star-slash-N") в пару { value, type }.
 *  - "*"           -> type=0 (каждые), value=0   -> "каждый" / "*"
 *  - star/N        -> type=0 (каждые), value=N   -> "star/N"
 *  - "N" (число)   -> type=1 (раз в), value=N    -> "N"
 * Сложные формы (списки, диапазоны) упрощаются до «по умолчанию» (все).
 */
const parseSimpleField = (
    raw: string | undefined,
): { value: number; type: Flag } => {
    if (raw === undefined || raw === null || raw === '') {
        return { value: 0, type: 0 };
    }
    const field = String(raw).trim();

    if (field === '*') {
        return { value: 0, type: 0 };
    }

    const stepMatch = field.match(/^\*\/(\d+)$/);
    if (stepMatch) {
        const n = parseInt(stepMatch[1], 10);
        if (!Number.isFinite(n) || n <= 0) return { value: 0, type: 0 };
        return { value: n, type: 0 };
    }

    const numMatch = field.match(/^(\d+)$/);
    if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        return { value: n, type: 1 };
    }

    // Сложные формы — списки, диапазоны, шаги — для UI упрощаем до «по умолчанию».
    return { value: 0, type: 0 };
};

/** Разбирает cron-фрагмент дня месяца в булев массив длиной 31. */
const parseDayField = (raw: string | undefined): Array<boolean> => {
    const days = new Array<boolean>(31).fill(false);
    if (raw === undefined || raw === null) return days.fill(true);

    const field = String(raw).trim();
    if (field === '*' || field === '?') return days.fill(true);

    const parts = field.split(',');
    for (const part of parts) {
        const rangeMatch = part.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            const a = parseInt(rangeMatch[1], 10);
            const b = parseInt(rangeMatch[2], 10);
            if (a >= 1 && a <= 31 && b >= 1 && b <= 31 && a <= b) {
                for (let i = a; i <= b; i += 1) days[i - 1] = true;
            }
            continue;
        }
        const numMatch = part.match(/^(\d+)$/);
        if (numMatch) {
            const n = parseInt(numMatch[1], 10);
            if (n >= 1 && n <= 31) days[n - 1] = true;
        }
    }
    return days;
}

/** Разбирает cron-фрагмент дня недели в массив [Пн..Вс] (Sun=0/7). */
const parseWeekdayField = (raw: string | undefined): Array<Flag> => {
    const result: Array<Flag> = [0, 0, 0, 0, 0, 0, 0];
    if (raw === undefined || raw === null) return result.fill(1);

    const field = String(raw).trim();
    if (field === '*' || field === '?') return result.fill(1);

    const setFlag = (cronValue: number): void => {
        // стандартный cron и node-schedule: 0 и 7 = воскресенье
        if (cronValue === 0 || cronValue === 7) result[6] = 1;
        else if (cronValue >= 1 && cronValue <= 6) result[cronValue - 1] = 1;
    };

    const parts = field.split(',');
    for (const part of parts) {
        const rangeMatch = part.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            let a = parseInt(rangeMatch[1], 10);
            const b = parseInt(rangeMatch[2], 10);
            if (a >= 0 && a <= 7 && b >= 0 && b <= 7 && a <= b) {
                if (a === 0) a = 7;
                for (let i = a; i <= b; i += 1) setFlag(i);
            }
            continue;
        }
        const numMatch = part.match(/^(\d+)$/);
        if (numMatch) {
            setFlag(parseInt(numMatch[1], 10));
        }
    }
    return result;
};

/** Разбирает cron-фрагмент месяцев в массив [Январь..Декабрь]. */
const parseMonthField = (raw: string | undefined): Array<Flag> => {
    const result: Array<Flag> = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (raw === undefined || raw === null) return result.fill(1);

    const field = String(raw).trim();
    if (field === '*' || field === '?') return result.fill(1);

    const setFlag = (cronValue: number): void => {
        if (cronValue >= 1 && cronValue <= 12) result[cronValue - 1] = 1;
    };

    const parts = field.split(',');
    for (const part of parts) {
        const rangeMatch = part.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            const a = parseInt(rangeMatch[1], 10);
            const b = parseInt(rangeMatch[2], 10);
            if (a >= 1 && a <= 12 && b >= 1 && b <= 12 && a <= b) {
                for (let i = a; i <= b; i += 1) setFlag(i);
            }
            continue;
        }
        const numMatch = part.match(/^(\d+)$/);
        if (numMatch) {
            setFlag(parseInt(numMatch[1], 10));
        }
    }
    return result;
};

/** Преобразует cron-строку в ScheduleObject. При невалидной строке — дефолт. */
export const parseCronToSchedule = (cron: string | null | undefined): ScheduleObject => {
    const base = getDefaultSchedule();
    if (!cron || typeof cron !== 'string') return base;

    const parts = cron.trim().split(/\s+/);
    let second = '0';
    let minute: string;
    let hour: string;
    let day: string;
    let month: string;
    let weekDay: string;

    if (parts.length >= 6) {
        [second, minute, hour, day, month, weekDay] = parts;
    } else if (parts.length === 5) {
        [minute, hour, day, month, weekDay] = parts;
        second = '0';
    } else {
        return base;
    }

    const sec = parseSimpleField(second);
    const min = parseSimpleField(minute);
    const hr = parseSimpleField(hour);

    const weekdays = parseWeekdayField(weekDay);
    const months = parseMonthField(month);
    const days = parseDayField(day);

    const schedule: ScheduleObject = {
        ...base,
        second: sec.value,
        minute: min.value,
        hour: hr.value,
        typeSecond: sec.type,
        typeMinute: min.type,
        typeHour: hr.type,
        days,
    };

    WEEKDAY_KEYS.forEach((key, i) => {
        schedule[key] = weekdays[i];
    });

    MONTH_KEYS.forEach((key, i) => {
        schedule[key] = months[i];
    });

    return schedule;
};

/** Сжимает булев массив в список интервалов {min, max} (1-based, инклюзивно). */
const getRange = (arrayRange: Array<boolean | Flag>): Array<{ min: number; max: number }> => {
    const rangeDay: Array<{ min: number; max: number }> = [];
    let minDay = 1;
    let lastDay = 0;
    for (const indexStr in arrayRange) {
        const indexInt = parseInt(indexStr, 10);
        const input = arrayRange[indexInt];
        if (input) {
            lastDay = indexInt;
        } else if (indexInt + 1 > minDay) {
            rangeDay.push({ min: minDay, max: indexInt });
            minDay = indexInt + 2;
            lastDay = indexInt;
        } else {
            minDay = indexInt + 2;
            lastDay = indexInt;
        }
    }
    if (minDay <= lastDay + 1) {
        rangeDay.push({ min: minDay, max: lastDay + 1 });
    }
    return rangeDay;
};

const rangesToCron = (ranges: Array<{ min: number; max: number }>, totalCount: number): string => {
    if (
        ranges.length === 1 &&
        ranges[0].min === 1 &&
        ranges[0].max === totalCount
    ) {
        return '*';
    }
    if (ranges.length === 0) return '0';
    return ranges
        .map((range) => (range.min !== range.max ? `${range.min}-${range.max}` : `${range.min}`))
        .join(',');
};

/** Генерирует cron-строку 6-полей (second minute hour day month weekday) из ScheduleObject. */
export const scheduleToCron = (schedule: ScheduleObject): string => {
    const sysSchedule = {
        second: '*',
        minute: '*',
        hour: '*',
        day: '*',
        month: '*',
        weekDay: '*',
    };

    if (schedule.hour) {
        sysSchedule.hour = schedule.typeHour ? `${schedule.hour}` : `*/${schedule.hour}`;
    } else {
        sysSchedule.hour = schedule.typeHour ? '0' : '*';
    }

    if (schedule.minute) {
        sysSchedule.minute = schedule.typeMinute ? `${schedule.minute}` : `*/${schedule.minute}`;
    } else {
        sysSchedule.minute = schedule.typeMinute ? '0' : '*';
    }

    if (schedule.second) {
        sysSchedule.second = schedule.typeSecond ? `${schedule.second}` : `*/${schedule.second}`;
    } else {
        sysSchedule.second = schedule.typeSecond ? '0' : '*';
    }

    sysSchedule.day = rangesToCron(getRange(schedule.days), 31);

    const sysDays: Array<Flag> = WEEKDAY_KEYS.map((key) => schedule[key]);
    sysSchedule.weekDay = rangesToCron(getRange(sysDays), 7);

    const sysMonths: Array<Flag> = MONTH_KEYS.map((key) => schedule[key]);
    sysSchedule.month = rangesToCron(getRange(sysMonths), 12);

    return Object.values(sysSchedule).join(' ');
};

/** Собирает человеко-читаемое описание на русском (для предпросмотра в форме). */
export const scheduleToHumanReadable = (schedule: ScheduleObject): string => {
    const parts: Array<string> = [];

    if (schedule.hour) {
        parts.push(
            `${schedule.typeHour ? 'один раз в' : 'каждые'} ${schedule.hour} час`,
        );
    } else {
        parts.push(schedule.typeHour ? 'в 00 часов' : 'каждый час');
    }

    if (schedule.minute) {
        parts.push(
            `${schedule.typeMinute ? 'один раз в' : 'каждые'} ${schedule.minute} минут`,
        );
    } else {
        parts.push(schedule.typeMinute ? 'в 00 минут' : 'каждую минуту');
    }

    if (schedule.second) {
        parts.push(
            `${schedule.typeSecond ? 'один раз в' : 'каждые'} ${schedule.second} секунд`,
        );
    } else {
        parts.push(schedule.typeSecond ? 'в 00 секунд' : 'каждую секунду');
    }

    const dayRanges = getRange(schedule.days);
    if (dayRanges.length === 1 && dayRanges[0].min === 1 && dayRanges[0].max === 31) {
        parts.push('каждый день');
    } else if (dayRanges.length > 0) {
        parts.push(
            `по дням: ${dayRanges
                .map((r) => (r.min !== r.max ? `${r.min}-${r.max}` : `${r.min}`))
                .join(',')}`,
        );
    } else {
        parts.push('нет дней для работы');
    }

    const selectedWeekdays = WEEKDAY_KEYS
        .map((key, i) => (schedule[key] ? WEEKDAY_NAMES_RU[i] : null))
        .filter((x): x is (typeof WEEKDAY_NAMES_RU)[number] => Boolean(x));
    if (selectedWeekdays.length < 7) {
        parts.push(`по дням недели [${selectedWeekdays.join(', ')}]`);
    }

    const monthRanges = getRange(
        MONTH_KEYS.map((key) => schedule[key]),
    );
    if (monthRanges.length !== 1 || monthRanges[0].min !== 1 || monthRanges[0].max !== 12) {
        const monthText = monthRanges
            .map((r) =>
                r.min !== r.max
                    ? `${MONTH_NAMES_RU[r.min - 1]}-${MONTH_NAMES_RU[r.max - 1]}`
                    : MONTH_NAMES_RU[r.min - 1],
            )
            .join(', ');
        parts.push(`по месяцам [${monthText}]`);
    }

    return parts.join('; ');
};
