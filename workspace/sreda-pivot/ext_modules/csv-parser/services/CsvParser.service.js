const Extensions = require('../../../core/class/Extensions.class');

/**
 * @typedef {{ x: [number?, number?], y?: [number?, number?] }} Condition
 */

class СsvParserService extends Extensions {
    /**
     * парсит цсв файл к виду
     * заголовки(1 строка)
     * данные
     *
     * @param {string} str
     * @param {{ data?: Condition[]}} [conditions]
     * @param {string} [columnDelimeter]
     * @param {string} [rowDelimeter]
     * @returns {{ headers: string[], data: string[][] }}
     */
    parse(str, conditions = { data: [] }, columnDelimeter = ';', rowDelimeter = '\n') {
        const rawData = str.split(rowDelimeter).map((item) => item.trim()); //fix чтобы отрезать лишние пробелы и спецсимволы

        const data = [];
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            data.push(row.split(columnDelimeter).map((item) => item.trim())); //fix чтобы отрезать лишние пробелы и спецсимволы
        }

        const [headers, ...cutData] = this.cutDataByConditions(data, conditions?.data || []);

        return {
            headers,
            data: cutData,
        };
    }

    /**
     * вырезать из документа определенную область
     *
     * @param {string[][]} data
     * @param {Condition[]} conditions
     */
    cutDataByConditions(data, conditions) {
        if (!conditions.length) {
            return data;
        }

        const result = [];
        for (let i = 0; i < data.length; i++) {
            let check = true;
            for (let splitIndex = 0; splitIndex < conditions.length; splitIndex++) {
                const { y } = conditions[splitIndex];

                check = this.check(y, i);

                if (check) {
                    break;
                }
            }

            if (!check) {
                continue;
            }

            const row = [];
            const item = data[i];

            for (let j = 0; j < item.length; j++) {
                const xData = item[j];

                let check = true;
                for (let splitIndex = 0; splitIndex < conditions.length; splitIndex++) {
                    const { x } = conditions[splitIndex];

                    check = this.check(x, j);

                    if (!check) {
                        break;
                    }
                }

                if (!check) {
                    continue;
                }

                row.push(xData);
            }

            result.push(row);
        }

        return result;
    }

    /**
     *
     * @param {[number?, number?]} param0
     * @param {number} index
     */
    check([left, right], index) {
        if (typeof left === 'number') {
            if (index < left) {
                return false;
            }
        }

        if (typeof right === 'number') {
            if (index > right) {
                return false;
            }
        }

        return true;
    }
}

module.exports = СsvParserService;
