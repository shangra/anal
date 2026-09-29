import {
    Plurals,
    formatDayShift,
    formatPeriodShift,
    getMorpheme,
} from '../morphemes';

describe('Проверка определения нужно морфемы', () => {
    const morphemes: [one: string, two: string, many: string] = [
        'число',
        'числа',
        'чисел',
    ];
    const [one, two, many] = morphemes;

    it.each([
        [0, many],
        [1, one],
        [2, two],
        [5, many],
        [10, many],
        [11, many],
        [12, many],
        [20, many],
        [21, one],
        [22, two],
        [100, many],
        [101, one],
        [102, two],
        [105, many],
        [110, many],
        [111, many],
        [112, many],
        [121, one],
    ])('Для числа $0 используется форма $1', (value, morpheme) => {
        expect(getMorpheme(value, morphemes)).toBe(morpheme);
    });
});

describe('Проверка форматирование периода', () => {
    it.each([
        [0, 'Эта неделя'],
        [+1, 'Следующая неделя'],
        [+2, '+2 недели'],
        [-1, 'Прошлая неделя'],
        [-5, '-5 недель'],
    ] satisfies [shift: number, title: string][])(
        'При значении "$shift" должен вернуть "$title"',
        (shift, title) => {
            expect(formatPeriodShift(shift, Plurals.Weeks)).toBe(title);
        }
    );
});

describe('Проверка форматирование периода дней (частный случай)', () => {
    it.each([
        [0, 'Сегодня'],
        [+1, 'Завтра'],
        [+2, '+2 дня'],
        [-1, 'Вчера'],
        [-5, '-5 дней'],
    ] satisfies [shift: number, title: string][])(
        'При значении "$shift" должен вернуть "$title"',
        (shift, title) => {
            expect(formatDayShift(shift)).toBe(title);
        }
    );
});
