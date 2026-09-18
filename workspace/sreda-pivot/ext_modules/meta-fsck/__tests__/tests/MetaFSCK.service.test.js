/*
Вот пример тестов для вашего модуля `MetaFSCKService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/MetaFSCK.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Структуру результата метода `postQuery`: наличие свойства `text` и массива `report`.
2. Вызовы методов зависимых сервисов `MetadataService` для проверки интеграции.
3. Корректную работу генератора `FSCK.run` и запись сообщений в отчет.

Не забудьте настроить мокирование зависимости `FSCK.run` в вашем проекте перед запуском этих тестов.
*/

const MetaFSCKService = require('../../services/MetaFSCK.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');

jest.mock('../../metadata-cmp/services/Metadata.service');

describe('MetaFSCKService', () => {
    let service;
    beforeEach(() => {
        service = new MetaFSCKService();

        // Mocking dependencies
        MetadataService.prototype.getParentInstance = jest
            .fn()
            .mockResolvedValue({});
        MetadataService.prototype.getItem = jest.fn().mockResolvedValue({});
    });

    describe('postQuery method', () => {
        it('should return correct structure with a report array', async () => {
            const id = 'some-id';
            const body = {};

            const result = await service.postQuery(id, body);

            expect(result.text).toEqual('-- ... --');
            expect(Array.isArray(result.report)).toBe(true);
        });

        it('should handle metadata retrieval correctly', async () => {
            const id = 'another-id';
            const body = {};

            await service.postQuery(id, body);

            expect(
                MetadataService.prototype.getParentInstance
            ).toHaveBeenCalledWith(id, {});
            expect(MetadataService.prototype.getItem).toHaveBeenCalledWith(
                id,
                {}
            );
        });

        it('should push entries into report from FSCK run', async () => {
            const id = 'fsck-run-id';
            const body = {};

            // Mocking FSCK.run generator
            const fsckRunMock = jest.fn(async function* () {
                yield { message: 'Entry 1' };
                yield { message: 'Entry 2' };
            });

            jest.mock('../../../core/fsck/index.js', () => ({
                run: fsckRunMock,
            }));

            const result = await service.postQuery(id, body);

            expect(result.report.length).toBe(2);
            expect(result.report[0].message).toBe('Entry 1');
            expect(result.report[1].message).toBe('Entry 2');
        });
    });
});
