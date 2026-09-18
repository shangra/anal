const WhereFormaterService = require('../index');

const { normalize, removeLevel } = require('./fixture');

describe('Проверка форматирования объектов where', () => {
    const WhereFormater = new WhereFormaterService();

    it.each(normalize)(`normalize`, ({ input, output }) => {
        const val = WhereFormater.normalize(input);

        expect(val).toEqual(output || {});
    });

    it.each(removeLevel)(`removeLevel`, ({ input, output }) => {
        const val = WhereFormater.removeLevel(input);

        expect(val).toEqual(output || {});
    });
});
