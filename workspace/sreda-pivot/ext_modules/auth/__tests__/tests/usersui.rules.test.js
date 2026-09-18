const { userIds } = require('../../../test-cms/fixtures/default.fixtures');

const {
    ids,
    rules,
    allRules,
    user,
} = require('../fixtures/usersui.rules.fixtures');
const { User, UserInfo } = sreda.models;
const { Op } = require('sequelize');

describe('расширение auth', () => {
    let agent;

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
                    markdel: [0, 1],
                },
                force: true,
            });
            await UserInfo.destroy({
                where: {
                    id: {
                        [Op.notIn]: userIds,
                    },
                    markdel: [0, 1],
                },
                force: true,
            });
        });
        //-------------------------------------------------------------------------------
        test.each(ids)(
            'GET /usersui/rules/:id/meta с некорректным id = $id',
            async ({ id, status, expected }) => {
                const data = await agent
                    .get(`/usersui/rules/${id}/meta`)
                    .expect(status);

                expect(data.body).toEqual(expect.objectContaining(expected));
            }
        );
        //-------------------------------------------------------------------------------
        test.skip.each(rules)(
            'GET /usersui/rules/:id/meta',
            async ({ id, expectDefault }) => {
                await agent
                    .get(`/usersui/rules/${id}/meta`)
                    .expect(200, expectDefault);

                const newUser = await agent
                    .post('/usersui/users')
                    .send(user)
                    .expect(200);

                await agent
                    .post(`/usersui/users/${newUser.body.id}/rules`)
                    .send({ rule_id: id })
                    .expect(200);

                const response = await agent
                    .get(`/usersui/rules/${id}/meta`)
                    .expect(200);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        ...expectDefault,
                        users: [
                            ...expectDefault.users,
                            {
                                id: newUser.body.id,
                                login: newUser.body.login,
                                status: newUser.body.status,
                                markdel: newUser.body.markdel,
                            },
                        ],
                    })
                );
                // todo добавить тест с добавлением нового права роли
            }
        );
        //-------------------------------------------------------------------------------
        test('GET /usersui/rules ', async () => {
            const response = await agent.get('/usersui/rules').expect(200);

            expect(response.body).toEqual(
                expect.arrayContaining([...allRules])
            );
        });
    });
});
