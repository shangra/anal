const { defaultRoles } = require('../../src/constants');
const {
    ids,
    defaultRole,
    roles,
    defaultRoleRules,
    defaultRoleUsers,
    newRuleIds,
    newRulesData,
    invalidNames,
} = require('../fixtures/usersui.roles.fixtures');
const { userIds } = require('../../../test-cms/fixtures/default.fixtures');

const { users } = require('../fixtures/usersui.users.fixtures');
const { User, UserInfo, URole } = sreda.models;
const { Op } = require('sequelize');

describe('расширение auth', () => {
    let agent;

    describe('Редактирование ролей', () => {
        describe('Пользователь авторизован как админ', () => {
            beforeEach(async () => {
                const {
                    getAuthedAgent,
                } = require('../../../test-cms/src/getAuthedAgent');
                const authedData = await getAuthedAgent();
                agent = authedData.agent;
            });

            afterEach(async () => {
                await User.destroy({
                    where: {
                        id: {
                            [Op.notIn]: userIds,
                        },
                    },
                    force: true,
                });
                await UserInfo.destroy({
                    where: {
                        id: {
                            [Op.notIn]: userIds,
                        },
                    },
                    force: true,
                });
                await URole.destroy({
                    where: {
                        id: {
                            [Op.notIn]: [...defaultRoles, defaultRole.id],
                        },
                    },
                    force: true,
                });
            });
            //-------------------------------------------------------------------------------
            //-------------------------------------------------------------------------------
            describe('Проверка на некорректный id role', () => {
                test.each(ids)(
                    'id = $id, GET /usersui/roles/:id',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .get(`/usersui/roles/${id}`)
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.skip.each(ids)(
                    'id = $id, PUT /usersui/roles/:id',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .put(`/usersui/roles/${id}`)
                            .send({
                                name: 'test',
                                details: '',
                                color: '',
                            })
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, DELETE /usersui/roles/:id',
                    async ({ id, statusDel, expectedDel }) => {
                        const data = await agent
                            .delete(`/usersui/roles/${id}`)
                            .expect(statusDel);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedDel)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, POST /usersui/roles/:id/rules',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .post(`/usersui/roles/${id}/rules`)
                            .send({
                                rule_id: '140c36e6-9f04-4949-aae9-aa30c5f17150',
                            })
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, DELETE /usersui/roles/:id/rules',
                    async ({ id, statusDel, expectedDel }) => {
                        const data = await agent
                            .delete(`/usersui/roles/${id}/rules`)
                            .send({
                                rule_id: '140c36e6-9f04-4949-aae9-aa30c5f17150',
                            })
                            .expect(statusDel);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedDel)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, POST /usersui/roles/:id/users',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .post(`/usersui/roles/${id}/users`)
                            .send({
                                user_id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                            })
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, DELETE /usersui/roles/:id/users',
                    async ({ id, statusDel, expectedDel }) => {
                        const data = await agent
                            .delete(`/usersui/roles/${id}/users`)
                            .send({
                                user_id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                            })
                            .expect(statusDel);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedDel)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, GET /usersui/roles/:id/rules',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .get(`/usersui/roles/${id}/rules`)
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, GET /usersui/roles/:id/users',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .get(`/usersui/roles/${id}/users`)
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //-------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, GET /usersui/roles/:id/meta',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .get(`/usersui/roles/${id}/meta`)
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
            });
            //-------------------------------------------------------------------------------
            // проверка основных роутов на функционал
            //-------------------------------------------------------------------------------
            test('GET /usersui/roles', async () => {
                const response = await agent.get('/usersui/roles').expect(200);

                expect(response.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining(defaultRole),
                    ])
                );
            });
            //-------------------------------------------------------------------------------
            test.each(invalidNames)(
                'POST /usersui/roles с некорректным name',
                async (name) => {
                    const data = await agent
                        .post('/usersui/roles')
                        .send({ name })
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'POST /usersui/roles не возможно создать роли с одинаковым name',
                async (role) => {
                    await agent.post('/usersui/roles').send(role).expect(200);

                    const res = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(400);

                    expect(res.body).toEqual(
                        expect.objectContaining({
                            message: 'Роль с таким именем уже существует',
                            errors: expect.any(Array),
                            stack: expect.any(String),
                            original: {},
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'POST /usersui/roles не возможно создать роли с name, который существовал, но был удален  (markdel = 1) ',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    await agent
                        .delete(`/usersui/roles/${id}`)
                        .expect(200, role.expectDel);

                    const res = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(400);

                    expect(res.body).toEqual(
                        expect.objectContaining({
                            message: 'Роль с таким именем уже существует',
                            errors: expect.any(Array),
                            stack: expect.any(String),
                            original: {},
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test('POST /usersui/roles невалидный name', async () => {
                const data = await agent
                    .post('/usersui/roles')
                    .send({ color: '', details: '', name: '' })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: 'Ошибка при валидации',
                        errors: expect.any(Array),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test('POST /usersui/roles невалидный color', async () => {
                const data = await agent
                    .post('/usersui/roles')
                    .send({ name: '', details: '' })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: 'Ошибка при валидации',
                        errors: expect.any(Array),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test('POST /usersui/roles невалидный details', async () => {
                const data = await agent
                    .post('/usersui/roles')
                    .send({ name: '', color: '' })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: 'Ошибка при валидации',
                        errors: expect.any(Array),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test.each(roles)('POST /usersui/roles', async (role) => {
                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                const response1 = await agent.get('/usersui/roles').expect(200);

                delete newRole.body.createdAt;
                delete newRole.body.updatedAt;
                delete newRole.body.markdel;
                expect(response1.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining(defaultRole),
                        expect.objectContaining(newRole.body),
                    ])
                );

                const newRole2 = await agent
                    .post('/usersui/roles')
                    .send({ ...role, name: 'newRole2' })
                    .expect(200);

                delete newRole2.body.createdAt;
                delete newRole2.body.updatedAt;
                delete newRole2.body.markdel;
                const response2 = await agent.get('/usersui/roles').expect(200);

                expect(response2.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining(defaultRole),
                        expect.objectContaining(newRole.body),
                        expect.objectContaining(newRole2.body),
                    ])
                );
            });
            //-------------------------------------------------------------------------------
            test.each(roles)('GET /usersui/roles/:id', async (role) => {
                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                delete newRole.body.createdAt;
                delete newRole.body.updatedAt;
                delete newRole.body.markdel;
                await agent
                    .get(`/usersui/roles/${newRole.body.id}`)
                    .expect(200, newRole.body);
            });
            //-------------------------------------------------------------------------------
            test.each(roles)('DELETE /usersui/roles/:id', async (role) => {
                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                const { id } = newRole.body;

                await agent
                    .delete(`/usersui/roles/${id}`)
                    .expect(200, role.expectDel);

                const data = await agent
                    .get(`/usersui/roles/${id}`)
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: 'Такой роли не существует',
                        errors: expect.any(Array),
                    })
                );
            });
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'PUT /usersui/roles/:id c невалидными параметрами',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const data = await agent
                        .put(`/usersui/roles/${newRole.body.id}`)
                        .send({})
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                    expect(data.body.errors).toHaveLength(2);
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)('PUT /usersui/roles/:id', async (role) => {
                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                const newRoleData = {
                    name: 'new-name',
                    details: 'new-details',
                    color: 'new-color',
                };
                const { id } = newRole.body;

                const roleData = await agent
                    .put(`/usersui/roles/${id}`)
                    .send(newRoleData)
                    .expect(200);

                expect(roleData.body).toEqual(
                    expect.objectContaining({ id, ...newRoleData })
                );
            });
            //-------------------------------------------------------------------------------
            test.each(roles)('GET /usersui/roles/:id/meta', async (role) => {
                const meta = await agent
                    .get(`/usersui/roles/${defaultRole.id}/meta`)
                    .expect(200);

                const { users, rules } = meta.body;

                defaultRoleUsers.forEach((user) =>
                    expect(users).toContainEqual(user)
                );
                defaultRoleRules.forEach((rule) =>
                    expect(rules).toContainEqual(rule)
                );

                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                await agent
                    .get(`/usersui/roles/${newRole.body.id}/meta`)
                    .expect(200, {
                        users: [],
                        rules: [],
                    });
            });
            //-------------------------------------------------------------------------------
            test.each(roles)('GET /usersui/roles/:id/users', async (role) => {
                const res = await agent
                    .get(`/usersui/roles/${defaultRole.id}/users`)
                    .expect(200);

                expect(res.body).toEqual(
                    expect.arrayContaining(defaultRoleUsers)
                );

                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                await agent
                    .get(`/usersui/roles/${newRole.body.id}/users`)
                    .expect(200, []);
            });
            //-------------------------------------------------------------------------------
            test.each(roles)('GET /usersui/roles/:id/rules', async (role) => {
                const data = await agent
                    .get(`/usersui/roles/${defaultRole.id}/rules`)
                    .expect(200);

                expect(data.body).toEqual(
                    expect.arrayContaining(defaultRoleRules)
                );

                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                await agent
                    .get(`/usersui/roles/${newRole.body.id}/rules`)
                    .expect(200, []);
            });
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'POST /usersui/roles/:id/rules с невалидным rule_id',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    const data = await agent
                        .post(`/usersui/roles/${id}/rules`)
                        .send({})
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                    expect(data.body.errors).toHaveLength(1);
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'POST /usersui/roles/:id/rules с несуществующим rule_id',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    const res = await agent
                        .post(`/usersui/roles/${id}/rules`)
                        .send({
                            rule_id: '83931acf-eaa8-463a-8ee9-4ca411de35fc',
                        })
                        .expect(400);

                    expect(res.body).toEqual(
                        expect.objectContaining({
                            message: 'Такого права не существует',
                            errors: expect.any(Array),
                            stack: expect.any(String),
                            original: {},
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)('POST /usersui/roles/:id/rules', async (role) => {
                const newRole = await agent
                    .post('/usersui/roles')
                    .send(role)
                    .expect(200);

                const { id } = newRole.body;
                const [rule1, rule2] = newRuleIds;
                const [ruleData1, ruleData2] = newRulesData;

                await agent
                    .post(`/usersui/roles/${id}/rules`)
                    .send({ rule_id: rule1 })
                    .expect(200, { result: true });

                const meta1 = await agent
                    .get(`/usersui/roles/${id}/meta`)
                    .expect(200);

                const rules1 = await agent
                    .get(`/usersui/roles/${id}/rules`)
                    .expect(200);

                expect(meta1.body).toEqual(
                    expect.objectContaining({
                        users: [],
                        rules: expect.arrayContaining([ruleData1]),
                    })
                );
                expect(rules1.body).toEqual(
                    expect.arrayContaining([ruleData1])
                );

                await agent
                    .post(`/usersui/roles/${id}/rules`)
                    .send({ rule_id: rule2 })
                    .expect(200, { result: true });

                const meta2 = await agent
                    .get(`/usersui/roles/${id}/meta`)
                    .expect(200);

                const rules2 = await agent
                    .get(`/usersui/roles/${id}/rules`)
                    .expect(200);

                expect(meta2.body).toEqual(
                    expect.objectContaining({
                        users: [],
                        rules: expect.arrayContaining([ruleData2, ruleData1]),
                    })
                );
                expect(rules2.body).toEqual(
                    expect.arrayContaining([ruleData1, ruleData2])
                );
            });
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'DELETE /usersui/roles/:id/rules с невалидным rule_id',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    const data = await agent
                        .delete(`/usersui/roles/${id}/rules`)
                        .send({})
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                    expect(data.body.errors).toHaveLength(1);
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'DELETE /usersui/roles/:id/rules',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;
                    const [rule1, rule2] = newRuleIds;
                    const [, ruleData2] = newRulesData;

                    await agent
                        .post(`/usersui/roles/${id}/rules`)
                        .send({ rule_id: rule1 })
                        .expect(200, { result: true });

                    await agent
                        .post(`/usersui/roles/${id}/rules`)
                        .send({ rule_id: rule2 })
                        .expect(200, { result: true });

                    await agent
                        .delete(`/usersui/roles/${id}/rules`)
                        .send({ rule_id: rule1 })
                        .expect(200, { result: true });

                    const rules1 = await agent
                        .get(`/usersui/roles/${id}/rules`)
                        .expect(200);

                    const meta1 = await agent
                        .get(`/usersui/roles/${id}/meta`)
                        .expect(200);

                    await agent
                        .delete(`/usersui/roles/${id}/rules`)
                        .send({ rule_id: rule2 })
                        .expect(200, { result: true });

                    const rules2 = await agent
                        .get(`/usersui/roles/${id}/rules`)
                        .expect(200);

                    const meta2 = await agent
                        .get(`/usersui/roles/${id}/meta`)
                        .expect(200);

                    expect(meta1.body).toEqual(
                        expect.objectContaining({
                            users: [],
                            rules: [ruleData2],
                        })
                    );
                    expect(meta2.body).toEqual(
                        expect.objectContaining({
                            users: [],
                            rules: [],
                        })
                    );
                    expect(rules1.body).toEqual(
                        expect.arrayContaining([ruleData2])
                    );
                    expect(rules2.body).toEqual(expect.arrayContaining([]));
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'POST /usersui/roles/:id/users с невалидным user_id ',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    const data = await agent
                        .post(`/usersui/roles/${id}/rules`)
                        .send({})
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                    expect(data.body.errors).toHaveLength(1);
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'POST /usersui/roles/:id/users с несуществующим user_id',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    const res = await agent
                        .post(`/usersui/roles/${id}/users`)
                        .send({
                            user_id: '83931acf-eaa8-463a-8ee9-4ca411de35fc',
                        })
                        .expect(400);

                    expect(res.body).toEqual(
                        expect.objectContaining({
                            message: 'Такого пользователя не существует',
                            errors: expect.any(Array),
                            stack: expect.any(String),
                            original: {},
                        })
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(roles)(
                'POST /usersui/roles/:id/users',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;
                    const [user1, user2] = users;

                    const userData1 = await agent
                        .post('/usersui/users')
                        .send(user1)
                        .expect(200);

                    const userData2 = await agent
                        .post('/usersui/users')
                        .send(user2)
                        .expect(200);

                    const newUser1 = {
                        id: userData1.body.id,
                        login: userData1.body.login,
                        status: userData1.body.status,
                        markdel: 0,
                    };
                    const newUser2 = {
                        id: userData2.body.id,
                        login: userData2.body.login,
                        status: userData2.body.status,
                        markdel: 0,
                    };

                    await agent
                        .post(`/usersui/roles/${id}/users`)
                        .send({ user_id: newUser1.id })
                        .expect(200, { result: true });

                    const meta1 = await agent
                        .get(`/usersui/roles/${id}/meta`)
                        .expect(200);

                    const users1 = await agent
                        .get(`/usersui/roles/${id}/users`)
                        .expect(200);

                    expect(meta1.body.users).toContainEqual(newUser1);
                    expect(users1.body).toEqual(
                        expect.arrayContaining([newUser1])
                    );

                    await agent
                        .post(`/usersui/roles/${id}/users`)
                        .send({ user_id: newUser2.id })
                        .expect(200, { result: true });

                    const meta2 = await agent
                        .get(`/usersui/roles/${id}/meta`)
                        .expect(200);

                    const users2 = await agent
                        .get(`/usersui/roles/${id}/users`)
                        .expect(200);

                    expect(meta2.body.users).toContainEqual(newUser2);
                    expect(meta2.body.users).toContainEqual(newUser1);

                    expect(users2.body).toEqual(
                        expect.arrayContaining([newUser1, newUser2])
                    );
                }
            );
            //-------------------------------------------------------------------------------
            test.each(roles)(
                'DELETE /usersui/roles/:id/users с невалидным user_id',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;

                    const data = await agent
                        .delete(`/usersui/roles/${id}/users`)
                        .send({})
                        .expect(400);

                    expect(data.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                    expect(data.body.errors).toHaveLength(1);
                }
            );
            //-------------------------------------------------------------------------------
            test.skip.each(roles)(
                'DELETE /usersui/roles/:id/users',
                async (role) => {
                    const newRole = await agent
                        .post('/usersui/roles')
                        .send(role)
                        .expect(200);

                    const { id } = newRole.body;
                    const [user1, user2] = users;

                    const userData1 = await agent
                        .post('/usersui/users')
                        .send(user1)
                        .expect(200);

                    const userData2 = await agent
                        .post('/usersui/users')
                        .send(user2)
                        .expect(200);

                    const newUser1 = {
                        id: userData1.body.id,
                        login: userData1.body.login,
                        status: userData1.body.status,
                    };
                    const newUser2 = {
                        id: userData2.body.id,
                        login: userData2.body.login,
                        status: userData2.body.status,
                        markdel: 0,
                    };

                    await agent
                        .post(`/usersui/roles/${id}/users`)
                        .send({ user_id: newUser1.id })
                        .expect(200, { result: true });

                    await agent
                        .post(`/usersui/roles/${id}/users`)
                        .send({ user_id: newUser2.id })
                        .expect(200, { result: true });

                    await agent
                        .delete(`/usersui/roles/${id}/users`)
                        .send({ user_id: newUser1.id })
                        .expect(200, { result: true });

                    const meta1 = await agent
                        .get(`/usersui/roles/${id}/meta`)
                        .expect(200);

                    const users1 = await agent
                        .get(`/usersui/roles/${id}/users`)
                        .expect(200);

                    await agent
                        .delete(`/usersui/roles/${id}/users`)
                        .send({ user_id: newUser2.id })
                        .expect(200, { result: true });

                    const meta2 = await agent
                        .get(`/usersui/roles/${id}/meta`)
                        .expect(200, {
                            rules: [],
                            users: [],
                        });

                    const users2 = await agent
                        .get(`/usersui/roles/${id}/users`)
                        .expect(200, []);

                    expect(meta1.body.users).toContainEqual(newUser2);

                    expect(meta2.body.users).toHaveLength(0);
                    expect(meta2.body.rules).toHaveLength(0);

                    expect(users1.body).toEqual(
                        expect.arrayContaining([newUser2])
                    );
                    expect(users2.body).toEqual(expect.arrayContaining([]));
                }
            );
            //-------------------------------------------------------------------------------
            //-------------------------------------------------------------------------------
        });
    });
});
