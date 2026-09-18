const connection = require('../../../../core/db/connection');
const {
    msgErrorValidation,
    msgErrorMapping,
    msgError500,
    rlsData,
} = require('../fixtures/rls-core.fixtures');

jest.setTimeout(60000); // a whole minute!

//-------------------------------------------------------------------------------
describe('расширение rls-core', () => {
    let agent;

    describe('Пользователь авторизован как админ', () => {
        beforeAll(async () => {
            const { getAuthedAgent } = require('../../../test-cms/src/getAuthedAgent');
            const authedData = await getAuthedAgent(agent);
            agent = authedData.agent;
        });

        afterAll(async () => {
            await connection.close();
            await new Promise((resolve) => setTimeout(() => resolve(), 500));
        });

        afterEach(async () => {
            // await Rls.destroy({
            //     where: {
            //         [Op.or]: [
            //             {
            //                 owner_id: {
            //                     [Op.notIn]: [
            //                         '12e32c9d-6e4f-4d57-ae22-5cddaabf343c',
            //                         '90499885-ae60-440b-a59f-cfd3958110cd',
            //                         ...userIds
            //                     ],
            //                 },
            //             },
            //         ],
            //     },
            // });
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        describe('POST /rls/:table_name/:table_id/:owner/?type=:type', () => {
            test('Некорректные параметры запроса', async () => {
                const data = await agent.post('/rls/table/ggggg/hhhhhh/?type=wrong').expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(data.body.errors).toHaveLength(4);
            });
            //-------------------------------------------------------------------------------
            test('Пустой body', async () => {
                const { tableName } = rlsData;

                const data = await agent
                    .post(
                        `/rls/${tableName}/90499885-ae60-440b-a59f-cfd3958110cd/roles/?type=wrong`
                    )
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                nestedErrors: expect.any(Array),
                            }),
                        ]),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test('Некорректный body', async () => {
                const { tableName } = rlsData;

                const data = await agent
                    .post(
                        `/rls/${tableName}/00000000-0000-0000-0000-000000000000/roles/?type=wrong`
                    )
                    .send({
                        wrong: 'a983b7c6-2319-42ce-b3fd-17f378897ed9',
                    })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                        stack: expect.any(String),
                    })
                );

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                nestedErrors: expect.any(Array),
                            }),
                        ]),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test('Создание rls записи', async () => {
                const { tableName, tableId, owner, ownerId, type } = rlsData;
                const key = `${owner.slice(0, -1)}_id`;

                await agent
                    .post(`/rls/${tableName}/${tableId}/${owner}/?type=${type}`)
                    .send({ [key]: ownerId })
                    .expect(200, { result: true });

                await agent
                    .delete(`/rls/${tableName}/${tableId}/${owner}/?type=${type}`)
                    .send({ [key]: ownerId })
                    .expect(200, { result: true });
            });
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        describe('GET /rls/:table_name/:table_id/:owner/?type=:type', () => {
            test('Некорректные параметры запроса', async () => {
                const data = await agent.get('/rls/table/ggggg/hhhhhh/?type=wrong').expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(data.body.errors).toHaveLength(3);
            });
            //-------------------------------------------------------------------------------
            test('Получение rls записей', async () => {
                const { tableName, tableId, owner, type } = rlsData;

                await agent
                    .get(`/rls/${tableName}/${tableId}/${owner}/?type=${type}`)
                    .expect(200, []);
            });
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        describe('GET /rls/status/:table_name/:table_id/?type=:type', () => {
            test('Некорректные параметры запроса', async () => {
                const data = await agent.get('/rls/status/table/ggggg/?type=wrong').expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(data.body.errors).toHaveLength(1);
            });
            //-------------------------------------------------------------------------------
            //TODO Переделать тест, tableName - не возвращает ошибки
            test.skip('Получение статуса доступа пользователя к определенной rls записи', async () => {
                const { tableName, tableId } = rlsData;

                const response = await agent.get(`/rls/status/${tableName}/${tableId}`).expect(500);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        message: msgError500,
                        stack: expect.any(String),
                        errors: [msgErrorMapping],
                    })
                );
            });
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        describe('POST /rls/multi/status/:table_name', () => {
            //TODO тест не возвращает ошибки наименование таблицы может быть любое
            test.skip('Некорректный параметр :table_name', async () => {
                const { tableId } = rlsData;

                const response = await agent
                    .post('/rls/multi/status/asdasd')
                    .send({ ids: [tableId] })
                    .expect(400);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(response.body.errors).toHaveLength(1);
            });
            //-------------------------------------------------------------------------------
            test('Пустой body', async () => {
                const { tableName } = rlsData;

                const response = await agent.post(`/rls/multi/status/${tableName}`).expect(400);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(response.body.errors).toHaveLength(1);
            });
            //-------------------------------------------------------------------------------
            test('Некорректный body', async () => {
                const { tableName } = rlsData;

                const data = await agent
                    .post(`/rls/multi/status/${tableName}`)
                    .send({
                        wrong: 'a983b7c6-2319-42ce-b3fd-17f378897ed9',
                    })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(data.body.errors).toHaveLength(1);
            });
            //-------------------------------------------------------------------------------
            test.skip('Получения массива статусов по массиву id', async () => {
                const { tableName, tableId } = rlsData;

                const ids = [tableId];

                const response = await agent
                    .post(`/rls/multi/status/${tableName}`)
                    .send({
                        ids,
                    })
                    .expect(200);

                expect(response.body).toHaveLength(ids.length);
                expect(response.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            [tableId]: {
                                isView: false,
                                isRead: false,
                                isWrite: false,
                                isDelete: false,
                            },
                        }),
                    ])
                );
            });
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        describe('DELETE /rls/:table_name/:table_id/:owner/?type=:type', () => {
            test('Некорректные параметры запроса', async () => {
                const data = await agent.delete('/rls/table/ggggg/hhhhhh/?type=wrong').expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(data.body.errors).toHaveLength(4);
            });
            //-------------------------------------------------------------------------------
            test('Пустой body', async () => {
                const { tableName } = rlsData;

                const data = await agent
                    .delete(
                        `/rls/${tableName}/90499885-ae60-440b-a59f-cfd3958110cd/roles/?type=wrong`
                    )
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                nestedErrors: expect.any(Array),
                            }),
                        ]),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test('Некорректный body', async () => {
                const { tableName } = rlsData;

                const data = await agent
                    .delete(`/rls/${tableName}/00000000-0000-0000-0000-000000000000/roles`)
                    .send({
                        wrong: 'a983b7c6-2319-42ce-b3fd-17f378897ed9',
                    })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                        stack: expect.any(String),
                    })
                );

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                nestedErrors: expect.any(Array),
                            }),
                        ]),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test('Удаление rls записи', async () => {
                const { tableName, tableId, owner, ownerId, type } = rlsData;
                const key = `${owner.slice(0, -1)}_id`;

                await agent
                    .delete(`/rls/${tableName}/${tableId}/${owner}/?type=${type}`)
                    .send({ [key]: ownerId })
                    .expect(200, { result: true });
            });
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
    });
});
