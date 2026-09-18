/*
Вот пример тестов для класса `RlsExtSyncService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/RlsExtSync.service.test.js` следующего содержания:


Эти тесты покрывают основные методы класса, проверяя взаимодействие с зависимостями и правильность выполнения основных операций.
*/

const RlsExtSyncService = require('../../services/RlsExtSync.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const RlsCoreService = require('../../rls-core/services/RlsCore.service');
const MemorySave = require('../../../core/services/memory-save');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../rls-core/services/RlsCore.service');
jest.mock('../../../core/services/memory-save');

describe('RlsExtSyncService', () => {
    let service;

    beforeEach(() => {
        service = new RlsExtSyncService();

        jest.resetAllMocks(); // Сбрасываем состояние моков перед каждым тестом
    });

    describe('dropBefore', () => {
        test('вызывает метод drop', async () => {
            service.drop = jest.fn().mockResolvedValue(undefined); // Мокируем метод drop

            await service.dropBefore({}, { id: 'some-id' });

            expect(service.drop).toHaveBeenCalledWith({}, { id: 'some-id' });
        });
    });

    describe('syncAfter', () => {
        test('вызывает метод sync', async () => {
            service.sync = jest.fn().mockResolvedValue(undefined); // Мокируем метод sync

            await service.syncAfter({}, { id: 'some-id' });

            expect(service.sync).toHaveBeenCalledWith({}, { id: 'some-id' });
        });
    });

    describe('formAfter', () => {
        test('добавляет форму RLS в результат', () => {
            const innerResult = { form: undefined };

            const updatedInnerResult = service.formAfter(innerResult);

            expect(updatedInnerResult.form).toEqual([
                {
                    name: 'rls',
                    description: 'Включить RLS на таблице',
                    type: 'BOOL',
                    default: false,
                },
            ]);
        });
    });

    describe('readBefore', () => {
        test('получает настройки RLS и таблицы через getRlsAndTable', async () => {
            service.getRlsAndTable = jest
                .fn()
                .mockResolvedValue({ rls: true, table: 'my-table' });

            await service.readBefore({}, { id: 'some-id' });

            expect(service.getRlsAndTable).toHaveBeenCalledWith('some-id');
        });
    });

    describe('getRlsAndTable', () => {
        test('использует кеширование через MemorySave', async () => {
            MemorySave.get = jest.fn().mockResolvedValue(null);
            MemorySave.set = jest.fn();

            const metadataMock = {
                manifest: { settings: { rls: true, table: 'my-table' } },
            };
            MetadataClass.prototype.getItem = jest
                .fn()
                .mockResolvedValue(metadataMock);

            await service.getRlsAndTable('some-id');

            expect(MemorySave.get).toHaveBeenCalledWith(
                `rls_table_metadata_id:some-id`
            );
            expect(MetadataClass.prototype.getItem).toHaveBeenCalledWith(
                'some-id'
            );
            expect(MemorySave.set).toHaveBeenCalledWith(
                `rls_table_metadata_id:some-id`,
                { rls: true, table: 'my-table' }
            );
        });
    });

    describe('drop', () => {
        test('очищает RLS и удаляет представление', async () => {
            service.clearRls = jest.fn().mockResolvedValue(undefined);
            service.dropView = jest.fn().mockResolvedValue(undefined);

            const metadataMock = {
                manifest: { settings: { table: 'my-table' } },
            };
            MetadataClass.prototype.getItem = jest
                .fn()
                .mockResolvedValue(metadataMock);

            await service.drop({}, { id: 'some-id' });

            expect(service.clearRls).toHaveBeenCalledWith(metadataMock);
            expect(service.dropView).toHaveBeenCalledWith(metadataMock);
        });
    });

    describe('sync', () => {
        test('синхронизирует RLS при включенном флаге', async () => {
            service.clearRls = jest.fn().mockResolvedValue(undefined);
            service.addRls = jest.fn().mockResolvedValue(undefined);
            service.createView = jest.fn().mockResolvedValue(undefined);

            const metadataMock = {
                manifest: { settings: { rls: true, table: 'my-table' } },
            };
            MetadataClass.prototype.getItem = jest
                .fn()
                .mockResolvedValue(metadataMock);

            await service.sync({}, { id: 'some-id' });

            expect(service.clearRls).toHaveBeenCalledWith(metadataMock);
            expect(service.addRls).toHaveBeenCalledWith(metadataMock);
            expect(service.createView).toHaveBeenCalledWith(metadataMock);
        });

        test('очищает RLS при отключенном флаге', async () => {
            service.clearRls = jest.fn().mockResolvedValue(undefined);

            const metadataMock = {
                manifest: { settings: { rls: false, table: 'my-table' } },
            };
            MetadataClass.prototype.getItem = jest
                .fn()
                .mockResolvedValue(metadataMock);

            await service.sync({}, { id: 'some-id' });

            expect(service.clearRls).toHaveBeenCalledWith(metadataMock);
        });
    });

    describe('clearRls', () => {
        test('удаляет все разрешения через RlsCore', async () => {
            RlsCoreService.prototype.delAllPermissions = jest
                .fn()
                .mockResolvedValue(undefined);

            const metadataMock = {
                manifest: { settings: { table: 'my-table' } },
            };

            await service.clearRls(metadataMock);

            expect(
                RlsCoreService.prototype.delAllPermissions
            ).toHaveBeenCalledWith('my-table');
        });
    });

    describe('addRls', () => {
        test('добавляет разрешения через рекурсивную функцию', async () => {
            service.recursiveAddRls = jest
                .fn()
                .mockImplementation((_, __, limit, offset) => {
                    if (offset === 0) return; // имитируем отсутствие записей
                });

            const metadataMock = {
                manifest: { settings: { rls: true, table: 'my-table' } },
            };

            await service.addRls(metadataMock);

            expect(service.recursiveAddRls).toHaveBeenCalledWith(
                expect.anything(),
                'my-table',
                1000,
                0
            );
        });
    });

    describe('recursiveAddRls', () => {
        test('рекурсивно добавляет разрешения', async () => {
            const connectorMock = {
                findAll: jest
                    .fn()
                    .mockResolvedValue([
                        { id: 'record-1' },
                        { id: 'record-2' },
                    ]),
            };
            service.getConnect = jest.fn().mockResolvedValue(connectorMock);
            RlsCoreService.prototype.addPermissions = jest
                .fn()
                .mockResolvedValue(undefined);

            await service.recursiveAddRls(connectorMock, 'my-table', 1000, 0);

            expect(service.getConnect).toHaveBeenCalled();
            expect(
                RlsCoreService.prototype.addPermissions
            ).toHaveBeenCalledTimes(3);
            expect(setTimeout).toHaveBeenCalled();
        });
    });

    describe('dropView', () => {
        test('удаляет представление', async () => {
            const querySpy = jest.spyOn(db.sequelize, 'query');

            const metadataMock = {
                manifest: { settings: { table: 'my-table' } },
            };

            await service.dropView(metadataMock);

            expect(querySpy).toHaveBeenCalledWith(
                `DROP VIEW IF EXISTS "public"."RlsMetadata_my-table";`
            );
        });
    });

    describe('createView', () => {
        test('создает новое представление', async () => {
            const querySpy = jest.spyOn(db.sequelize, 'query');

            const metadataMock = {
                manifest: { settings: { table: 'my-table' } },
            };
            const connectorMock = { Model: { schema: 'public' } };
            service.getConnect = jest.fn().mockResolvedValue(connectorMock);

            await service.createView(metadataMock);

            expect(service.getConnect).toHaveBeenCalled();
            expect(querySpy).toHaveBeenCalled();
        });
    });

    describe('isRlsOn', () => {
        test('возвращает true при включенном RLS', () => {
            const metadataMock = { manifest: { settings: { rls: true } } };

            const result = service.isRlsOn(metadataMock);

            expect(result).toBe(true);
        });

        test('возвращает false при выключенном RLS', () => {
            const metadataMock = { manifest: { settings: { rls: false } } };

            const result = service.isRlsOn(metadataMock);

            expect(result).toBe(false);
        });
    });
});
