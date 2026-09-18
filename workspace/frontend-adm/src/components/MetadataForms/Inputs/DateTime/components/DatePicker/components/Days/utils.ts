import { ONE_DAY, DAYS_IN_WEEK, SUNDAY_INDEX } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Days/constants";

export const isSameDates = (firstDate: Date, secondDate: Date): boolean =>
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();

export const isSameMonths = (firstDate: Date, secondDate: Date): boolean =>
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth();

const isSunday = (dayIndex: number): boolean => dayIndex === SUNDAY_INDEX;

const getFirstDayOfWeekInMonth = (year: number, month: number): number =>
    new Date(year, month, 1).getDay();

const countDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

const countWeeksInMonth = (firstMonthDay: number, totalDaysInMonth: number): number => {
    const correctionIndex = isSunday(firstMonthDay) ? 6 : -1;

    return Math.ceil(
        (firstMonthDay + totalDaysInMonth + correctionIndex) / DAYS_IN_WEEK
    );
};

const getDaysListOfMonth = (totalDaysInMonth: number): number[] =>
    Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

export const getWeeksOfMonth = (year: number, month: number): (number | null)[][] => {
    const weeksOfMonth: (number | null)[][] = [];

    const firstDayOfWeekInMonth = getFirstDayOfWeekInMonth(year, month);
    const totalDaysInMonth = countDaysInMonth(year, month);
    const totalWeeksInMonth = countWeeksInMonth(
        firstDayOfWeekInMonth,
        totalDaysInMonth
    );

    /* Создаем массив всех дней месяца - [1, 2, 3, 4, 5, 6, 7, 8, 9, ...] */
    const daysListOfMonth = getDaysListOfMonth(totalDaysInMonth);

    for (let weekNumber = 1; weekNumber <= totalWeeksInMonth; weekNumber++) {
        /* Инициализируем массив текущей недели заполненный null'ами - [null x 7] */
        const currentWeek: (number | null)[] = new Array(DAYS_IN_WEEK).fill(null);

        const isFirstWeek = weekNumber === 1;

        /* Обрабатываем первую неделю месяца отдельно,
         * так как количество недель в месяце не кратко общему количеству дней
         */
        if (isFirstWeek) {
            /* Находим количество пустых (отсутствующих) дней первой недели месяца отображаемых в календаре */
            const totalEmptyDaysInFirstWeek = isSunday(firstDayOfWeekInMonth)
                ? DAYS_IN_WEEK - ONE_DAY
                : firstDayOfWeekInMonth - ONE_DAY;

            const totalDaysInFirstWeek = isSunday(firstDayOfWeekInMonth)
                ? ONE_DAY
                : DAYS_IN_WEEK - totalEmptyDaysInFirstWeek;

            const totalDaysInCurrentWeek = totalDaysInFirstWeek;
            const daysListOfCurrentWeek = daysListOfMonth.splice(
                0,
                totalDaysInCurrentWeek
            );

            /* Заполняем массив текущей (первой) недели,
             * учитывая возможные пустые дни с начала месяца - [null, null, 1, 2, 3, 4, 5]
             */
            currentWeek.splice(
                totalEmptyDaysInFirstWeek,
                daysListOfCurrentWeek.length,
                ...daysListOfCurrentWeek
            );
        } else {
            const totalDaysInCurrentWeek = DAYS_IN_WEEK;
            const daysListOfCurrentWeek = daysListOfMonth.splice(
                0,
                totalDaysInCurrentWeek
            );

            /* Для остальных недель учет оставшихся пустых дней последней недели
             * будет происходить автоматически - [27, 28, 29, 30, 31, null, null]
             */
            currentWeek.splice(
                0,
                daysListOfCurrentWeek.length,
                ...daysListOfCurrentWeek
            );
        }

        weeksOfMonth.push(currentWeek);
    }

    return weeksOfMonth;
};

export const isRangeMode = <T>(value: T | T[]): value is T[] =>
    Array.isArray(value);
