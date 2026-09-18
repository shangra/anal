const convertSinglePeriod = period => {
    const regex = /(?<PERIOD>D|W|TD|M|Q|HY|Y)(?<WHERE>\-|\+|\=)(?<COUNT>[1])/;
    const match = regex.exec(period);

    switch (match.groups.PERIOD) {
        case 'D':
            return match.groups.WHERE === '=' ? 'Сегодня' :
                   match.groups.WHERE === '+' ? 'Завтра' :
                   'Вчера';
        case 'W':
            return match.groups.WHERE === '=' ? 'Эта неделя' :
                   match.groups.WHERE === '+' ? 'Следующая неделя' :
                   'Прошлая неделя';
        case 'TD': // Декада
            return match.groups.WHERE === '=' ? 'Эта декада' :
                   match.groups.WHERE === '+' ? 'Следующая декада' :
                   'Прошлая декада';
        case 'M':
            return match.groups.WHERE === '=' ? 'Этот месяц' :
                   match.groups.WHERE === '+' ? 'Следующий месяц' :
                   'Прошлый месяц';
        case 'Q':
            return match.groups.WHERE === '=' ? 'Текущий квартал' :
                   match.groups.WHERE === '+' ? 'Следующий квартал' :
                   'Предыдущий квартал';
        case 'HY':
            return match.groups.WHERE === '=' ? 'Это полугодие' :
                   match.groups.WHERE === '+' ? 'Следующее полугодие' :
                   'Прошлое полугодие';
        case 'Y':
            return match.groups.WHERE === '=' ? 'Этот год' :
                   match.groups.WHERE === '+' ? 'Следующий год' :
                   'Прошлый год';
        default:
            throw new Error('Неверный формат периода');
    }
};

// Исходная функция конвертации останется почти без изменений
const convertPeriodToHumanReadable = period => {    
    if (period) {
        const regexSimple = /(?<PERIOD>D|W|TD|M|Q|HY|Y)(?<WHERE>\-|\+|\=)(?<COUNT>[1])/;
        const regexCombined = /(?<sSE>S|E)(?<start>(?<sPERIOD>D|W|TD|M|Q|HY|Y)(?<sWHERE>\-|\+|\=)(?<sCOUNT>[1]))>(?<eSE>S|E)(?<end>(?<ePERIOD>D|W|TD|M|Q|HY|Y)(?<eWHERE>\-|\+|\=)(?<eCOUNT>[1]))/;
        const regexDates = /^S\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}>E\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

        // Проверка сложного случая (SQ-1>EQ=1 и т.п.)
        if (regexCombined.test(period)) {
            const match = regexCombined.exec(period);
            const startSE = match.groups.sSE === 'S' ? 'Начало' : 'Окончание';
            const endSE = match.groups.eSE === 'E' ? 'Окончание' : 'Начало';
            return `${startSE} ${convertSinglePeriod(match.groups.start)} > ${endSE} ${convertSinglePeriod(match.groups.end)}`;
        }

        // Проверка случая с датами (SYYYY-MM-DDThh:mm:ss>EYYYY-MM-DDThh:mm:ss)
        if (regexDates.test(period)) {
            const parts = period.split('>');
            const startTime = new Date(parts[0].substring(1));
            const endTime = new Date(parts[1].substring(1));
            return formatDateRange(startTime, endTime);
        }
        // Проверка простого случая (Y-1, Q=1 и т.п.)
        if (regexSimple.test(period)) {
            return convertSinglePeriod(period);
        }

        // Ошибка при неизвестном формате
        
            throw new Error(`Неправильный формат периода "${period}"`);
        
    } else {
        return undefined; // "Выберите период"
    }
};

// Функция форматирования диапазона дат
const formatDateRange = (startDate, endDate) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return `От ${startDate.toLocaleString('ru-RU', options)} до ${endDate.toLocaleString('ru-RU', options)}`;
};



const parseInputRange = (input) => {
    // Регулярные выражения для разных типов входных данных
    const regexSpecificDates = /^S([^\>]*)>E([^\>]*)$/;
    const regexRelativePeriods = /^(?<from>(?:S|E)(?<fPERIOD>D|W|TD|M|Q|HY|Y)(?<fWHERE>\-|\+|\=)(?<fCOUNT>[1]))>(?<to>(?:S|E)(?<tPERIOD>D|W|TD|M|Q|HY|Y)(?<tWHERE>\-|\+|\=)(?<tCOUNT>[1]))$/;
    const regexSinglePeriod = /^(?<PERIOD>D|W|TD|M|Q|HY|Y)(?<WHERE>\-|\+|\=)(?<COUNT>[1])$/;

    // Результат по умолчанию
    const result = {};

    // Разбор конкретного диапазона дат
    if (regexSpecificDates.test(input)) {
        const matches = input.match(regexSpecificDates);
        result.innerRangeFrom = matches[1]; // Оставляем без изменений
        result.innerRangeTo = matches[2];   // Оставляем без изменений
    }

    // Разбор относительных периодов
    else if (regexRelativePeriods.test(input)) {
        const matches = regexRelativePeriods.exec(input);
        result.innerRangeFrom = matches.groups.fPERIOD + matches.groups.fWHERE + matches.groups.fCOUNT; // Убираем S/E
        result.innerRangeTo = matches.groups.tPERIOD + matches.groups.tWHERE + matches.groups.tCOUNT;   // Убираем S/E
    }

    // Разбор отдельного периода
    else if (regexSinglePeriod.test(input)) {
        result.innerRangeFrom = input;
        result.innerRangeTo = input;
    }

    // Возвращаем сформированный объект результата
    return result;
}

const extractPeriodType = (input) => {
    if (input) {
        // Список поддерживаемых типов периодов
        const typesMap = {
            D: "day",
            W: "week",
            M: "month",
            Q: "quarter",
            HY: "halfYear",
            Y: "year",
        };

        // Регулярные выражения для проверки типов входных данных
        const regexSpecificDates = /^S\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}>E\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        const regexRelativePeriods = /^(?<from>(?:S|E)(?<fPERIOD>D|W|TD|M|Q|HY|Y)(?<fWHERE>\-|\+|\=)(?<fCOUNT>[1]))>(?<to>(?:S|E)(?<tPERIOD>D|W|TD|M|Q|HY|Y)(?<tWHERE>\-|\+|\=)(?<tCOUNT>[1]))$/;
        const regexSinglePeriod = /^(?<PERIOD>D|W|TD|M|Q|HY|Y)(?<WHERE>\-|\+|\=)(?<COUNT>[1])$/;

        // Если это конкретный диапазон дат, возвращаем "arbitrary"
        if (regexSpecificDates.test(input)) {
            return "arbitrary";
        }

        // Обработка комплексных периодов (SQ-1>EQ=1)
        if (regexRelativePeriods.test(input)) {
            const matches = regexRelativePeriods.exec(input);
            return typesMap[matches.groups.fPERIOD]; // Возвратим тип периода из карты
        }

        // Обработка отдельных периодов (Y+1)
        if (regexSinglePeriod.test(input)) {
            const matches = regexSinglePeriod.exec(input);
            return typesMap[matches.groups.PERIOD]; // Прямой возврат типа периода
        }

        // Если ни одно правило не сработало, выбрасываем ошибку
        
            throw new Error(`Некорректный формат периода: ${input}`);
        
    }
};


export {convertPeriodToHumanReadable, parseInputRange, extractPeriodType}