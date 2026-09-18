/**
 * Тесты для UsersService.
 *
 * Покрытие:
 *  - getFormFields() — структура общих полей формы
 *  - form() — структура формы с вкладкой «Основное»
 *  - validate() — обязательность поля «Имя»
 *  - createMetadata() / updateMetadata() — выброс BadRequest при ошибках валидации,
 *    делегирование в MetadataCMP.setMetadata/updMetadata при валидных данных
 *  - getAll() / getChildren() — получение и преобразование в формат NodeType
 *  - _convertToNodeType() — корректное преобразование записи
 *  - getTreeChildrenV3() — скрытие узла класса «Users»
 *
 * Использует мок metadata-cmp/services/Metadata.service — реальная БД не поднимается.
 * Экземпляр Metadata захватывается в UsersService при require, поэтому тесты мутируют
 * его методы через глобальный singleton metadataInstance.
 */

jest.mock('../../../metadata-cmp/services/Metadata.service', () => {
    const instance = {
        setMetadata: jest
            .fn()
            .mockResolvedValue({ success: true, id: 'created-id' }),
        updMetadata: jest.fn().mockResolvedValue([1, [{ id: 'updated-id' }]]),
        delMetadata: jest.fn().mockResolvedValue({ success: true }),
        getMetadataChildren: jest.fn().mockResolvedValue([]),
        getItem: jest
            .fn()
            .mockResolvedValue({ manifest: { name: 'Test', description: '' } }),
    };
    const Ctor = jest.fn(() => instance);
    Ctor.__instance = instance;
    return Ctor;
});

const ApiError = require('../../../../core/exceptions/ApiError');
const MetadataService = require('../../../metadata-cmp/services/Metadata.service');
const UsersService = require('../../services/Users.service');

const metadataInstance = MetadataService.__instance;

