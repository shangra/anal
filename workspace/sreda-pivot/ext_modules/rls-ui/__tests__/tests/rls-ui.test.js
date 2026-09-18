const { getAuthedAgent } = require('../../../test-cms/src/getAuthedAgent');

const { Op } = require('sequelize');
const { defaultRoles } = require('../../../../core/config');
const { msgErrorValidation, rlsData } = require('../fixtures/rls-ui.fixtures');
const { User, UserInfo, URole, Group } = sreda.models;
const RlsCoreServiceClass = require('../../../rls-core/services/RlsCore.service');
const RlsCoreService = new RlsCoreServiceClass();

const { userIds } = require('../../../test-cms/fixtures/default.fixtures');

//-------------------------------------------------------------------------------
fdescribe('расширение rls-ui', () => {
    let agent;

    describe('Пользователь авторизован как админ', () => {
        beforeAll(async () => {
            const authedData = await getAuthedAgent();
            agent = authedData.agent;
        });

        // afterEach(async () => {
        //     await UserInfo?.destroy({
        //         where: {
        //             id: {
        //                 [Op.notIn]: userIds,
        //             },
        //         },
        //         force: true,
        //     });
        //     await User?.destroy({
        //         where: {
        //             id: {
        //                 [Op.notIn]: userIds,
        //             },
        //         },
        //         force: true,
        //     });
        //     await URole?.destroy({
        //         where: {
        //             id: {
        //                 [Op.notIn]: [...defaultRoles, '43106426-ffe3-4e1d-b623-6d210c6be0ff'],
        //             },
        //         },
        //         force: true,
        //     });
        //     await Group?.destroy({
        //         where: {
        //             id: {
        //                 [Op.ne]: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
        //             },
        //         },
        //         force: true,
        //     });
        // });

        afterAll(async () => {
            await new Promise((resolve) => setTimeout(() => resolve(), 500));
        });
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        /*
                //TODO ломает DDL; не хватает мока
                describe('GET /meta/:table_name/:table_id/:owner/?type=read', () => {
                    test('Некорректные параметры запроса', async () => {
                        const data = await agent.get('/rls/meta/table/ggggg/hhhhhh/?type=wrong').expect(400);
        
                        expect(data.body).toEqual(
                            expect.objectContaining({
                                message: msgErrorValidation,
                                errors: expect.any(Array),
                            }),
                        );
        
                        expect(data.body.errors).toHaveLength(3);
                    });
                    //-------------------------------------------------------------------------------
                    //             test(`Получение мета информации всех элементов ролевой модели одного типа, имеющих доступ к указанной сущности без модулей rls-ext-*`, async () => {
                    //                 const {tableName, tableId, owner, type} = rlsData;
                    //
                    //                 const response = await agent
                    //                     .get(`/rls/meta/${tableName}/${tableId}/${owner}/?type=${type}`)
                    //                     .expect(500)
                    //
                    //                 expect(response.body).toEqual(expect.objectContaining({
                    //                     message: msgError500,
                    //                     stack: expect.any(String),
                    //                     errors: [
                    //                         msgErrorMapping
                    //                     ]
                    //                 }))
                    //             })
                    //-------------------------------------------------------------------------------
                    test('Получение мета информации пользователей, имеющих доступ к указанной сущности c модулями rls-ext-*', async () => {
                        const { tableName, tableId, type } = rlsData;
                        const userData1 = {
                            login: 'login1',
                            password: '123',
                        };
                        const userData2 = {
                            login: 'login2',
                            password: '123',
                        };
                        const user1 = await agent.post('/usersui/users/').send(userData1).expect(200);
                        const user2 = await agent.post('/usersui/users/').send(userData2).expect(200);
        
                        const userId1 = user1.body.id;
                        const userId2 = user2.body.id;
        
                        const spy = jest.spyOn(RlsCoreService.__proto__, 'getPermissions').mockImplementation(() =>
                            Promise.resolve([{ owner_id: userId1 }, { owner_id: userId2 }]),
                        );
        
                        const response = await agent.get(`/rls/meta/${tableName}/${tableId}/users/?type=${type}`).expect(200);
        
                        spy.mockClear();
        
                        expect(response.body).toEqual(
                            expect.arrayContaining([
                                expect.objectContaining({
                                    login: userData1.login,
                                }),
                                expect.objectContaining({
                                    login: userData2.login,
                                }),
                            ]),
                        );
                    });
                    //-------------------------------------------------------------------------------
                    test('Получение мета информации ролей, имеющих доступ к указанной сущности c модулями rls-ext-*', async () => {
                        const { tableName, tableId, type } = rlsData;
        
                        const roleData1 = {
                            name: 'role1',
                        };
                        const roleData2 = {
                            name: 'role2',
                        };
        
                        const role1 = await agent.post('/usersui/roles').send(roleData1).expect(200);
                        const role2 = await agent.post('/usersui/roles').send(roleData2).expect(200);
        
                        const roleId1 = role1.body.id;
                        const roleId2 = role2.body.id;
        
                        const spy = jest.spyOn(RlsCoreService.__proto__, 'getPermissions').mockImplementation(() =>
                            Promise.resolve([{ owner_id: roleId1 }, { owner_id: roleId2 }]),
                        );
        
                        const response = await agent.get(`/rls/meta/${tableName}/${tableId}/roles/?type=${type}`).expect(200);
        
                        spy.mockClear();
        
                        expect(response.body).toEqual(
                            expect.arrayContaining([
                                expect.objectContaining({
                                    ...roleData1,
                                }),
                                expect.objectContaining({
                                    ...roleData2,
                                }),
                            ]),
                        );
                    });
                    //-------------------------------------------------------------------------------
                    test('Получение мета информации групп, имеющих доступ к указанной сущности c модулями rls-ext-*', async () => {
                        const { tableName, tableId, type } = rlsData;
        
                        const groupData1 = {
                            name: 'group1',
                        };
                        const groupData2 = {
                            name: 'group2',
                        };
        
                        const group1 = await agent.post('/usersui/groups').send(groupData1).expect(200);
                        const group2 = await agent.post('/usersui/groups').send(groupData2).expect(200);
        
                        const groupId1 = group1.body.id;
                        const groupId2 = group2.body.id;
        
                        const spy = jest.spyOn(RlsCoreService.__proto__, 'getPermissions').mockImplementation(() =>
                            Promise.resolve([{ owner_id: groupId1 }, { owner_id: groupId2 }]),
                        );
        
                        const response = await agent.get(`/rls/meta/${tableName}/${tableId}/groups/?type=${type}`).expect(200);
        
                        spy.mockClear();
        
                        expect(response.body).toEqual(
                            expect.arrayContaining([
                                expect.objectContaining({
                                    ...groupData1,
                                }),
                                expect.objectContaining({
                                    ...groupData2,
                                }),
                            ]),
                        );
                    });
                    //-------------------------------------------------------------------------------
                    test('Получение мета информации прав, имеющих доступ к указанной сущности c модулями rls-ext-*', async () => {
                        const { tableName, tableId, type } = rlsData;
        
                        const ruleId1 = '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6';
                        const ruleId2 = '90499885-ae60-440b-a59f-cfd3958110cd';
        
                        const spy = jest.spyOn(RlsCoreService.__proto__, 'getPermissions').mockImplementation(() =>
                            Promise.resolve([{ owner_id: ruleId1 }, { owner_id: ruleId2 }]),
                        );
        
                        const response = await agent.get(`/rls/meta/${tableName}/${tableId}/rules/?type=${type}`).expect(200);
        
                        spy.mockClear();
        
                        expect(response.body).toEqual(
                            expect.arrayContaining([
                                expect.objectContaining({
                                    id: ruleId1,
                                }),
                                expect.objectContaining({
                                    id: ruleId2,
                                }),
                            ]),
                        );
                    });
                });
        */
        //-------------------------------------------------------------------------------
        //-------------------------------------------------------------------------------
        fdescribe('GET/:table_name/:table_id/permissions ', () => {
            test('Некорректные параметры запроса', async () => {
                const data = await agent
                    .get('/rls/table/ggggg/permissions/?type=rea22')
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: msgErrorValidation,
                        errors: expect.any(Array),
                    })
                );

                expect(data.body.errors).toHaveLength(2);
            });
            //-------------------------------------------------------------------------------
            test.skip('Получение мета информации всех элементов ролевой модели, имеющих доступ к указанной сущности без модулей rls-ext-*', async () => {
                const { tableName, tableId } = rlsData;

                await agent
                    .get(`/rls/${tableName}/${tableId}/permissions/?type=read`)
                    .expect(200, {
                        roles: [],
                        rules: [],
                        groups: [],
                        users: [],
                    });
            });
            //-------------------------------------------------------------------------------
            test.skip('Получение мета информации всех элементов ролевой модели, имеющих доступ к указанной сущности c модулями rls-ext-*', async () => {
                const { tableName, tableId, type } = rlsData;

                const userData = {
                    login: 'login2',
                    password: '123',
                };
                const groupData = {
                    name: 'group2',
                };
                const roleData = {
                    name: 'role2',
                };

                const user = await agent
                    .post('/usersui/users/')
                    .send(userData)
                    .expect(200);
                const group = await agent
                    .post('/usersui/groups')
                    .send(groupData)
                    .expect(200);
                const role = await agent
                    .post('/usersui/roles')
                    .send(roleData)
                    .expect(200);

                const userId = user.body.id;
                const groupId = group.body.id;
                const roleId = role.body.id;
                const ruleId = '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6';

                const spy = jest
                    .spyOn(RlsCoreService.__proto__, 'getPermissions')
                    .mockImplementation(() =>
                        Promise.resolve([
                            { owner_id: groupId },
                            { owner_id: userId },
                            { owner_id: roleId },
                            { owner_id: ruleId },
                        ])
                    );

                const response = await agent
                    .get(
                        `/rls/${tableName}/${tableId}/permissions/?type=${type}`
                    )
                    .expect(200);

                spy.mockClear();

                expect(response.body).toEqual(
                    expect.objectContaining({
                        rules: expect.arrayContaining([
                            expect.objectContaining({
                                id: ruleId,
                            }),
                        ]),
                        roles: expect.arrayContaining([
                            expect.objectContaining({
                                ...roleData,
                            }),
                        ]),
                        users: expect.arrayContaining([
                            expect.objectContaining({
                                login: userData.login,
                            }),
                        ]),
                        groups: expect.arrayContaining([
                            expect.objectContaining({
                                ...groupData,
                            }),
                        ]),
                    })
                );
            });
        });
    });
});
