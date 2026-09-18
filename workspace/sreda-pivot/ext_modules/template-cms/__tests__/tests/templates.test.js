const { Template } = sreda.models;
const {
    ids,
    listTypes,
    invalidValues,
    templateDatas,
    newParamsType,
    errorTemplateExist,
    msgErrorValidation,
    msgErrorTemplateExist,
    msgErrorNameInvalid,
} = require('../fixtures/templates.fixtures');

describe('расширение template-cms', () => {
    let agent;

    describe('Редактирование шаблонов', () => {
        describe('Пользователь авторизован как админ', () => {
            beforeAll(async () => {
                const { getAuthedAgent } = require('../../../test-cms/src/getAuthedAgent');
                const authedData = await getAuthedAgent();
                agent = authedData.agent;
            });

            afterEach(async () => {
                await Template.destroy({
                    where: {
                        name: ['template', 'template1', 'template2', 'newTemplate', 'newTemplate2'],
                    },
                    force: true,
                });
            });
            //----------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------
            describe('Проверка на некорректный id в строке запроса', () => {
                test.each(ids)('id = $id, GET /templates/:id', async ({ id, status, expected }) => {
                    const data = await agent.get(`/templates/${id}`).expect(status);

                    expect(data.body).toEqual(expect.objectContaining(expected));
                });
                //----------------------------------------------------------------------------------------
                test.each(ids)('id = $id, PUT /templates/:id', async ({ id, status, expected }) => {
                    const data = await agent
                        .put(`/templates/${id}`)
                        .send({
                            name: 'test',
                            data: 'test',
                        })
                        .expect(status);

                    expect(data.body).toEqual(expect.objectContaining(expected));
                });
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, DELETE /templates/:id',
                    async ({ id, statusDel, expectedDel }) => {
                        const data = await agent.delete(`/templates/${id}`).expect(statusDel);

                        expect(data.body).toEqual(expect.objectContaining(expectedDel));
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, GET /templates/:id/params',
                    async ({ id, status, expected }) => {
                        const data = await agent.get(`/templates/${id}/params`).expect(status);

                        expect(data.body).toEqual(expect.objectContaining(expected));
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    '(id, param_id) = $id , PUT /templates/:id/params/:param_id',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .put(`/templates/${id}/params/${id}`)
                            .send({
                                params_type_id: id,
                            })
                            .expect(status);

                        expect(data.body).toEqual(expect.objectContaining(expected));
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'PUT /templates/:id/params/:param_id c некорректным param_id = $id',
                    async ({ id, status, expectedParam }) => {
                        const newTemplate = await agent
                            .post('/templates')
                            .send({
                                name: 'template1',
                                parent: '00000000-0000-0000-0000-000000000000',
                            })
                            .expect(200);

                        const templatId = newTemplate.body.id;

                        const response = await agent
                            .put(`/templates/${templatId}/params/${id}`)
                            .send({ params_type_id: templatId })
                            .expect(status);

                        expect(response.body).toEqual(expectedParam);
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'PUT /templates/:id/params/:param_id c некорректным params_type_id = $id в body',
                    async ({ id, status, expectedParamType }) => {
                        const newTemplate = await agent
                            .post('/templates')
                            .send({
                                name: 'template1',
                                parent: '00000000-0000-0000-0000-000000000000',
                            })
                            .expect(200);

                        const templatId = newTemplate.body.id;

                        await agent
                            .put(`/templates/${templatId}`)
                            .send({ data: '[[ param ]]' })
                            .expect(200);

                        const response = await agent
                            .get(`/templates/${templatId}/params`)
                            .expect(200);

                        const paramId = response.body[0].id;

                        const response2 = await agent
                            .put(`/templates/${templatId}/params/${paramId}`)
                            .send({ params_type_id: id })
                            .expect(status);

                        expect(response2.body).toEqual(expectedParamType);
                    }
                );
            });
            //----------------------------------------------------------------------------------------
            // тесты основной логики
            //----------------------------------------------------------------------------------------
            test('GET /templates/getlisttypes', async () => {
                const response = await agent.get('/templates/getlisttypes').expect(200);

                expect(response.body).toEqual(expect.arrayContaining(listTypes));
            });
            //----------------------------------------------------------------------------------------
            test.each(invalidValues)('POST /templates с некорректным name', async (value) => {
                const data = await agent
                    .post('/templates')
                    .send({ name: value, parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(400);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        message: 'Ошибка при валидации',
                        errors: expect.any(Array),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('POST /templates', async () => {
                const data = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        name: 'newTemplate',
                        parent: '00000000-0000-0000-0000-000000000000',
                    })
                );

                const response = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(400);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        message: 'Такое имя шаблона уже существует',
                        errors: expect.any(Array),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('GET /templates', async () => {
                const data1 = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                delete data1.body.markdel;

                const filter = JSON.stringify({ limit: 50 });
                const response = await agent.get(`/templates/?filter=${filter}`).expect(200);

                expect(response.body).toEqual(expect.arrayContaining([data1.body]));

                const data2 = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate2', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                delete data2.body.markdel;

                const filterOptions = JSON.stringify({ limit: 1000 });
                const templates = await agent
                    .get(`/templates/?filter=${filterOptions}`)
                    .expect(200);

                expect(templates.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining(data1.body),
                        expect.objectContaining(data2.body),
                    ])
                );
            });
            //----------------------------------------------------------------------------------------
            test('GET /templates/:id', async () => {
                const data = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const { id } = data.body;

                const response = await agent.get(`/templates/${id}`).expect(200);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        children: [],
                        template: expect.objectContaining({
                            data: data.body.data,
                            description: data.body.description,
                            id: data.body.id,
                            markdel: data.body.markdel,
                            name: data.body.name,
                            ParentInfo: expect.objectContaining({
                                id: '00000000-0000-0000-0000-000000000000',
                            }),
                        }),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('DELETE /templates/:id', async () => {
                const data1 = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const data2 = await agent
                    .post('/templates')
                    .send({ name: 'newTemplate2', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const id1 = data1.body.id;
                const id2 = data2.body.id;

                await agent.delete(`/templates/${id1}`).expect(200, { result: true });

                await agent.get(`/templates/${id1}`).expect(400, errorTemplateExist);

                await agent.delete(`/templates/${id2}`).expect(200, { result: true });

                await agent.get(`/templates/${id2}`).expect(400, errorTemplateExist);
            });
            //----------------------------------------------------------------------------------------
            test('Невозможность удаления root шаблона', async () => {
                await agent.delete('/templates/00000000-0000-0000-0000-000000000000').expect(400);
            });
            //----------------------------------------------------------------------------------------
            test.each(invalidValues)(
                'PUT /templates/:id c невалидным data = $value',
                async (value) => {
                    const data = await agent
                        .post('/templates')
                        .send({
                            name: 'newTemplate',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const { id } = data.body;

                    const response = await agent
                        .put(`/templates/${id}`)
                        .send({
                            data: value,
                            name: 'valid',
                        })
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(invalidValues)(
                'PUT /templates/:id c невалидным name = $value',
                async (value) => {
                    const data = await agent
                        .post('/templates')
                        .send({
                            name: 'newTemplate',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const { id } = data.body;

                    const response = await agent
                        .put(`/templates/${id}`)
                        .send({
                            name: value,
                            data: 'valid',
                        })
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            message: 'Ошибка при валидации',
                            errors: expect.any(Array),
                        })
                    );
                }
            );
            //----------------------------------------------------------------------------------------
            test('PUT /templates/:id невозможность изменить name на существующее значение', async () => {
                const data1 = await agent
                    .post('/templates')
                    .send({ name: 'template1', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                await agent
                    .post('/templates')
                    .send({ name: 'template2', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const id1 = data1.body.id;

                const response1 = await agent
                    .put(`/templates/${id1}`)
                    .send({
                        name: 'template2',
                        data: '',
                    })
                    .expect(400);

                expect(response1.body).toEqual(
                    expect.objectContaining({
                        message: 'Такое имя шаблона уже существует',
                        errors: expect.any(Array),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('PUT /templates/:id', async () => {
                const data = await agent
                    .post('/templates')
                    .send({
                        name: 'template',
                        parent: '00000000-0000-0000-0000-000000000000',
                    })
                    .expect(200);

                const { id } = data.body;

                const response = await agent
                    .put(`/templates/${id}`)
                    .send({
                        name: 'template2',
                    })
                    .expect(200);

                expect(response.body).toEqual(
                    expect.objectContaining({
                        id,
                        parent: '00000000-0000-0000-0000-000000000000',
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('PUT /templates/:id параметры шаблона, созданные и удаленные ранее, восстанавливаются, а не создаются новые', async () => {
                const data = await agent
                    .post('/templates')
                    .send({ name: 'template', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const { id } = data.body;

                await agent
                    .put(`/templates/${id}`)
                    .send({
                        name: 'template2',
                        data: '[[ param1 ]]',
                    })
                    .expect(200);

                const params = await agent.get(`/templates/${id}/params`).expect(200);

                const paramId = params.body[0].id;

                await agent
                    .put(`/templates/${id}`)
                    .send({
                        name: 'template2',
                        data: '[[ param2 ]]',
                    })
                    .expect(200);

                await agent
                    .put(`/templates/${id}`)
                    .send({
                        name: 'template2',
                        data: '[[ param1 ]]',
                    })
                    .expect(200);

                const response = await agent.get(`/templates/${id}/params`).expect(200);

                expect(response.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id: paramId,
                            name: 'param1',
                        }),
                    ])
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(templateDatas)('GET /templates/:id/params', async ({ data, params }) => {
                const newTemplate = await agent
                    .post('/templates')
                    .send({ name: 'template1', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const { id } = newTemplate.body;

                await agent.get(`/templates/${id}/params`).expect(200, []);

                await agent.put(`/templates/${id}`).send({ data }).expect(200);

                const response = await agent.get(`/templates/${id}/params`).expect(200);

                params.map((param) =>
                    expect(response.body).toEqual(
                        expect.arrayContaining([expect.objectContaining({ name: param })])
                    )
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(newParamsType)('PUT /templates/:id/params/:param_id', async (newType) => {
                const newTemplate = await agent
                    .post('/templates')
                    .send({ name: 'template1', parent: '00000000-0000-0000-0000-000000000000' })
                    .expect(200);

                const templatId = newTemplate.body.id;

                await agent
                    .put(`/templates/${templatId}`)
                    .send({ data: '[[ param ]]' })
                    .expect(200);

                const response1 = await agent.get(`/templates/${templatId}/params`).expect(200);

                const paramId = response1.body[0].id;

                await agent
                    .put(`/templates/${templatId}/params/${paramId}`)
                    .send({ params_type_id: newType })
                    .expect(200, { result: true });

                await agent.get(`/templates/${templatId}/params`).expect(200, [
                    {
                        id: paramId,
                        name: 'param',
                        template_id: templatId,
                        params_type_id: newType,
                        description: '',
                    },
                ]);
            });
            //----------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------
            describe('PUT /templates/:id/restore', () => {
                test('Некорректный id', async () => {
                    const response = await agent.put('/templates/dd/restore').expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            message: msgErrorValidation,
                            stack: '',
                            errors: expect.any(Array),
                        })
                    );

                    expect(response.body.errors).toHaveLength(1);
                });
                //----------------------------------------------------------------------------------------
                test('Несуществующий id', async () => {
                    await agent
                        .put('/templates/00000200-0000-0000-0000-000000000000/restore')
                        .expect(400, errorTemplateExist);
                });
                //----------------------------------------------------------------------------------------
                test('Восстановление удаленного шаблона', async () => {
                    const newTemplate = await agent
                        .post('/templates')
                        .send({ name: 'template1', parent: '00000000-0000-0000-0000-000000000000' })
                        .expect(200);

                    const templatId = newTemplate.body.id;

                    await agent.delete(`/templates/${templatId}`).expect(200);

                    await agent.get(`/templates/${templatId}`).expect(400);

                    await agent.put(`/templates/${templatId}/restore`).expect(200);

                    await agent.get(`/templates/${templatId}`).expect(200);
                });
            });
            //----------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------
            describe('Просмотр удаленных шаблонов', () => {
                test('GET /templates/:id', async () => {
                    const newTemplate = await agent
                        .post('/templates')
                        .send({
                            name: 'template1',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const { id } = newTemplate.body;

                    await agent.delete(`/templates/${id}`).expect(200);

                    await agent.get(`/templates/${id}`).expect(400);

                    const filter = JSON.stringify({ where: { markdel: '10' } });
                    const response = await agent
                        .get(`/templates/${id}/?filter=${filter}`)
                        .expect(200);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            template: expect.objectContaining({
                                id,
                            }),
                        })
                    );
                });
                //----------------------------------------------------------------------------------------
                test('GET /templates/:id/params', async () => {
                    const newTemplate = await agent
                        .post('/templates')
                        .send({
                            name: 'template1',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const { id } = newTemplate.body;

                    await agent.delete(`/templates/${id}`).expect(200);

                    await agent.get(`/templates/${id}.params`).expect(400);

                    const filter = JSON.stringify({ where: { markdel: '10' } });
                    await agent.get(`/templates/${id}/params/?filter=${filter}`).expect(200, []);
                });
            });
            //----------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------
            describe('POST /templates/copy', () => {
                test('Некорректные данные в body', async () => {
                    const response = await agent.post('/templates/copy').expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            message: msgErrorValidation,
                            stack: '',
                            errors: expect.any(Array),
                        })
                    );

                    expect(response.body.errors).toHaveLength(3);
                });
                //----------------------------------------------------------------------------------------
                test('Несуществующий id шаблона', async () => {
                    const response = await agent
                        .post('/templates/copy')
                        .send({
                            name: 'test',
                            id: 'ffe37133-ae7f-45eb-9407-0bf08ffb2a54',
                        })
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            message: msgErrorTemplateExist,
                            stack: '',
                            errors: [],
                        })
                    );
                });
                //----------------------------------------------------------------------------------------
                test('Нельзя скопировать и создать шаблон с одинаковым именем и родителем', async () => {
                    const newTemplate1 = await agent
                        .post('/templates')
                        .send({
                            name: 'template1',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const { id } = newTemplate1.body;

                    const response = await agent
                        .post('/templates/copy')
                        .send({
                            id,
                            name: 'template1',
                        })
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            message: msgErrorNameInvalid,
                            stack: '',
                            errors: [],
                        })
                    );
                });
                //----------------------------------------------------------------------------------------
                test('Копирование шаблона', async () => {
                    const newTemplate1 = await agent
                        .post('/templates')
                        .send({
                            name: 'template1',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const { id } = newTemplate1.body;

                    await agent.put(`/templates/${id}`).send({
                        data: '[[ param1 ]] [[ param2 ]]',
                    });

                    const response = await agent
                        .post('/templates/copy')
                        .send({
                            id,
                            name: 'template2',
                        })
                        .expect(200);

                    const copyId = response.body.id;

                    const copyTemplate = await agent.get(`/templates/${copyId}`).expect(200);

                    expect(copyTemplate.body).toEqual(
                        expect.objectContaining({
                            template: expect.objectContaining({
                                id: copyId,
                            }),
                        })
                    );

                    const copyParams = await agent.get(`/templates/${copyId}/params`).expect(200);

                    expect(copyParams.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                name: 'param1',
                            }),
                            expect.objectContaining({
                                name: 'param2',
                            }),
                        ])
                    );
                });
            });
        });
    });
});
