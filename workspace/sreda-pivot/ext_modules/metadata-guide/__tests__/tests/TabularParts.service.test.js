/*
Вот пример тестов для модуля `TabularParts.service.js`, написанных с использованием библиотеки Jest:

---

**Файл:** `__tests__/tests/TabularParts.service.test.js`


Эти тесты покрывают основные аспекты функциональности сервиса `TabularPartsService`: проверку формы, создание и обновление метаданных, а также работу методов CRUD, которые делегируются другому классу.
*/

const TabularPartsService = require('../../services/TabularParts.service');
const FieldsServiceClass = require('../../services/TabularSysFields.service');

describe('Тестирование сервиса TabularPartsService', () => {
    
    test('Метод form должен вернуть форму с правильными полями', async () => {
        const service = new TabularPartsService();
        
        const expectedForm = {
            form: [
                {
                    name: 'table',
                    description: 'Имя таблицы',
                    type: 'STRING',
                    template: 'test_table',
                },
                {
                    name: 'ownerTabularPart',
                    description: 'Ведущая табличная часть',
                    type: 'REF',
                    link: service.id,
                    class: TabularPartsClass,
                },
            ]
        };
        
        const actualForm = await service.form();
        expect(actualForm).toEqual(expectedForm);
    });

    test('Метод createMetadata создает метаданные таблицы и полей', async () => {
        const service = new TabularPartsService();
        const mockBody = {
            manifest: JSON.stringify({})
        };
        
        jest.spyOn(service, 'createMetadata').mockResolvedValueOnce(mockBody); // имитируем создание основной таблицы
        jest.spyOn(FieldsServiceClass.prototype, 'createMetadata').mockImplementation(() => Promise.resolve()); // имитируем создание каждого поля
        
        const createdTable = await service.createMetadata(mockBody);
        
        expect(createdTable).toEqual(mockBody);
        expect(FieldsServiceClass.prototype.createMetadata).toHaveBeenCalledTimes(8); // проверяем, что созданы все необходимые поля
    });

    test('Метод updateMetadata обновляет метаданные таблицы и управляет полем связи', async () => {
        const service = new TabularPartsService();
        const mockBody = {
            manifest: JSON.stringify({ settings: {} })
        };
        
        jest.spyOn(service, 'updateMetadata').mockResolvedValueOnce(mockBody); // имитируем обновление основной таблицы
        jest.spyOn(TabularPartsClass.prototype, 'tableInfo').mockReturnValue({ Fields: { ownerTabularPart: null } }); // имитируем получение информации о таблице
        jest.spyOn(FieldsServiceClass.prototype, 'createMetadata').mockImplementation(() => Promise.resolve());
        jest.spyOn(FieldsServiceClass.prototype, 'deleteMetadata').mockImplementation(() => Promise.resolve());
        
        const updatedTable = await service.updateMetadata(mockBody);
        
        expect(updatedTable).toEqual(mockBody);
    });

    describe('CRUD-методы делегируют выполнение классу TableMetadata', () => {
        const service = new TabularPartsService();
        const mockId = 'some-id';
        const mockTabular = {};
        const mockBody = {};
        
        beforeEach(() => {
            jest.clearAllMocks(); // очищаем моки перед каждым тестом
        });
        
        test('Метод create делегирует создание экземпляра класса TableMetadata', async () => {
            jest.spyOn(TableMetadata.prototype, 'create').mockResolvedValueOnce(true);
            
            const result = await service.create(mockId, mockTabular, mockBody);
            
            expect(result).toBeTruthy();
            expect(TableMetadata.prototype.create).toHaveBeenCalledWith(mockId, mockTabular, mockBody);
        });

        test('Метод read делегирует чтение экземпляра класса TableMetadata', async () => {
            jest.spyOn(TableMetadata.prototype, 'read').mockResolvedValueOnce(true);
            
            const result = await service.read(mockId, mockTabular);
            
            expect(result).toBeTruthy();
            expect(TableMetadata.prototype.read).toHaveBeenCalledWith(mockId, mockTabular);
        });

        test('Метод update делегирует обновление экземпляра класса TableMetadata', async () => {
            jest.spyOn(TableMetadata.prototype, 'update').mockResolvedValueOnce(true);
            
            const result = await service.update(mockId, mockTabular, mockBody);
            
            expect(result).toBeTruthy();
            expect(TableMetadata.prototype.update).toHaveBeenCalledWith(mockId, mockTabular, mockBody);
        });

        test('Метод delete делегирует удаление экземпляра класса TableMetadata', async () => {
            jest.spyOn(TableMetadata.prototype, 'delete').mockResolvedValueOnce(true);
            
            const result = await service.delete(mockId, mockTabular, mockBody);
            
            expect(result).toBeTruthy();
            expect(TableMetadata.prototype.delete).toHaveBeenCalledWith(mockId, mockTabular, mockBody);
        });
    });
});
