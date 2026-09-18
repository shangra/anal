export const dateRanges = [
    {
        name: 'day',
        title: 'День',
        ranges: [
            { name: 'lastDay', title: 'Вчера' },
            { name: 'currentDay', title: 'Сегодня' },
            { name: 'nextDay', title: 'Завтра' },
        ],
    },
    {
        name: 'week',
        title: 'Неделя',
        ranges: [
            { name: 'lastWeek', title: 'Прошлая неделя' },
            { name: 'currentWeek', title: 'Текущая неделя' },
            { name: 'nextWeek', title: 'Следующая неделя' },
        ],
    },
    {
        name: 'month',
        title: 'Месяц',
        ranges: [
            { name: 'lastMonth', title: 'Прошлый месяц' },
            { name: 'currentMonth', title: 'Текущий месяц' },
            { name: 'nextMonth', title: 'Следующий месяц' },
        ],
    },
    {
        name: 'quarter',
        title: 'Квартал',
        ranges: [
            { name: 'lastQuarter', title: 'Прошлый квартал' },
            { name: 'currentQuarter', title: 'Текущий квартал' },
            { name: 'nextQuarter', title: 'Следующий квартал' },
        ],
    },
    {
        name: 'halfYear',
        title: 'Полугодие',
        ranges: [
            { name: 'lastHalfYear', title: 'Прошлое полугодие' },
            { name: 'currentHalfYear', title: 'Текущее полугодие' },
            { name: 'nextHalfYear', title: 'Следующее полугодие' },
        ],
    },
    {
        name: 'year',
        title: 'Год',
        ranges: [
            { name: 'lastYear', title: 'Прошлый год' },
            { name: 'currentYear', title: 'Текущий год' },
            { name: 'nextYear', title: 'Следующий год' },
        ],
    },
    {
        name: 'arbitrary',
        title: 'Произвольно',
    },
];

// возвращает диапазон текущего квартала
const getQuarter = (month) => {
    if (month >= 0 && month < 3) return { from: 0, to: 3 };
    if (month >= 3 && month < 6) return { from: 3, to: 6 };
    if (month >= 6 && month < 9) return { from: 6, to: 9 };
    if (month >= 9) return { from: 9, to: 12 };
    return { from: 0, to: 3 };
};

// возвращает диапазон текущего полугодия
const getHalfYear = (month) => {
    if (month >= 0 && month < 6) return { from: 0, to: 6 };
    if (month >= 6) return { from: 6, to: 12 };
    return { from: 0, to: 3 };
};

export const getDateTime = (range, type = 'datetime') => {
    const result = { from: new Date(Date.now()), to: new Date(Date.now()) };
    switch (range) {
        case 'lastDay': {
            result.from = new Date(result.from.setDate(result.from.getDate() - 1));
            result.to = new Date(result.to.setDate(result.to.getDate() - 1));
            break;
        }
        case 'currentDay': {
            break;
        }
        case 'nextDay': {
            result.from = new Date(result.from.setDate(result.from.getDate() + 1));
            result.to = new Date(result.to.setDate(result.to.getDate() + 1));
            break;
        }
        case 'lastWeek': {
            result.from = new Date(result.from.setDate(result.from.getDate() - result.from.getDay() - 6));
            result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay()));
            break;
        }
        case 'currentWeek': {
            result.from = new Date(result.from.setDate(result.from.getDate() - result.from.getDay() + 1));
            result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay() + 7));
            break;
        }
        case 'nextWeek': {
            result.from = new Date(result.from.setDate(result.from.getDate() - result.from.getDay() + 8));
            result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay() + 14));
            break;
        }
        case 'lastMonth': {
            result.from = new Date(result.from.getFullYear(), result.from.getMonth() - 1, 1);
            result.to = new Date(result.to.getFullYear(), result.to.getMonth(), 0);
            break;
        }
        case 'currentMonth': {
            result.from = new Date(result.from.getFullYear(), result.from.getMonth(), 1);
            result.to = new Date(result.to.getFullYear(), result.to.getMonth() + 1, 0);
            break;
        }
        case 'nextMonth': {
            result.from = new Date(result.from.getFullYear(), result.from.getMonth() + 1, 1);
            result.to = new Date(result.to.getFullYear(), result.to.getMonth() + 2, 0);
            break;
        }
        case 'lastQuarter': {
            result.from = new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from - 3, 1);
            result.to = new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to - 3, 0);
            break;
        }
        case 'currentQuarter': {
            result.from = new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from, 1);
            result.to = new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to, 0);
            break;
        }
        case 'nextQuarter': {
            result.from = new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from + 3, 1);
            result.to = new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to + 3, 0);
            break;
        }
        case 'lastHalfYear': {
            result.from = new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from - 6, 1);
            result.to = new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to - 6, 0);
            break;
        }
        case 'currentHalfYear': {
            result.from = new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from, 1);
            result.to = new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to, 0);
            break;
        }
        case 'nextHalfYear': {
            result.from = new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from + 6, 1);
            result.to = new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to + 6, 0);
            break;
        }
        case 'lastYear': {
            result.from = new Date(result.from.getFullYear() - 1, 0, 1);
            result.to = new Date(result.to.getFullYear() - 1, 12, 0);
            break;
        }
        case 'currentYear': {
            result.from = new Date(result.from.getFullYear(), 0, 1);
            result.to = new Date(result.to.getFullYear(), 12, 0);
            break;
        }
        case 'nextYear': {
            result.from = new Date(result.from.getFullYear() + 1, 0, 1);
            result.to = new Date(result.to.getFullYear() + 1, 12, 0);
            break;
        }
        default: {
            break;
        }
    }
    result.from = result.from.setHours(0, 0, 0, 0);
    result.to = result.to.setHours(23, 59, 59, 0);
    // убираем time zone
    const tzoffset = new Date(result.from).getTimezoneOffset() * 60000;
    // обрезаем секунды и time zone для инпута
    result.from = new Date(result.from - tzoffset).toISOString().slice(0, -1).substring(0, 16);
    result.to = new Date(result.to - tzoffset).toISOString().slice(0, -1).substring(0, 16);

    if (type === 'date') {
        result.from = result.from.substring(0, 10);
        result.to = result.to.substring(0, 10);
    }
    return result;
};
