/**
 * @typedef {[one: string, two: string, many: string]} NumberMorphemes
 */

/**
 * @typedef {Object} PluralTimes
 * @property {string} current
 * @property {string} prev
 * @property {string} next
 */

/**
 * @typedef {PluralTimes} PluralRules
 * @property {NumberMorphemes} count
 */

/**
 * @const {{Male: PluralTimes, Female: PluralTimes, Neuter: PluralTimes}}
 */
const PluralTimesSex = {
    Masculine: {
        current: 'Этот',
        prev: 'Прошлый',
        next: 'Следующий',
    },
    Feminine: {
        current: 'Эта',
        prev: 'Прошлая',
        next: 'Следующая',
    },
    Neuter: {
        current: 'Это',
        prev: 'Прошлое',
        next: 'Следующее',
    },
};

/**
 * Морфемы размерности периода:
 * @const {{[key: string]: PluralRules}}
 */
const Plurals = {
    Days: {
        ...PluralTimesSex.Masculine,
        count: ['День', 'Дня', 'Дней'],
    },
    Weeks: {
        ...PluralTimesSex.Feminine,
        count: ['Неделя', 'Недели', 'Недель'],
    },
    Monthes: {
        ...PluralTimesSex.Masculine,
        count: ['Месяц', 'Месяца', 'Месяцев'],
    },
    Quartals: {
        ...PluralTimesSex.Masculine,
        current: 'Текущий',
        count: ['Квартал', 'Квартала', 'Кварталов'],
    },
    HalfYears: {
        ...PluralTimesSex.Neuter,
        count: ['Полугодие', 'Полугодия', 'Полугодий'],
    },
    Years: {
        ...PluralTimesSex.Masculine,
        count: ['Год', 'Года', 'Лет'],
    },
};

/**
 * @param {number} value
 * @param {NumberMorphemes} morphemes
 * @return  {string}
 */
function getMorpheme(value, morphemes) {
    const [one, two, many] = morphemes;

    const decade = value % 100;
    if (decade >= 10 && decade <= 20) return many;

    const last = value % 10;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return two;

    return many;
}

/**
 * @param {number} shift
 * @param {PluralRules} morphemes
 * @return {string}
 */
function formatPeriodShift(shift, morphemes) {
    if (shift === 0) {
        return `${morphemes.current} ${morphemes.count[0].toLowerCase()}`;
    }

    const absShift = Math.abs(shift);
    const isSingular = absShift === 1;
    const countMorpheme = getMorpheme(
        absShift,
        morphemes.count
    ).toLocaleLowerCase();

    if (isSingular) {
        const prefix = shift < 0 ? morphemes.prev : morphemes.next;
        return `${prefix} ${countMorpheme}`;
    }

    const sign = Math.sign(shift) > 0 ? '+' : '-';
    return `${sign}${absShift} ${countMorpheme}`;
}

/**
 * @param {number} daysShift
 * @return {string}
 */
function formatDayShift(daysShift) {
    if (daysShift === 0) return 'Сегодня';
    if (daysShift === -1) return 'Вчера';
    if (daysShift === 1) return 'Завтра';

    return formatPeriodShift(daysShift, Plurals.Days);
}

export { Plurals, getMorpheme, formatPeriodShift, formatDayShift };
