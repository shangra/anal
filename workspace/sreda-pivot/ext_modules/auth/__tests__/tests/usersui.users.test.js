const path = require('path');
const { userIds } = require('../../../test-cms/fixtures/default.fixtures');

const {
    users,
    ids,
    validationError,
} = require('../fixtures/usersui.users.fixtures');
// const axios = require('axios');
const { UserInfo, User, Group, UAttribute } = sreda.models;
const { Op } = require('sequelize');

// jest.mock('axios');
//-------------------------------------------------------------------------------
describe('расширение auth', () => {
    let agent;

    describe('Проверка редактирования пользователей usersui/users', () => {
        describe('Пользователь авторизован как админ', () => {
            beforeEach(async () => {
                const {
                    getAuthedAgent,
                } = require('../../../test-cms/src/getAuthedAgent');
                const authedData = await getAuthedAgent();
                agent = authedData.agent;
            });

            beforeEach(() => {
                jest.clearAllMocks();
            });

            afterEach(async () => {
                await UserInfo.destroy({
                    where: {
                        id: {
                            [Op.notIn]: userIds,
                        },
                    },
                    force: true,
                });

                await User.destroy({
                    where: {
                        id: {
                            [Op.notIn]: userIds,
                        },
                    },
                    force: true,
                });

                await Group.destroy({
                    where: {},
                    force: true,
                });
            });
            //-------------------------------------------------------------------------------
            //-------------------------------------------------------------------------------
            test('GET /usersui/users', async () => {
                const response = await agent.get('/usersui/users').expect(200);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        items: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                                login: 'su',
                                status: 0,
                            }),
                            expect.objectContaining({
                                id: '64a81949-4eae-45a8-9e21-cf1d13fd180a',
                                login: 'testuser',
                                status: 0,
                            }),
                        ]),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test.skip.each(users)('POST /usersui/users', async (user) => {
                const newUser = await agent
                    .post('/usersui/users')
                    .send(user)
                    .expect(200);

                await agent
                    .post('/usersui/users')
                    .send(user)
                    .expect(400, {
                        message: 'Пользователь с таким логином уже существует',
                        errors: [],
                        stack: expect.any(String),
                        original: {},
                    });

                expect(newUser.body).toEqual({
                    id: newUser.body.id,
                    login: user.login,
                    name: user.name,
                    email: user.email,
                    details: user.details,
                    avatar: user.avatar,
                    status: 0,
                    session: null,
                    markdel: 0,
                });
            });
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users невозможность создания пользователя с логином, который существовал, но был удален (markdel=1)',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent.delete(`/usersui/users/${id}`).expect(200);

                    await agent
                        .post('/usersui/users')
                        .send(user)
                        .expect(400, {
                            message:
                                'Пользователь с таким логином уже существует',
                            errors: [],
                            stack: expect.any(String),
                            original: {},
                        });
                }
            );
            //-------------------------------------------------------------------------------
            test('POST with null body /usersui/users', async () => {
                const response = await agent
                    .post('/usersui/users')
                    .send(null)
                    .expect(400);

                expect(response.body).toEqual({
                    message: 'Ошибка при валидации',
                    errors: expect.any(Array),
                    stack: expect.any(String),
                    original: {},
                });
            });
            //-------------------------------------------------------------------------------
            test('POST c невалидным password /usersui/users', async () => {
                const response = await agent
                    .post('/usersui/users')
                    .send({
                        login: 'user',
                        password: {},
                    })
                    .expect(400);

                expect(response.body).toEqual({
                    message: 'Ошибка при валидации',
                    errors: expect.any(Array),
                    stack: expect.any(String),
                    original: {},
                });
            });
            //-------------------------------------------------------------------------------
            test('POST c невалидным login /usersui/users', async () => {
                const response = await agent
                    .post('/usersui/users')
                    .send({
                        login: '<>2',
                        password: '123',
                    })
                    .expect(400);

                expect(response.body).toEqual({
                    message: 'Ошибка при валидации',
                    errors: expect.any(Array),
                    stack: expect.any(String),
                    original: {},
                });
            });
            //-------------------------------------------------------------------------------
            test.skip.each(users)('GET /usersui/users/:id', async (user) => {
                const newUser = await agent
                    .post('/usersui/users')
                    .send(user)
                    .expect(200);
                const { id } = newUser.body;
                const userFromDb = await agent
                    .get(`/usersui/users/${id}`)
                    .expect(200);
                expect(userFromDb.body).toEqual(
                    expect.objectContaining({
                        id: newUser.body.id,
                        login: user.login,
                        name: user.name,
                        email: user.email,
                        details: user.details,
                        avatar: user.avatar,
                        status: 0,
                        attributes: expect.any(Array),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test.skip.each(users)('DELETE /usersui/users/:id', async (user) => {
                const newUser = await agent
                    .post('/usersui/users')
                    .send(user)
                    .expect(200);

                const { id } = newUser.body;

                await agent
                    .delete(`/usersui/users/${id}`)
                    .expect(200, { result: true });

                await agent.get(`/usersui/users/${id}`).expect(200);
            });
            // -------------------------------------------------------------------------------
            test.each(ids)(
                'GET /usersui/users/:id с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .get(`/usersui/users/${id}`)
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(ids)(
                'DELETE /usersui/users/:id с некорректным id = $id',
                async ({ id, expectDel, goodStatus }) => {
                    const data = await agent
                        .delete(`/usersui/users/${id}`)
                        .expect(goodStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectDel)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(ids)(
                'PUT /usersui/users/:id с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .put(`/usersui/users/${id}`)
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(ids)(
                'GET /usersui/users/:id/rules с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .get(`/usersui/users/${id}/rules`)
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(ids)(
                'GET /usersui/users/:id/roles с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .get(`/usersui/users/${id}/roles`)
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(ids)(
                'GET /usersui/users/:id/groups с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .get(`/usersui/users/${id}/groups`)
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(ids)(
                'GET /usersui/users/:id/meta с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .get(`/usersui/users/${id}/rules`)
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //------------------------------------------------------------------------------
            test.each(ids)(
                'POST /usersui/users/:id/rules с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .post(`/usersui/users/${id}/rules`)
                        .send({
                            rule_id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                        })
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //------------------------------------------------------------------------------
            test.each(ids)(
                'POST /usersui/users/:id/roles с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .post(`/usersui/users/${id}/roles`)
                        .send({
                            role_id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                        })
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //------------------------------------------------------------------------------
            test.each(ids)(
                'POST /usersui/users/:id/groups c некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .post(`/usersui/users/${id}/groups`)
                        .send({
                            group_id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                        })
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //------------------------------------------------------------------------------
            test.each(ids)(
                'DELETE /usersui/users/:id/roles с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .delete(`/usersui/users/${id}/roles`)
                        .send({
                            role_id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                        })
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //------------------------------------------------------------------------------
            test.each(ids)(
                'DELETE /usersui/users/:id/rules с некорректным id = $id',
                async ({ id, expectDel, goodStatus }) => {
                    const data = await agent
                        .delete(`/usersui/users/${id}/rules`)
                        .send({
                            rule_id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                        })
                        .expect(goodStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectDel)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(ids)(
                'DELETE /usersui/users/:id/groups с некорректным id = $id',
                async ({ id, expectBad, badStatus }) => {
                    const data = await agent
                        .delete(`/usersui/users/${id}/groups`)
                        .send({
                            group_id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                        })
                        .expect(badStatus);

                    expect(data.body).toEqual(
                        expect.objectContaining(expectBad)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'PUT без аватара /usersui/users/:id',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const changeData = {
                        login: `new${user.login}`,
                        name: 'newName',
                        email: 'newEmail@test.ru',
                        details: 'newDetails',
                        status: 1,
                    };

                    const response = await agent
                        .put(`/usersui/users/${id}`)
                        .send(changeData)
                        .expect(200);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            ...changeData,
                        })
                    );

                    const changedUser = await agent
                        .get(`/usersui/users/${id}`)
                        .expect(200);

                    expect(changedUser.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: `new${user.login}`,
                            name: 'newName',
                            email: 'newEmail@test.ru',
                            details: 'newDetails',
                            avatar: '',
                            status: 1,
                            attributes: expect.any(Array),
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'PUT с аватаром /usersui/users/:id',
                async (user) => {
                    const file_data = {
                        data: {
                            file_data: {
                                md5: '9490dfb5532be7cc1d335927e995af93',
                                id: 'id',
                            },
                        },
                    };

                    // axios.post.mockResolvedValue(file_data);

                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;
                    const avatarPath = path.join(
                        __dirname,
                        '../fixtures/avatar.png'
                    );

                    const response = await agent
                        .put(`/usersui/users/${id}`)
                        .field('name', 'newName')
                        .field('details', 'newDetails')
                        .field('email', 'newEmail')
                        .field('login', `new${user.login}`)
                        .field('status', 1)
                        .attach('upload', avatarPath)
                        .expect(200);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            name: 'newName',
                            details: 'newDetails',
                            email: 'newEmail',
                            login: `new${user.login}`,
                            status: 1,
                        })
                    );

                    const changedUser = await agent
                        .get(`/usersui/users/${id}`)
                        .expect(200);

                    expect(changedUser.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: `new${user.login}`,
                            name: 'newName',
                            email: 'newEmail',
                            details: 'newDetails',
                            avatar: '9490dfb5532be7cc1d335927e995af93',
                            status: 1,
                            attributes: expect.any(Array),
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'PUT c невалидными параметрами (все кроме avatar) /usersui/users/:id',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const response = await agent
                        .put(`/usersui/users/${id}`)
                        .send({
                            login: '',
                            name: '',
                            email: 'dddd',
                            details: {},
                            status: 8,
                            password: '',
                        })
                        .expect(400);

                    expect(response.body).toEqual(validationError);

                    expect(response.body.errors.length).toBe(6);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'GET /usersui/users/:id/rules',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .get(`/usersui/users/${id}/rules`)
                        .expect(200, user.defaultRules);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'GET /usersui/users/:id/meta',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: user.login,
                            name: user.name,
                            email: user.email,
                            details: user.details,
                            avatar: user.avatar,
                            status: 0,
                            attributes: expect.any(Array),
                            roles: [],
                            rules: user.defaultRules,
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/rules',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/rules`)
                        .send({ rule_id: user.newRule })
                        .expect(200);

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: user.login,
                            name: user.name,
                            email: user.email,
                            details: user.details,
                            avatar: user.avatar,
                            status: 0,
                            attributes: expect.any(Array),
                            roles: [],
                            rules: user.extendedRules,
                        })
                    );
                    await agent
                        .get(`/usersui/users/${id}/rules`)
                        .expect(200, user.extendedRules);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/rules c невалидным rule_id в body',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const data = await agent
                        .post(`/usersui/users/${id}/rules`)
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining(user.errorValidate)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/rules c несуществующим rule_id в body',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/rules`)
                        .send({
                            rule_id: '7297635d-e87f-44c0-a162-899cb358189b',
                        })
                        .expect(400, {
                            message: 'Такого права не существует',
                            errors: [],
                            stack: expect.any(String),
                            original: {},
                        });
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'DELETE /usersui/users/:id/rules c невалидным rule_id в body',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const data = await agent
                        .delete(`/usersui/users/${id}/rules`)
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining(user.errorValidate)
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'DELETE /usersui/users/:id/rules',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/rules`)
                        .send({ rule_id: user.newRule })
                        .expect(200);

                    await agent
                        .delete(`/usersui/users/${id}/rules`)
                        .send({ rule_id: user.newRule })
                        .expect(200);

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: user.login,
                            name: user.name,
                            email: user.email,
                            details: user.details,
                            avatar: user.avatar,
                            status: 0,
                            attributes: expect.any(Array),
                            roles: [],
                            rules: user.defaultRules,
                        })
                    );

                    await agent
                        .get(`/usersui/users/${id}/rules`)
                        .expect(200, user.defaultRules);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'GET /usersui/users/:id/roles',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .get(`/usersui/users/${id}/roles`)
                        .expect(200, user.defaultRoles);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/roles c несуществующим role_id в body',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/roles`)
                        .send({
                            role_id: '7297635d-e87f-44c0-a162-899cb358189b',
                        })
                        .expect(400, {
                            message: 'Такой роли не существует',
                            errors: [],
                            stack: expect.any(String),
                            original: {},
                        });
                }
            );

            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/roles',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/roles`)
                        .send({ role_id: user.newRole })
                        .expect(200, { result: true });

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toMatchObject({
                        id: newUser.body.id,
                        login: user.login,
                        name: user.name,
                        email: user.email,
                        details: user.details,
                        avatar: user.avatar,
                        status: 0,
                        attributes: expect.any(Array),
                        roles: user.extendedRoles,
                        rules: expect.any(Object),
                    });

                    const data = await agent
                        .get(`/usersui/users/${id}/roles`)
                        .expect(200);
                    expect(data.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                ...user.extendedRoles[0],
                            }),
                        ])
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'DELETE /usersui/users/:id/roles',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/roles`)
                        .send({ role_id: user.newRole })
                        .expect(200, { result: true });

                    await agent
                        .delete(`/usersui/users/${id}/roles`)
                        .send({ role_id: user.newRole })
                        .expect(200, { result: true });

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: user.login,
                            name: user.name,
                            email: user.email,
                            details: user.details,
                            avatar: user.avatar,
                            status: 0,
                            attributes: expect.any(Array),
                            roles: user.defaultRoles,
                            rules: user.defaultRules,
                        })
                    );
                    await agent
                        .get(`/usersui/users/${id}/roles`)
                        .expect(200, user.defaultRoles);
                }
            );
            //----------------------------------------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------------------------------------
            test.skip.each(users)(
                'GET /usersui/users/:id/groups',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .get(`/usersui/users/${id}/groups`)
                        .expect(200, []);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/roles c несуществующим group_id в body',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    await agent
                        .post(`/usersui/users/${id}/groups`)
                        .send({
                            group_id: '7297635d-e87f-44c0-a162-899cb358189b',
                        })
                        .expect(400, {
                            message: 'Такой группы не существует',
                            errors: [],
                            stack: expect.any(String),
                            original: {},
                        });
                }
            );

            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'POST /usersui/users/:id/groups',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const newGroup = await agent
                        .post('/usersui/groups')
                        .send({
                            description: 'group',
                        })
                        .expect(200);

                    const groupId = newGroup.body.id;

                    await agent
                        .post(`/usersui/users/${id}/groups`)
                        .send({ group_id: groupId })
                        .expect(200, { result: true });

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: user.login,
                            name: user.name,
                            email: user.email,
                            details: user.details,
                            avatar: user.avatar,
                            status: 0,
                            attributes: expect.any(Array),
                            roles: expect.any(Object),
                            rules: expect.any(Object),
                            groups: expect.arrayContaining([
                                expect.objectContaining({
                                    id: groupId,
                                }),
                            ]),
                        })
                    );

                    const data = await agent
                        .get(`/usersui/users/${id}/groups`)
                        .expect(200);
                    expect(data.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: groupId,
                            }),
                        ])
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(users)(
                'DELETE /usersui/users/:id/groups',
                async (user) => {
                    const newUser = await agent
                        .post('/usersui/users/')
                        .send(user)
                        .expect(200);

                    const { id } = newUser.body;

                    const newGroup = await agent
                        .post('/usersui/groups')
                        .send({
                            description: 'group',
                        })
                        .expect(200);

                    const groupId = newGroup.body.id;

                    await agent
                        .post(`/usersui/users/${id}/groups`)
                        .send({ group_id: groupId })
                        .expect(200, { result: true });

                    await agent
                        .delete(`/usersui/users/${id}/groups`)
                        .send({ group_id: groupId })
                        .expect(200, { result: true });

                    const userMeta = await agent
                        .get(`/usersui/users/${id}/meta`)
                        .expect(200);

                    expect(userMeta.body).toEqual(
                        expect.objectContaining({
                            id: newUser.body.id,
                            login: user.login,
                            name: user.name,
                            email: user.email,
                            details: user.details,
                            avatar: user.avatar,
                            status: 0,
                            attributes: expect.any(Array),
                            roles: user.defaultRoles,
                            rules: user.defaultRules,
                            groups: [],
                        })
                    );
                    await agent
                        .get(`/usersui/users/${id}/groups`)
                        .expect(200, []);
                }
            );
            //-------------------------------------------------------------------------------
            //-------------------------------------------------------------------------------
            describe('GET /usersui/attributes/allowed', () => {
                test('Получение списка разрешенных аттрибутов (по умолчанию разрешены все)', async () => {
                    const allAttributes = await UAttribute.findAll({});
                    const allowedAttrbites = await agent
                        .get('/usersui/attributes/allowed')
                        .expect(200);

                    expect(allowedAttrbites.body).toHaveLength(
                        allAttributes.length
                    );
                });
            });
        });
    });
});
