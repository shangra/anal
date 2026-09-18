const fs = require('fs');
const CsvParserServiceClass = require('../../services/CsvParser.service');
const { join } = require('path');
const CsvParserService = new CsvParserServiceClass();

describe('parse csv', () => {
    it('parse csv', () => {
        const fileData = fs.readFileSync(join(__dirname, '../fixtures/test.csv'), {
            encoding: 'utf8',
        });
        expect(fileData).not.toBeNull();

        const { headers, data } = CsvParserService.parse(fileData, {
            data: [
                { x: [1, 4], y: [1, 1] },
                { x: [1, 4], y: [2] },
            ],
        });

        expect(headers).toEqual(['h1', 'h2', 'h3', 'h4']);
        expect(data).toEqual([
            ['1', '2', '3', '4'],
            ['4', '3', '2', '1'],
            ['1', '2', '3', '4'],
            ['4', '3', '2', '1'],
        ]);
    });
});
