export = СsvParserService;
/**
 * @typedef {{ x: [number?, number?], y?: [number?, number?] }} Condition
 */
declare class СsvParserService extends Extensions {
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
    parse(
        str: string,
        conditions?: {
            data?: Condition[];
        },
        columnDelimeter?: string,
        rowDelimeter?: string
    ): {
        headers: string[];
        data: string[][];
    };
    /**
     * вырезать из документа определенную область
     *
     * @param {string[][]} data
     * @param {Condition[]} conditions
     */
    cutDataByConditions(data: string[][], conditions: Condition[]): string[][];
    /**
     *
     * @param {[number?, number?]} param0
     * @param {number} index
     */
    check([left, right]: [number?, number?], index: number): boolean;
}
declare namespace СsvParserService {
    export { Condition };
}
import Extensions = require('../../../core/class/Extensions.class');
type Condition = {
    x: [number?, number?];
    y?: [number?, number?];
};
//# sourceMappingURL=CsvParser.service.d.ts.map
