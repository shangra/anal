class DateWorkClass {
    parseInputRange = (input) => {
        // Регулярные выражения для разных типов входных данных
        const regexSpecificDates = /^S([^\>]*)>E([^\>]*)$/;
        const regexRelativePeriods =
            /^(?<from>(?:S|E)(?<fPERIOD>D|W|TD|M|Q|HY|Y)(?<fWHERE>\-|\+|\=)(?<fCOUNT>[1]))>(?<to>(?:S|E)(?<tPERIOD>D|W|TD|M|Q|HY|Y)(?<tWHERE>\-|\+|\=)(?<tCOUNT>[1]))$/;
        const regexSinglePeriod = /^(?<PERIOD>D|W|TD|M|Q|HY|Y)(?<WHERE>\-|\+|\=)(?<COUNT>[1])$/;

        // Результат по умолчанию
        let result = {};

        // Разбор конкретного диапазона дат
        if (regexSpecificDates.test(input)) {
            const matches = input.match(regexSpecificDates);
            result.innerRangeFrom = matches[1]; // Оставляем без изменений
            result.innerRangeTo = matches[2]; // Оставляем без изменений
        }

        // Разбор относительных периодов
        else if (regexRelativePeriods.test(input)) {
            const matches = regexRelativePeriods.exec(input);
            result.innerRangeFrom =
                matches.groups.fPERIOD + matches.groups.fWHERE + matches.groups.fCOUNT; // Убираем S/E
            result.innerRangeTo =
                matches.groups.tPERIOD + matches.groups.tWHERE + matches.groups.tCOUNT; // Убираем S/E
        }

        // Разбор отдельного периода
        else if (regexSinglePeriod.test(input)) {
            result.innerRangeFrom = input;
            result.innerRangeTo = input;
        }

        // Возвращаем сформированный объект результата
        return result;
    };

    getDateTime = (range, type = 'datetime') => {
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
                result.from = new Date(
                    result.from.setDate(result.from.getDate() - result.from.getDay() - 6)
                );
                result.to = new Date(result.to.setDate(result.to.getDate() - result.to.getDay()));
                break;
            }
            case 'W=1': {
                result.from = new Date(
                    result.from.setDate(result.from.getDate() - result.from.getDay() + 1)
                );
                result.to = new Date(
                    result.to.setDate(result.to.getDate() - result.to.getDay() + 7)
                );
                break;
            }
            case 'W+1': {
                result.from = new Date(
                    result.from.setDate(result.from.getDate() - result.from.getDay() + 8)
                );
                result.to = new Date(
                    result.to.setDate(result.to.getDate() - result.to.getDay() + 14)
                );
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
                result.from = new Date(
                    result.from.getFullYear(),
                    getQuarter(result.from.getMonth()).from - 3,
                    1
                );
                result.to = new Date(
                    result.to.getFullYear(),
                    getQuarter(result.to.getMonth()).to - 3,
                    0
                );
                break;
            }
            case 'Q=1': {
                result.from = new Date(
                    result.from.getFullYear(),
                    getQuarter(result.from.getMonth()).from,
                    1
                );
                result.to = new Date(
                    result.to.getFullYear(),
                    getQuarter(result.to.getMonth()).to,
                    0
                );
                break;
            }
            case 'Q+1': {
                result.from = new Date(
                    result.from.getFullYear(),
                    getQuarter(result.from.getMonth()).from + 3,
                    1
                );
                result.to = new Date(
                    result.to.getFullYear(),
                    getQuarter(result.to.getMonth()).to + 3,
                    0
                );
                break;
            }

            case 'HY-1': {
                result.from = new Date(
                    result.from.getFullYear(),
                    getHalfYear(result.from.getMonth()).from - 6,
                    1
                );
                result.to = new Date(
                    result.to.getFullYear(),
                    getHalfYear(result.to.getMonth()).to - 6,
                    0
                );
                break;
            }
            case 'HY=1': {
                result.from = new Date(
                    result.from.getFullYear(),
                    getHalfYear(result.from.getMonth()).from,
                    1
                );
                result.to = new Date(
                    result.to.getFullYear(),
                    getHalfYear(result.to.getMonth()).to,
                    0
                );
                break;
            }
            case 'HY+1': {
                result.from = new Date(
                    result.from.getFullYear(),
                    getHalfYear(result.from.getMonth()).from + 6,
                    1
                );
                result.to = new Date(
                    result.to.getFullYear(),
                    getHalfYear(result.to.getMonth()).to + 6,
                    0
                );
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
        return { from: dateFrom, to: dateTo };
    };

    getDatesFromPeriod = (period) => {
        const periodText = period ?? 'D=1';
        const innerRange = this.parseInputRange(periodText);
        if (innerRange.innerRangeFrom && innerRange.innerRangeTo) {
            const datesFrom =
                innerRange.innerRangeFrom.length > 9
                    ? { from: innerRange.innerRangeFrom }
                    : this.getDateTime(innerRange.innerRangeFrom);
            const datesTo =
                innerRange.innerRangeTo.length > 9
                    ? { to: innerRange.innerRangeTo }
                    : this.getDateTime(innerRange.innerRangeTo);
            const dateFrom = datesFrom.from;
            const dateTo = datesTo.to;

            return { dateFrom, dateTo };
        }
        return { dateFrom: undefined, dateTo: undefined };
    };

    dateBeetwen = (date, period) => {
        let result = false;

        const { dateFrom, dateTo } = this.getDatesFromPeriod(period);
        if (date >= dateFrom && date <= dateTo) {
            result = true;
        }

        return result;
    };
}

const DateWork = new DateWorkClass();
module.exports = {
    DateWorkClass,
    DateWork,
    dateBeetwen: DateWork.dateBeetwen,
    getDatesFromPeriod: DateWork.getDatesFromPeriod,
};
