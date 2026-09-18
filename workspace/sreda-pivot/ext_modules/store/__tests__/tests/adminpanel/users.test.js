const connection = require('../../../../../core/db/connection');

const { Store } = sreda.models;
const fsp = require('fs').promises;
const path = require('path');

describe('расширение store', () => {
    beforeAll(async () => {
        const { SID } = require('../../../../test-cms/src/getAuthedAgent');
        agent.set('Cookie', [SID]);
    });

    describe('Проверка редактирования данных пользователя UserData', () => {
        afterAll(async () => {
            await connection.close();
            await new Promise((resolve) => setTimeout(() => resolve(), 500));
        });

        afterEach(async () => {
            await Store.truncate();
            const pathToSID = path.join(
                __dirname,
                '../../../../../',
                'sessions/6BeoL56hwNDDD1-DCeyFsF8gULj9cY0_.json'
            );
            await fsp.unlink(pathToSID).catch(console.log);
        });

        describe('Пользователь не авторизован', () => {
            //-------------------------------------------------------------------------------
            test('POST /users/setuserdata/:key key = $key', async () => {
                const key = 'key';
                const value = 'value';
                await agent
                    .post(`/users/setuserdata/${key}`)
                    .set('Content-type', 'text/plain')
                    .send(value)
                    .expect(200, { result: true });
            });
            //-------------------------------------------------------------------------------
            test('GET users/getuserdata/:key key= $key', async () => {
                const key = 'key';
                const value = 'value';

                await agent
                    .post(`/users/setuserdata/${key}`)
                    .set('Content-type', 'text/plain')
                    .send(value)
                    .expect(200, { result: true });

                await agent
                    .get(`/users/getuserdata/${key}`)
                    .expect(200, { result: true, data: value });
            });
            //---------------------------------------------------------------------------
            test('GET /users/getuserdata (получение всех данных сессии пользователя)', async () => {
                const key1 = 'key1';
                const value1 = 'value1';

                await agent
                    .post(`/users/setuserdata/${key1}`)
                    .set('Content-type', 'text/plain')
                    .send(value1)
                    .expect(200, { result: true });

                const key2 = 'key2';
                const value2 = 'value2';

                await agent
                    .post(`/users/setuserdata/${key2}`)
                    .set('Content-type', 'text/plain')
                    .send(value2)
                    .expect(200, { result: true });

                const response = await agent.get('/users/getuserdata').expect(200);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        user: expect.any(Object),
                        key1: 'value1',
                        key2: 'value2',
                    })
                );
            });
        });
        //---------------------------------------------------------------------------
        //---------------------------------------------------------------------------
        describe('Пользователь авторизован как админ', () => {
            beforeAll(async () => {
                // const authedData = await getAuthedAgent(httpAgent);
                // agent = authedData.agent;
            });

            //-------------------------------------------------------------------------------
            test('POST /users/setuserdata/:key key = $key', async () => {
                const key = 'key';
                const value = 'value';
                await agent
                    .post(`/users/setuserdata/${key}`)
                    .set('Content-type', 'text/plain')
                    .send(value)
                    .expect(200, { result: true });
            });
            //-------------------------------------------------------------------------------
            test('GET users/getuserdata/:key key= $key', async () => {
                const key = 'key';
                const value = 'value';

                await agent
                    .post(`/users/setuserdata/${key}`)
                    .set('Content-type', 'text/plain')
                    .send(value)
                    .expect(200, { result: true });

                await agent
                    .get(`/users/getuserdata/${key}`)
                    .expect(200, { result: true, data: value });
            });
            //-------------------------------------------------------------------------------
            test('GET /users/getuserdata (получение всех данных сессии пользователя)', async () => {
                const key1 = 'key1';
                const value1 = 'value1';

                await agent
                    .post(`/users/setuserdata/${key1}`)
                    .set('Content-type', 'text/plain')
                    .send(value1)
                    .expect(200, { result: true });

                const key2 = 'key2';
                const value2 = 'value2';

                await agent
                    .post(`/users/setuserdata/${key2}`)
                    .set('Content-type', 'text/plain')
                    .send(value2)
                    .expect(200, { result: true });

                const response = await agent.get('/users/getuserdata').expect(200);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        user: expect.any(Object),
                        key1: 'value1',
                        key2: 'value2',
                    })
                );
            });
            //-------------------------------------------------------------------------------
        });
    });
});
