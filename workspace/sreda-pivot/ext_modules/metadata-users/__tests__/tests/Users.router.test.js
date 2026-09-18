/**
 * HTTP-тесты роутера Users.
 *
 * Создаёт локальный Express-инстанс с подключённым Users.router.js.
 * checkAccess-мiddleware замокан как no-op (pass-through), чтобы не зависеть
 * от auth/authz и не поднимать реальную БД.
 *
 * Тесты проверяют, что роуты правильно диспатчатят запросы в UsersController
 * (а через мок сервиса — в UsersService).
 */

const express = require('express');
const request = require('supertest');

jest.mock(
    '../../../middleware-rest-check-access/services/checkAccess.js',
    () => {
        // Возвращаем middleware-фабрику, которая даёт pass-through next()
        return () => (req, res, next) => next();
    }
);

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
    const Ctor = jest.fn(() => instance);
    Ctor.__instance = instance;
    return Ctor;
});

const UsersServiceModule = require('../../services/Users.service');

function buildApp() {
    // sreda.restmodule должен иметь .Router() для инициализации роутера
    if (!global.sreda) {
        global.sreda = { restmodule: { Router: () => express.Router() } };
    } else if (
        !global.sreda.restmodule ||
        typeof global.sreda.restmodule.Router !== 'function'
    ) {
        global.sreda.restmodule = { Router: () => express.Router() };
    }
    const router = require('../../routers/Users.router');
    const app = express();
    app.use(express.json());
    app.use('/metadata/users', router);
    // Глобальный error handler — превращает ошибки в JSON с правильным статусом
    app.use((err, req, res, _next) => {
        const status = err.status || err.errors?.[0]?.status || 500;
        res.status(status).json({
            message: err.message,
            status,
        });
    });
    return app;
}

describe('Users.router (HTTP)', () => {
    let app;
    let service;

    beforeAll(() => {
        // Захватываем мок-инстанс сервиса после require
        service = UsersServiceModule.__instance;
        // buildApp делает require роутера, который инстанцирует UsersService
        app = buildApp();
    });

    beforeEach(() => {
        Object.values(service).forEach((fn) => fn.mockReset && fn.mockReset());
        // дефолты
        service.metadata.mockResolvedValue({ type: 'create', form: [] });
        service.metadataItem.mockResolvedValue({
            type: 'update',
            id: 'u1',
            form: [],
            data: {},
        });
        service.createMetadata.mockResolvedValue({ id: 'created' });
        service.updateMetadata.mockResolvedValue({ success: true });
        service.deleteMetadata.mockResolvedValue({ success: true });
        service.create.mockResolvedValue({ id: 'data-created' });
        service.read.mockResolvedValue({ rows: [], cols: [], count: 0 });
        service.update.mockResolvedValue({ success: true });
        service.delete.mockResolvedValue({ success: true });
    });

    describe('GET /metadata/users/metadata', () => {
        test('должен вернуть форму создания', async () => {
            const res = await request(app).get('/metadata/users/metadata');
            expect(res.status).toBe(200);
            expect(service.metadata).toHaveBeenCalled();
            expect(res.body).toEqual({ type: 'create', form: [] });
        });
    });

    describe('GET /metadata/users/metadata/:id', () => {
        test('должен вернуть форму редактирования для существующего id', async () => {
            const res = await request(app).get('/metadata/users/metadata/u-1');
            expect(res.status).toBe(200);
            expect(service.metadataItem).toHaveBeenCalledWith('u-1');
            expect(res.body).toEqual({
                type: 'update',
                id: 'u1',
                form: [],
                data: {},
            });
        });
    });

    describe('POST /metadata/users/metadata', () => {
        test('должен передать body в createMetadata', async () => {
            const body = { name: 'New User' };
            const res = await request(app)
                .post('/metadata/users/metadata')
                .send(body);
            expect(res.status).toBe(200);
            expect(service.createMetadata).toHaveBeenCalledWith(body);
            expect(res.body).toEqual({ id: 'created' });
        });

        test('должен вернуть 400 если сервис бросил ApiError.BadRequest', async () => {
            const ApiError = require('../../../../core/exceptions/ApiError');
            service.createMetadata.mockRejectedValueOnce(
                ApiError.BadRequest('Поле "Имя" обязательно для заполнения')
            );
            const res = await request(app)
                .post('/metadata/users/metadata')
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toBe(
                'Поле "Имя" обязательно для заполнения'
            );
        });
    });

    describe('PUT /metadata/users/metadata/:id', () => {
        test('должен передать id и body в updateMetadata', async () => {
            const body = { name: 'Updated' };
            const res = await request(app)
                .put('/metadata/users/metadata/u-1')
                .send(body);
            expect(res.status).toBe(200);
            expect(service.updateMetadata).toHaveBeenCalledWith('u-1', body);
            expect(res.body).toEqual({ success: true });
        });
    });

    describe('DELETE /metadata/users/metadata/:id', () => {
        test('должен передать id в deleteMetadata', async () => {
            const res = await request(app).delete(
                '/metadata/users/metadata/u-1'
            );
            expect(res.status).toBe(200);
            expect(service.deleteMetadata).toHaveBeenCalledWith('u-1');
            expect(res.body).toEqual({ success: true });
        });
    });

    describe('POST /metadata/users/:id', () => {
        test('должен передать id и body в create', async () => {
            const body = { login: 'admin' };
            const res = await request(app)
                .post('/metadata/users/meta-id')
                .send(body);
            expect(res.status).toBe(200);
            expect(service.create).toHaveBeenCalledWith('meta-id', body);
            expect(res.body).toEqual({ id: 'data-created' });
        });
    });

    describe('GET /metadata/users/:id', () => {
        test('должен парсить options из query и передать в read', async () => {
            const res = await request(app)
                .get('/metadata/users/meta-id')
                .query({
                    options: '{"limit":5}',
                });
            expect(res.status).toBe(200);
            expect(service.read).toHaveBeenCalledWith('meta-id', { limit: 5 });
            expect(res.body).toEqual({ rows: [], cols: [], count: 0 });
        });

        test('должен использовать пустой объект если options не задан', async () => {
            const res = await request(app).get('/metadata/users/meta-id');
            expect(res.status).toBe(200);
            expect(service.read).toHaveBeenCalledWith('meta-id', {});
        });
    });

    describe('PUT /metadata/users/:id', () => {
        test('должен передать id и body в update', async () => {
            const body = { name: 'Updated' };
            const res = await request(app)
                .put('/metadata/users/meta-id')
                .send(body);
            expect(res.status).toBe(200);
            expect(service.update).toHaveBeenCalledWith('meta-id', body);
            expect(res.body).toEqual({ success: true });
        });
    });

    describe('DELETE /metadata/users/:id', () => {
        test('должен передать id и body в delete', async () => {
            const body = { id: 'u1' };
            const res = await request(app)
                .delete('/metadata/users/meta-id')
                .send(body);
            expect(res.status).toBe(200);
            expect(service.delete).toHaveBeenCalledWith('meta-id', body);
            expect(res.body).toEqual({ success: true });
        });
    });

    describe('обработка ошибок', () => {
        test('должен вернуть 500 при непредвиденной ошибке сервиса', async () => {
            service.read.mockRejectedValueOnce(new Error('boom'));
            const res = await request(app).get('/metadata/users/meta-id');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('boom');
        });
    });
});
