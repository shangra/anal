export const dateRanges = {
    day: {
        name: 'day',
        title: 'День',
        ranges: [
            { name: 'D-1', title: 'Вчера' },
            { name: 'D=1', title: 'Сегодня' },
            { name: 'D+1', title: 'Завтра' },
        ],
    },
    week: {
        name: 'week',
        title: 'Неделя',
        ranges: [
            { name: 'W-1', title: 'Прошлая неделя' },
            { name: 'W=1', title: 'Текущая неделя' },
            { name: 'W+1', title: 'Следующая неделя' },
        ],
    },
    month: {
        name: 'month',
        title: 'Месяц',
        ranges: [
            { name: 'M-1', title: 'Прошлый месяц' },
            { name: 'M=1', title: 'Текущий месяц' },
            { name: 'M+1', title: 'Следующий месяц' },
        ],
    },
    quarter: {
        name: 'quarter',
        title: 'Квартал',
        ranges: [
            { name: 'Q-1', title: 'Прошлый квартал' },
            { name: 'Q=1', title: 'Текущий квартал' },
            { name: 'Q+1', title: 'Следующий квартал' },
        ],
    },
    halfYear: {
        name: 'halfYear',
        title: 'Полугодие',
        ranges: [
            { name: 'HY-1', title: 'Прошлое полугодие' },
            { name: 'HY=1', title: 'Текущее полугодие' },
            { name: 'HY+1', title: 'Следующее полугодие' },
        ],
    },
    year: {
        name: 'year',
        title: 'Год',
        ranges: [
            { name: 'Y-1', title: 'Прошлый год' },
            { name: 'Y=1', title: 'Текущий год' },
            { name: 'Y+1', title: 'Следующий год' },
        ],
    },
    arbitrary: {
        name: 'arbitrary',
        title: 'Произвольно',
        ranges: []
    }
};

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
        case 'D-1': {
            result.from = new Date(result.from.setDate(result.from.getDate() - 1));
            result.to = new Date(result.to.setDate(result.to.getDate() - 1));
            break;
        }
        case 'D=1': {
            break;
        }
        case 'D+1': {
            result.from = new Date(result.from.setDate(result.from.getDate() + 1));
            result.to = new Date(result.to.setDate(result.to.getDate() + 1));
            break;
        }

        case 'W-1': {
            result.from = new Date(result.from.setDate(result.from.getDate() - result.from.getDay() - 6));
            result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay()));
            break;
        }
        case 'W=1': {
            result.from = new Date(result.from.setDate(result.from.getDate() - result.from.getDay() + 1));
            result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay() + 7));
            break;
        }
        case 'W+1': {
            result.from = new Date(result.from.setDate(result.from.getDate() - result.from.getDay() + 8));
            result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay() + 14));
            break;
        }

        case 'M-1': {
            result.from = new Date(result.from.getFullYear(), result.from.getMonth() - 1, 1);
            result.to = new Date(result.to.getFullYear(), result.to.getMonth(), 0);
            break;
        }
        case 'M=1': {
            result.from = new Date(result.from.getFullYear(), result.from.getMonth(), 1);
            result.to = new Date(result.to.getFullYear(), result.to.getMonth() + 1, 0);
            break;
        }
        case 'M+1': {
            result.from = new Date(result.from.getFullYear(), result.from.getMonth() + 1, 1);
            result.to = new Date(result.to.getFullYear(), result.to.getMonth() + 2, 0);
            break;
        }

        case 'Q-1': {
            result.from = new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from - 3, 1);
            result.to = new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to - 3, 0);
            break;
        }
        case 'Q=1': {
            result.from = new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from, 1);
            result.to = new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to, 0);
            break;
        }
        case 'Q+1': {
            result.from = new Date(result.from.getFullYear(), getQuarter(result.from.getMonth()).from + 3, 1);
            result.to = new Date(result.to.getFullYear(), getQuarter(result.to.getMonth()).to + 3, 0);
            break;
        }

        case 'HY-1': {
            result.from = new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from - 6, 1);
            result.to = new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to - 6, 0);
            break;
        }
        case 'HY=1': {
            result.from = new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from, 1);
            result.to = new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to, 0);
            break;
        }
        case 'HY+1': {
            result.from = new Date(result.from.getFullYear(), getHalfYear(result.from.getMonth()).from + 6, 1);
            result.to = new Date(result.to.getFullYear(), getHalfYear(result.to.getMonth()).to + 6, 0);
            break;
        }

        case 'Y-1': {
            result.from = new Date(result.from.getFullYear() - 1, 0, 1);
            result.to = new Date(result.to.getFullYear() - 1, 12, 0);
            break;
        }
        case 'Y=1': {
            result.from = new Date(result.from.getFullYear(), 0, 1);
            result.to = new Date(result.to.getFullYear(), 12, 0);
            break;
        }
        case 'Y+1': {
            result.from = new Date(result.from.getFullYear() + 1, 0, 1);
            result.to = new Date(result.to.getFullYear() + 1, 12, 0);
            break;
        }
        default: {
            break;
        }
    }

    const timeFrom = result.from.setHours(0, 0, 0, 0);
    const timeTo = result.to.setHours(23, 59, 59, 0); 
    // убираем time zone
    const tzoffset = new Date(result.from).getTimezoneOffset() * 60000;
    
    // обрезаем секунды и time zone для инпута
    let dateFrom = new Date(timeFrom - tzoffset).toISOString().slice(0, -1).substring(0, 19);
    let dateTo = new Date(timeTo - tzoffset).toISOString().slice(0, -1).substring(0, 19);

    if (type === 'date') {
        dateFrom = dateFrom.substring(0, 10);
        dateTo = dateTo.substring(0, 10);
    }
    return {from: dateFrom, to: dateTo};
};
