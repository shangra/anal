export function transliterate(word, options = {}) {
    const a = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'yo',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'i',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'i',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',

        А: 'A',
        Б: 'B',
        В: 'V',
        Г: 'G',
        Д: 'D',
        Е: 'E',
        Ё: 'YO',
        Ж: 'ZH',
        З: 'Z',
        И: 'I',
        Й: 'I',
        К: 'K',
        Л: 'L',
        М: 'M',
        Н: 'N',
        О: 'O',
        П: 'P',
        Р: 'R',
        С: 'S',
        Т: 'T',
        У: 'U',
        Ф: 'F',
        Х: 'H',
        Ц: 'TS',
        Ч: 'CH',
        Ш: 'SH',
        Щ: 'SCH',
        Ъ: '',
        Ы: 'I',
        Ь: '',
        Э: 'E',
        Ю: 'YU',
        Я: 'YA',
    };

    const engLetter = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '0',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
    ];

    const b = {};
    Object.entries(a).forEach(([key, value]) => {
        b[value] = key;
    });

    const extArray = options.extArray ? options.extArray : [];

    const wordArray = word.trim().split('');
    const newWordArray = [];
    for (const char of wordArray) {
        if (a[char]) {
            newWordArray.push(a[char]);
        } else if (extArray[char]) {
            newWordArray.push(extArray[char]);
        } else if (engLetter.indexOf(char.toLowerCase()) !== -1) {
            newWordArray.push(char);
        } else if (!options.onlyLetters) {
            newWordArray.push(char);
        }
    }
    return newWordArray.join('');
}

export function transliterateUrl(word, options = {}) {
    if (!word) {
        return undefined;
    }

    return transliterate(word.toLowerCase().split(' ').join('_'), options);
}

const transliterateString = (word, options = {}) => {
    const a = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'yo',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'i',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'i',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',

        А: 'A',
        Б: 'B',
        В: 'V',
        Г: 'G',
        Д: 'D',
        Е: 'E',
        Ё: 'YO',
        Ж: 'ZH',
        З: 'Z',
        И: 'I',
        Й: 'I',
        К: 'K',
        Л: 'L',
        М: 'M',
        Н: 'N',
        О: 'O',
        П: 'P',
        Р: 'R',
        С: 'S',
        Т: 'T',
        У: 'U',
        Ф: 'F',
        Х: 'H',
        Ц: 'TS',
        Ч: 'CH',
        Ш: 'SH',
        Щ: 'SCH',
        Ъ: '',
        Ы: 'I',
        Ь: '',
        Э: 'E',
        Ю: 'YU',
        Я: 'YA',
    };

    const engLetter = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '0',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
    ];

    const b = {};
    Object.entries(a).forEach(([key, value]) => {
        b[value] = key;
    });

    const extArray = options.ext_array ? options.ext_array : [];

    const wordArray = word.trim().split('');
    const newWordArray = [];
    for (const char of wordArray) {
        if (a[char]) {
            newWordArray.push(a[char]);
        } else if (extArray[char]) {
            newWordArray.push(extArray[char]);
        } else if (engLetter.indexOf(char.toLowerCase()) !== -1) {
            newWordArray.push(char);
        } else if (!options.onlyLetters) {
            newWordArray.push(char);
        }
    }
    return newWordArray.join('');
};

export const transliterateMis = (str) =>
    transliterateString(str.trim().toLowerCase(), {
        ext_array: { ' ': '_', _: '_', '-': '-', '.': '.' },
        onlyLetters: true,
    });
