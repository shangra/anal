/**
 * Тесты контроллера Users.
 *
 * Сервис мокается, чтобы изолировать логику контроллера (try/catch,
 * парсинг req.params / req.body, передача в сервис, вызов next).
 *
 * Контроллер Users использует инстанс сервиса, созданный на уровне модуля
 * (`const UsersService = new UsersServiceClass();`), поэтому мы подменяем
 * модуль `../services/Users.service` на фабрику, которая возвращает
 * наш мок-инстанс как `module.exports` (контроллер делает `new`).
 */

jest.mock('../../services/Users.service', () => {
    const instance = {
        metadata: jest.fn(),
        metadataItem: jest.fn(),
        createMetadata: jest.fn(),
        updateMetadata: jest.fn(),
        deleteMetadata: jest.fn(),
        create: jest.fn(),
        read: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    return jest.fn().mockImplementation(() => instance);
});

const UsersServiceModule = require('../../services/Users.service');
const UsersController = require('../../controllers/Users.controller');

const usersService = UsersServiceModule.mock.results[0].value;

const mockReq = (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
});

const mockRes = () => {
    const res = {};
    res.json = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = () => jest.fn();

describe('UsersController', () => {
    beforeEach(() => {
        Object.values(usersService).forEach(
            (fn) => fn.mockClear && fn.mockClear()
        );
    });

    describe('metadata', () => {
        test('должен вызвать UsersService.metadata и вернуть JSON', async () => {
            usersService.metadata.mockResolvedValueOnce({
                type: 'create',
                form: [],
            });
            const req = mockReq();
            const res = mockRes();
            const next = mockNext();

            await UsersController.metadata(req, res, next);

            expect(usersService.metadata).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith({ type: 'create', form: [] });
            expect(next).not.toHaveBeenCalled();
        });

        test('должен передать ошибку в next при сбое сервиса', async () => {
            const error = new Error('boom');
            usersService.metadata.mockRejectedValueOnce(error);
            const req = mockReq();
            const res = mockRes();
            const next = mockNext();

            await UsersController.metadata(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe('metadataItem', () => {
        test('должен передать id из params в сервис и вернуть JSON', async () => {
            usersService.metadataItem.mockResolvedValueOnce({
                type: 'update',
                id: 'u1',
            });
            const req = mockReq({ params: { id: 'u1' } });
            const res = mockRes();
            const next = mockNext();

            await UsersController.metadataItem(req, res, next);

            expect(usersService.metadataItem).toHaveBeenCalledWith('u1');
            expect(res.json).toHaveBeenCalledWith({ type: 'update', id: 'u1' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('createMetadata', () => {
        test('должен передать body в сервис и вернуть JSON', async () => {
            usersService.createMetadata.mockResolvedValueOnce({ id: 'new-id' });
            const body = { name: 'New User' };
            const req = mockReq({ body });
            const res = mockRes();
            const next = mockNext();

            await UsersController.createMetadata(req, res, next);

            expect(usersService.createMetadata).toHaveBeenCalledWith(body);
            expect(res.json).toHaveBeenCalledWith({ id: 'new-id' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('updateMetadata', () => {
        test('должен передать id и body в сервис', async () => {
            usersService.updateMetadata.mockResolvedValueOnce({
                success: true,
            });
            const req = mockReq({
                params: { id: 'u-1' },
                body: { name: 'Renamed' },
            });
            const res = mockRes();
            const next = mockNext();

            await UsersController.updateMetadata(req, res, next);

            expect(usersService.updateMetadata).toHaveBeenCalledWith('u-1', {
                name: 'Renamed',
            });
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('deleteMetadata', () => {
        test('должен передать id из params в сервис', async () => {
            usersService.deleteMetadata.mockResolvedValueOnce({
                success: true,
            });
            const req = mockReq({ params: { id: 'u-1' } });
            const res = mockRes();
            const next = mockNext();

            await UsersController.deleteMetadata(req, res, next);

            expect(usersService.deleteMetadata).toHaveBeenCalledWith('u-1');
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('create (data)', () => {
        test('должен передать id и body в UsersService.create', async () => {
            usersService.create.mockResolvedValueOnce({ id: 'data-id' });
            const req = mockReq({
                params: { id: 'meta-id' },
                body: { login: 'admin' },
            });
            const res = mockRes();
            const next = mockNext();

            await UsersController.create(req, res, next);

            expect(usersService.create).toHaveBeenCalledWith('meta-id', {
                login: 'admin',
            });
            expect(res.json).toHaveBeenCalledWith({ id: 'data-id' });
        });
    });

    describe('read (data)', () => {
        test('должен парсить options из query (JSON-строка) и передать в UsersService.read', async () => {
            usersService.read.mockResolvedValueOnce({ rows: [] });
            const req = mockReq({
                params: { id: 'meta-id' },
                query: { options: '{"limit":10,"offset":0}' },
            });
            const res = mockRes();
            const next = mockNext();

            await UsersController.read(req, res, next);

            expect(usersService.read).toHaveBeenCalledWith('meta-id', {
                limit: 10,
                offset: 0,
            });
            expect(res.json).toHaveBeenCalledWith({ rows: [] });
        });

        test('должен использовать пустой объект если options не задан', async () => {
            usersService.read.mockResolvedValueOnce({ rows: [] });
            const req = mockReq({ params: { id: 'meta-id' }, query: {} });
            const res = mockRes();
            const next = mockNext();

            await UsersController.read(req, res, next);

            expect(usersService.read).toHaveBeenCalledWith('meta-id', {});
        });
    });

    describe('update (data)', () => {
        test('должен передать id и body в UsersService.update', async () => {
            usersService.update.mockResolvedValueOnce({ success: true });
            const req = mockReq({
                params: { id: 'meta-id' },
                body: { name: 'New' },
            });
            const res = mockRes();
            const next = mockNext();

            await UsersController.update(req, res, next);

            expect(usersService.update).toHaveBeenCalledWith('meta-id', {
                name: 'New',
            });
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('delete (data)', () => {
        test('должен передать id и body в UsersService.delete', async () => {
            usersService.delete.mockResolvedValueOnce({ success: true });
            const req = mockReq({
                params: { id: 'meta-id' },
                body: { id: 'user-1' },
            });
            const res = mockRes();
            const next = mockNext();

            await UsersController.delete(req, res, next);

            expect(usersService.delete).toHaveBeenCalledWith('meta-id', {
                id: 'user-1',
            });
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('должен передавать ошибки сервиса в next', async () => {
            const error = new Error('delete failed');
            usersService.delete.mockRejectedValueOnce(error);
            const req = mockReq({ params: { id: 'meta-id' }, body: {} });
            const res = mockRes();
            const next = mockNext();

            await UsersController.delete(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.json).not.toHaveBeenCalled();
        });
    });
});