describe('UsersService', () => {
    let service;

    beforeEach(() => {
        Object.values(metadataInstance).forEach(
            (fn) => fn.mockClear && fn.mockClear()
        );
        // восстанавливаем дефолтные реализации после mockClear
        metadataInstance.setMetadata.mockResolvedValue({
            success: true,
            id: 'created-id',
        });
        metadataInstance.updMetadata.mockResolvedValue([
            1,
            [{ id: 'updated-id' }],
        ]);
        metadataInstance.delMetadata.mockResolvedValue({ success: true });
        metadataInstance.getMetadataChildren.mockResolvedValue([]);
        metadataInstance.getItem.mockResolvedValue({
            manifest: { name: 'Test', description: '' },
        });

        service = new UsersService();
    });

    describe('getFormFields', () => {
        test('должен возвращать три REF-поля формы', () => {
            const fields = service.getFormFields();
            expect(fields).toHaveLength(3);
            expect(fields.every((f) => f.type === 'REF')).toBe(true);
            expect(fields.map((f) => f.name)).toEqual([
                'formelement',
                'formlist',
                'formchoice',
            ]);
        });

        test('каждое поле должно ссылаться на локальную форму (link.type === "local")', () => {
            const fields = service.getFormFields();
            fields.forEach((field) => {
                expect(field.link.type).toBe('local');
                expect(Array.isArray(field.link.metalink)).toBe(true);
                expect(field.link.metalink).toHaveLength(2);
            });
        });
    });

    describe('form', () => {
        test('должен вернуть форму с вкладкой "Основное" и общим списком полей', async () => {
            const result = await service.form('any-id');
            expect(result.form).toHaveLength(1);
            const [block] = result.form;
            expect(block.component).toBe('MetadataUiKit.Tabs');
            expect(block.props.tabs).toHaveLength(1);
            expect(block.props.tabs[0].name).toBe('Основное');
            expect(block.props.tabs[0].content).toHaveLength(3);
        });
    });

    describe('validate', () => {
        test('должен возвращать ошибку если поле name пустое или отсутствует', async () => {
            await expect(service.validate({})).resolves.toContain(
                'Поле "Имя" обязательно для заполнения'
            );
            await expect(service.validate({ name: '' })).resolves.toContain(
                'Поле "Имя" обязательно для заполнения'
            );
            await expect(service.validate({ name: '   ' })).resolves.toContain(
                'Поле "Имя" обязательно для заполнения'
            );
        });

        test('не должен возвращать ошибок если name указано', async () => {
            const errors = await service.validate({ name: 'Test User' });
            expect(errors).toHaveLength(0);
        });
    });

    describe('createMetadata', () => {
        test('должен выбросить ApiError.BadRequest если name пустое', async () => {
            await expect(service.createMetadata({})).rejects.toBeInstanceOf(
                ApiError
            );
            await expect(service.createMetadata({})).rejects.toMatchObject({
                status: 400,
            });
        });

        test('должен делегировать в Metadata.setMetadata при валидных данных', async () => {
            const body = { name: 'Test User', parentId: 'parent-id' };
            await service.createMetadata(body);
            expect(metadataInstance.setMetadata).toHaveBeenCalledTimes(1);
            expect(metadataInstance.setMetadata).toHaveBeenCalledWith(
                body,
                undefined
            );
        });

        test('не должен вызывать setMetadata при ошибке валидации', async () => {
            await expect(service.createMetadata({})).rejects.toBeInstanceOf(
                ApiError
            );
            expect(metadataInstance.setMetadata).not.toHaveBeenCalled();
        });
    });

    describe('updateMetadata', () => {
        test('должен выбросить ApiError.BadRequest если name пустое', async () => {
            await expect(
                service.updateMetadata('id-1', {})
            ).rejects.toBeInstanceOf(ApiError);
            await expect(
                service.updateMetadata('id-1', {})
            ).rejects.toMatchObject({ status: 400 });
        });

        test('должен делегировать в Metadata.updMetadata при валидных данных', async () => {
            const id = 'item-id';
            const body = { name: 'Updated User' };
            await service.updateMetadata(id, body);
            expect(metadataInstance.updMetadata).toHaveBeenCalledTimes(1);
            expect(metadataInstance.updMetadata).toHaveBeenCalledWith(
                id,
                body,
                undefined
            );
        });

        test('не должен вызывать updMetadata при ошибке валидации', async () => {
            await expect(
                service.updateMetadata('id-1', {})
            ).rejects.toBeInstanceOf(ApiError);
            expect(metadataInstance.updMetadata).not.toHaveBeenCalled();
        });
    });

    describe('getAll', () => {
        test('должен запросить дочерние метаданные через Metadata.getMetadataChildren(this.id)', async () => {
            metadataInstance.getMetadataChildren.mockResolvedValueOnce([
                { id: 'u1', name: 'User 1' },
                { id: 'u2', name: 'User 2' },
            ]);

            const result = await service.getAll();

            expect(metadataInstance.getMetadataChildren).toHaveBeenCalledWith(
                service.id
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: 'u1',
                title: 'User 1',
                children: [],
                loading: false,
                hasChildren: false,
                class: 'users',
                crud: ['c', 'r', 'u', 'd', 'rls'],
            });
        });

        test('должен вернуть пустой массив если дочерних метаданных нет', async () => {
            const result = await service.getAll();
            expect(result).toEqual([]);
        });
    });

    describe('getChildren', () => {
        test('должен запросить дочерние метаданные по переданному id', async () => {
            const parentId = 'parent-id';
            metadataInstance.getMetadataChildren.mockResolvedValueOnce([
                { id: 'c1', name: 'Child' },
            ]);

            const result = await service.getChildren(parentId);

            expect(metadataInstance.getMetadataChildren).toHaveBeenCalledWith(
                parentId
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'c1',
                title: 'Child',
                class: 'users',
            });
        });
    });

    describe('_convertToNodeType', () => {
        test('должен преобразовать запись пользователя в формат узла дерева', () => {
            const node = service._convertToNodeType({
                id: 'user-id',
                name: 'User Name',
            });
            expect(node).toEqual({
                id: 'user-id',
                title: 'User Name',
                children: [],
                loading: false,
                hasChildren: false,
                class: 'users',
                crud: ['c', 'r', 'u', 'd', 'rls'],
            });
        });
    });

    describe('getTreeChildrenV3', () => {
        test('должен скрыть расширение узла класса "Users"', async () => {
            const result = await service.getTreeChildrenV3([
                { id: 1, class: 'Users' },
                { id: 2, class: 'Other' },
            ]);
            expect(result[0]).toMatchObject({
                id: 1,
                class: 'Users',
                needToLoading: false,
            });
            expect(result[1]).not.toHaveProperty('needToLoading');
        });

        test('должен возвращать новый массив, не модифицируя исходный', async () => {
            const input = [{ id: 1, class: 'Users' }];
            const result = await service.getTreeChildrenV3(input);
            expect(result).not.toBe(input);
            expect(input[0]).not.toHaveProperty('needToLoading');
        });
    });
});
