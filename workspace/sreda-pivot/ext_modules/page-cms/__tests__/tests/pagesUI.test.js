require('../../../test-cms/src/loadModuleDependencies')(__dirname);
const { getHttpAgent } = require('../../../test-cms/src/getHttpAgent');
const httpAgent = getHttpAgent();

const {
    pages,
    paramTypeJavascript,
    validationError,
    expectPageNotFound,
    templateParams,
    pageParams,
} = require('../fixtures/pages.fixtures');
const {
    Page,
    Sequelize,
    Template,
    sequelize,
} = require('../../../../db/models');
const { Op } = Sequelize;

describe('расширение page-cms', () => {
    let agent;

    describe('Динамические страницы', () => {
        describe('Пользователь авторизован как админ', () => {
            beforeAll(async () => {
                const {
                    getAuthedAgent,
                } = require('../../../test-cms/src/getAuthedAgent');
                const authedData = await getAuthedAgent(httpAgent);
                agent = authedData.agent;
            });

            afterAll(async () => {
                await sequelize.close();
                await new Promise((resolve) =>
                    setTimeout(() => resolve(), 500)
                );
            });

            afterEach(async () => {
                await Page.destroy({
                    where: {
                        id: {
                            [Op.ne]: '00000000-0000-0000-0000-000000000000',
                        },
                    },
                    force: true,
                });
                await Template.destroy({
                    where: {
                        name: [
                            'template',
                            'template1',
                            'template2',
                            'newTemplate',
                            'newTemplate2',
                        ],
                    },
                    force: true,
                });
            });
            //----------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------
            test('GET /dynpage/random - запрос несуществующей страницы', async () => {
                await agent.get('/dynpage/random/page').expect(404, {
                    ...expectPageNotFound,
                    message: 'Такой страницы не существует: random/page',
                });
            });
            //----------------------------------------------------------------------------------------
            test('GET /dynpage/* проверка возврата строки с подставленными параметрами шаблона', async () => {
                const page = {
                    parent: '00000000-0000-0000-0000-000000000000',
                    parentUri: '',
                    name: 'page1',
                    content_type: 'text/html',
                };
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                await agent.put(`/pages/${id}`).send({ active: 1 }).expect(200);

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
                    .send({ data: '[[ param1 ]] +++++ [[ param2 ]]' })
                    .expect(200);

                const params = await agent
                    .get(`/pages/${id}/template/${templatId}/params`)
                    .expect(200);

                const [param1, param2] = params.body;

                await agent
                    .put(`/pages/${id}`)
                    .send({
                        template: templatId,
                    })
                    .expect(200);

                await agent
                    .put(`/pages/${id}/params/${param1.id}`)
                    .send({
                        value: 'new1',
                    })
                    .expect(200);

                await agent
                    .put(`/pages/${id}/params/${param2.id}`)
                    .send({
                        value: 'new2',
                    })
                    .expect(200);

                await agent.get('/dynpage/page1').expect(200, {});
            });
            //----------------------------------------------------------------------------------------
            test('GET /dynpage/* проверка возврата валидного сериализованного объекта с подставленными параметрами шаблона', async () => {
                const page = {
                    parent: '00000000-0000-0000-0000-000000000000',
                    parentUri: '',
                    name: 'page1',
                };
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                await agent
                    .put(`/pages/${id}`)
                    .send({
                        active: 1,
                        // uri:
                    })
                    .expect(200);

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
                    .send({
                        data: '{"test": "[[ param1 ]]", "test2": "[[ param2 ]]"}',
                    })
                    .expect(200);

                const params = await agent
                    .get(`/pages/${id}/template/${templatId}/params`)
                    .expect(200);

                const [param1, param2] = params.body;
                const firstParam =
                    param1.name === 'param1' ? param1.id : param2.id;
                const secondParam =
                    param2.name === 'param2' ? param2.id : param1.id;

                await agent
                    .put(`/pages/${id}`)
                    .send({
                        template: templatId,
                    })
                    .expect(200);

                await agent
                    .put(`/pages/${id}/params/${firstParam}`)
                    .send({
                        value: 'new1',
                    })
                    .expect(200);

                await agent
                    .put(`/pages/${id}/params/${secondParam}`)
                    .send({
                        value: 'new2',
                    })
                    .expect(200);

                const data = await agent.get('/dynpage/page1').expect(200);

                const obj = JSON.parse(data.text);
                expect(obj).toEqual({
                    test: 'new1',
                    test2: 'new2',
                });
            });
            //----------------------------------------------------------------------------------------
            test('GET /dynpage/dinamic/:param запрос с параметрами', async () => {
                const page = {
                    parent: '00000000-0000-0000-0000-000000000000',
                    parentUri: '',
                    name: 'page1',
                };
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                await agent
                    .put(`/pages/${id}`)
                    .send({
                        active: 1,
                        uri: 'dinamic/:param',
                    })
                    .expect(200);

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
                    .send({
                        data: '{"test": "[[ param1 ]]", "test2": "[[ param2 ]]"}',
                    })
                    .expect(200);

                const params = await agent
                    .get(`/pages/${id}/template/${templatId}/params`)
                    .expect(200);

                const [param1, param2] = params.body;

                await agent
                    .put(`/templates/${templatId}/params/${param1.id}`)
                    .send({ params_type_id: paramTypeJavascript })
                    .expect(200, { result: true });

                await agent
                    .put(`/templates/${templatId}/params/${param2.id}`)
                    .send({ params_type_id: paramTypeJavascript })
                    .expect(200, { result: true });

                await agent
                    .put(`/pages/${id}`)
                    .send({
                        template: templatId,
                    })
                    .expect(200);

                await agent
                    .put(`/pages/${id}/params/${param1.id}`)
                    .send({
                        value: 'return page.UrlParams.param;',
                    })
                    .expect(200);

                await agent
                    .put(`/pages/${id}/params/${param2.id}`)
                    .send({
                        value: 'return page.UrlParams.param;;',
                    })
                    .expect(200);

                const data1 = await agent
                    .get('/dynpage/dinamic/paramtest')
                    .expect(200);

                const obj1 = JSON.parse(data1.text);
                expect(obj1).toEqual({
                    test: 'paramtest',
                    test2: 'paramtest',
                });

                const data2 = await agent
                    .get('/dynpage/dinamic/paramtest')
                    .expect(200);

                const obj2 = JSON.parse(data2.text);
                expect(obj2).toEqual({
                    test: 'paramtest',
                    test2: 'paramtest',
                });
            });
            //----------------------------------------------------------------------------------------

            test.each(pages)(
                'GET /dynpage/breadcrumbs/:id - Просмотр полного пути до страницы',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;

                    const childPageData1 = {
                        name: 'child1',
                        parent: id,
                        parentUri: newPage.body.uri,
                    };

                    const childPageData2 = {
                        name: 'child2',
                        parent: id,
                        parentUri: newPage.body.uri,
                    };

                    const rootPageMeta = await agent
                        .get(`/pages/${id}`)
                        .expect(200);

                    const childPageCreate1 = await agent
                        .post('/pages')
                        .send(childPageData1)
                        .expect(200);
                    const childPage1 = await agent
                        .get(`/pages/${childPageCreate1.body.id}`)
                        .expect(200);

                    const breadcrumbsChildPage1 = await agent
                        .get(`/dynpage/breadcrumbs/${childPage1.body.page.id}`)
                        .expect(200);

                    expect(breadcrumbsChildPage1.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: rootPageMeta.body.page.id,
                            }),
                            expect.objectContaining({
                                id: childPage1.body.page.id,
                            }),
                        ])
                    );

                    const childPageCreate2 = await agent
                        .post('/pages')
                        .send(childPageData2)
                        .expect(200);
                    const childPage2 = await agent
                        .get(`/pages/${childPageCreate2.body.id}`)
                        .expect(200);

                    const breadcrumbsChildPage2 = await agent
                        .get(`/dynpage/breadcrumbs/${childPage2.body.page.id}`)
                        .expect(200);

                    expect(breadcrumbsChildPage2.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: rootPageMeta.body.page.id,
                            }),
                            expect.objectContaining({
                                id: childPage2.body.page.id,
                            }),
                        ])
                    );
                }
            );
            //----------------------------------------------------------------------------------------
            describe('GET /dynpage/meta/:id', () => {
                test('Некорректный id', async () => {
                    const response = await agent
                        .get(`/dynpage/meta/asdasdasd`)
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining(validationError)
                    );
                });
                test('Не существующий id', async () => {
                    const response = await agent
                        .get(
                            `/dynpage/meta/99999999-9999-9999-9999-999999999999`
                        )
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining(expectPageNotFound)
                    );
                });
                test('Просмотр мета данных всех вложенных страниц', async () => {
                    const page = {
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'page1',
                    };

                    const {
                        body: { id },
                    } = await agent.post('/pages').send(page).expect(200);

                    const meta = await agent
                        .get(`/dynpage/meta/${id}`)
                        .expect(200);

                    expect(meta.body).toEqual(
                        expect.objectContaining({
                            page: expect.objectContaining({ id }),
                            children: expect.any(Array),
                            total: meta.body.children.length,
                        })
                    );
                });
            });
            //----------------------------------------------------------------------------------------
            describe('POST /dynpage/render/:id', () => {
                test('Некорректный id', async () => {
                    const response = await agent
                        .post(`/dynpage/render/asdasdasd`)
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining(validationError)
                    );
                });
                //----------------------------------------------------------------------------------------
                test.skip('Не существующий id', async () => {
                    const response = await agent
                        .post(
                            `/dynpage/render/99999999-9999-9999-9999-999999999999`
                        )
                        .send(templateParams)
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining(expectPageNotFound)
                    );
                });
                //----------------------------------------------------------------------------------------
                test.skip('Пустой body', async () => {
                    const response = await agent
                        .post(
                            `/dynpage/render/99999999-9999-9999-9999-999999999999`
                        )
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining(validationError)
                    );
                });
                //----------------------------------------------------------------------------------------
                test('Некорректный body', async () => {
                    const response = await agent
                        .post(
                            `/dynpage/render/99999999-9999-9999-9999-999999999999`
                        )
                        .send({ a: 'b', c: 'd' })
                        .expect(400);

                    expect(response.body).toEqual(
                        expect.objectContaining(validationError)
                    );
                });
                //----------------------------------------------------------------------------------------
                test('Просмотр контента страницы', async () => {
                    const {
                        body: { id },
                    } = await agent.post('/pages').send(pages[0]).expect(200);
                    await agent
                        .put(`/pages/${id}`)
                        .send({ active: 1 })
                        .expect(200);

                    const {
                        body: { id: templateId },
                    } = await agent
                        .post('/templates')
                        .send({
                            name: 'template1',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);
                    await agent
                        .put(`/pages/${id}`)
                        .send({ template: templateId })
                        .expect(200);
                    await agent
                        .put(`/templates/${templateId}`)
                        .send({ data: '[[ param ]]' })
                        .expect(200);

                    const {
                        body: [param],
                    } = await agent
                        .get(`/pages/${id}/template/${templateId}/params`)
                        .expect(200);

                    await agent
                        .put(`/templates/${templateId}/params/${param.id}`)
                        .send({
                            params_type_id:
                                'f9a427f9-956c-4367-a0bd-719fa1f54ba1',
                        })
                        .expect(200);
                    await agent
                        .put(`/pages/${id}/params/${param.id}`)
                        .send({ value: 'new1' })
                        .expect(200);
                    const updatedParams = await agent
                        .get(`/pages/${id}/template/${templateId}/params`)
                        .expect(200);

                    const testparam = {
                        ...updatedParams.body[0],
                        paramtype: 'json',
                    };

                    const render = await agent
                        .post(`/dynpage/render/${templateId}`)
                        .send([testparam])
                        .expect(200);

                    expect(render.body).toEqual(
                        expect.objectContaining({
                            form: expect.any(String),
                            script: {
                                varsPrimitive: {},
                                classes: {},
                                functions: {},
                                vars: {},
                            },
                        })
                    );
                });
            });
            //----------------------------------------------------------------------------------------
            describe('POST /dynpage/render', () => {
                test('Пустой body', async () => {
                    const render = await agent
                        .post(`/dynpage/render`)
                        .expect(400);

                    expect(render.body).toEqual(
                        expect.objectContaining(validationError)
                    );
                });
                //----------------------------------------------------------------------------------------
                test('Некорректный body', async () => {
                    const render = await agent
                        .post(`/dynpage/render`)
                        .send({ a: 'b', c: 'd' })
                        .expect(400);

                    expect(render.body).toEqual(
                        expect.objectContaining(validationError)
                    );
                });
                //----------------------------------------------------------------------------------------
                describe('MISP-3154', () => {
                    test('Отсутствующий form', async () => {
                        const render = await agent
                            .post(`/dynpage/render`)
                            .send({
                                content_type: 'application/json',
                                Template: { script: '' },
                                PagesParams: [],
                                UrlParams: [],
                            })
                            .expect(400);

                        expect(render.body).toEqual(
                            expect.objectContaining(validationError)
                        );
                    });
                    //----------------------------------------------------------------------------------------
                    test('Пустой form', async () => {
                        const render = await agent
                            .post(`/dynpage/render`)
                            .send({
                                content_type: 'application/json',
                                Template: { form: '', script: '' },
                                PagesParams: [],
                                UrlParams: [],
                            })
                            .expect(400);

                        expect(render.body).toEqual(
                            expect.objectContaining(validationError)
                        );
                    });
                });
                //----------------------------------------------------------------------------------------
                describe.each(pageParams)(
                    'Рендер произвольного шаблона',
                    (PageParam) => {
                        test(`Параметр ${PageParam.paramtype}`, async () => {
                            const render = await agent
                                .post(`/dynpage/render`)
                                .send({
                                    content_type: 'text/html',
                                    Template: {
                                        form: '[[ param ]]',
                                        script: '',
                                    },
                                    PagesParams: [PageParam],
                                    UrlParams: [],
                                })
                                .expect(200);

                            expect(render.body).toEqual(PageParam.result);
                        });
                    }
                );
            });
        });
    });
});
