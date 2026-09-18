require('../../../test-cms/src/loadModuleDependencies')(__dirname);
const { getHttpAgent } = require('../../../test-cms/src/getHttpAgent');
const httpAgent = getHttpAgent();

const {
    Page,
    Sequelize,
    Template,
    sequelize,
} = require('../../../../db/models');
const { Op } = Sequelize;
const {
    ids,
    pages,
    expectUriExist,
    expectPageNotFound,
    validationError,
    pageAttributes,
    newPageData,
    PAGE_ROOT_ID,
} = require('../fixtures/pages.fixtures');
const { TEMPLATE_ROOT_ID } = require('../../../template-cms/src/constants');

describe('расширение page-cms', () => {
    let agent;

    describe('Редактирование страниц', () => {
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
            describe('Проверка на некорректный id в строке запроса', () => {
                test.each(ids)(
                    'id = $id, GET /pages/:id',
                    async ({ id, statusGet, expectedGet }) => {
                        const data = await agent
                            .get(`/pages/${id}`)
                            .expect(statusGet);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedGet)
                        );
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, DELETE /pages/:id',
                    async ({ id, statusDel, expectedDel }) => {
                        const data = await agent
                            .delete(`/pages/${id}`)
                            .expect(statusDel);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedDel)
                        );
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, PUT /pages/:id',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .put(`/pages/${id}`)
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'id = $id, GET /pages/:id/template/:template_id/params',
                    async ({ id, status, expected }) => {
                        const data = await agent
                            .get(`/pages/${id}/template/${id}/params`)
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expected)
                        );
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'paramId = $id, PUT /pages/params/:paramId',
                    async ({ id, status, expectedGetParam }) => {
                        const data = await agent
                            .put(`/pages/params/${id}`)
                            .send({
                                value: 'test',
                            })
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedGetParam)
                        );
                    }
                );
                //----------------------------------------------------------------------------------------
                test.each(ids)(
                    'paramId = $id, PUT /pages/:id/params/:paramId',
                    async ({ id, status, expectedGetParam }) => {
                        const pageId = '00000000-0000-0000-0000-000000000000';
                        const data = await agent
                            .put(`/pages/${pageId}/params/${id}`)
                            .send({
                                value: 'test',
                            })
                            .expect(status);

                        expect(data.body).toEqual(
                            expect.objectContaining(expectedGetParam)
                        );
                    }
                );
            });
            //----------------------------------------------------------------------------------------
            // тесты основной логики
            //----------------------------------------------------------------------------------------
            test('POST /pages c пустым body', async () => {
                const data = await agent.post('/pages').expect(400);

                expect(data.body).toEqual(validationError);

                expect(data.body.errors).toHaveLength(3);
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)('POST /pages  ', async (page) => {
                const data = await agent.post('/pages').send(page).expect(200);

                expect(data.body).toEqual(
                    expect.objectContaining({
                        parent: page.parent,
                        name: page.name,
                        uri: page.parentUri
                            ? `${page.parentUri}/${page.name}`
                            : page.name,
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'POST /pages невозможно создать страницу с одинаковым uri ',
                async (page) => {
                    await agent.post('/pages').send(page).expect(200);

                    await agent
                        .post('/pages')
                        .send(page)
                        .expect(400, expectUriExist);
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)('GET /pages/:id', async (page) => {
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                const uri = page.parentUri
                    ? `${page.parentUri}/${page.name}`
                    : page.name;

                const response = await agent.get(`/pages/${id}`).expect(200);

                expect(response.body).toEqual({
                    children: [],
                    page: expect.objectContaining({
                        parent: page.parent,
                        id,
                        name: page.name,
                        description: '',
                        uri,
                        urifind: uri,
                        active: 0,
                        content_type: page.content_type,
                        template: TEMPLATE_ROOT_ID,
                        link: PAGE_ROOT_ID,
                        Template: {
                            id: TEMPLATE_ROOT_ID,
                            name: 'root',
                            parent: TEMPLATE_ROOT_ID,
                        },
                        ParentInfo: {
                            id: PAGE_ROOT_ID,
                            name: 'root',
                            parent: PAGE_ROOT_ID,
                            uri: '',
                        },
                        PageLink: {
                            id: PAGE_ROOT_ID,
                            name: 'root',
                            parent: PAGE_ROOT_ID,
                        },
                        rank: 0,
                        markdel: 0,
                        PageParams: [],
                    }),
                });
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)('DELETE /pages/:id', async (page) => {
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                await agent
                    .delete(`/pages/${id}`)
                    .expect(200, { result: true });

                await agent.get(`/pages/${id}`).expect(400, expectPageNotFound);
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'DELETE /pages/:id рекурсивное удаление вложенных страниц',
                async (page) => {
                    const page1 = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const id1 = page1.body.id;
                    const childPageData = {
                        parent: id1,
                        parentUri: '/page1',
                        name: 'page2',
                    };

                    const page2 = await agent
                        .post('/pages')
                        .send(childPageData)
                        .expect(200);

                    const id2 = page2.body.id;

                    await agent
                        .delete(`/pages/${id1}`)
                        .expect(200, { result: true });

                    await agent
                        .get(`/pages/${id2}`)
                        .expect(400, expectPageNotFound);
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)('PUT /pages/:id  с пустым body', async (page) => {
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                const editedPage = await agent.put(`/pages/${id}`).expect(200);

                const pageData = newPage.body;
                delete pageData.updatedAt;
                delete pageData.countChildren;

                expect(editedPage.body).toEqual(
                    expect.objectContaining(pageData)
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(pageAttributes)(
                'PUT /pages/:id с невалидным $attr',
                async ({ attr }) => {
                    const [page] = pages;

                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;
                    const inValidValues = [{}, [], null, false];

                    const promises = inValidValues.map((value) =>
                        agent
                            .put(`/pages/${id}`)
                            .send({
                                [attr]: value,
                            })
                            .expect(400)
                            .then((data) =>
                                expect(data.body).toEqual(validationError)
                            )
                    );
                    await Promise.all(promises);
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'PUT /pages/:id с  невалидным  params',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;
                    const badValues = ['null', {}, '', 5];

                    const promises = badValues.map((badValue) =>
                        agent
                            .put(`/pages/${id}`)
                            .send({
                                params: badValue,
                            })
                            .expect(400)
                            .then((data) =>
                                expect(data.body).toEqual(validationError)
                            )
                    );

                    await Promise.all(promises);
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'PUT /pages/:id params в body с неcуществующим id параметра шаблона',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            params: [
                                { id: '1cc17d73-d5d4-432f-93a8-9022ca9e9f74' },
                            ],
                        })
                        .expect(400, {
                            message: 'Такого параметра шаблона не существует',
                            errors: [],
                            stack: '',
                            original: {},
                        });
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)('PUT /pages/:id', async (page) => {
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

                await agent.put(`/pages/${id}`).send(newPageData).expect(200);

                const responce = await agent.get(`/pages/${id}`).expect(200);

                expect(responce.body).toEqual(
                    expect.objectContaining({
                        children: [],
                        page: expect.objectContaining({
                            id,
                            ...newPageData,
                            rank: 0,
                            urifind: newPageData.uri,
                            markdel: 0,
                            PageParams: [],
                            Template: {
                                id: '00000000-0000-0000-0000-000000000000',
                                name: 'root',
                                parent: TEMPLATE_ROOT_ID,
                            },
                            ParentInfo: {
                                id: '00000000-0000-0000-0000-000000000000',
                                name: 'root',
                                parent: PAGE_ROOT_ID,
                                uri: '',
                            },
                            PageLink: {
                                id: '00000000-0000-0000-0000-000000000000',
                                name: 'root',
                                parent: PAGE_ROOT_ID,
                            },
                        }),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('При изменении имени меняется uri дочерних элементов', async () => {
                const page1 = await agent
                    .post('/pages')
                    .send({
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'page1',
                    })
                    .expect(200);

                const page1Id = page1.body.id;

                const page2 = await agent
                    .post('/pages')
                    .send({
                        parent: page1Id,
                        parentUri: 'page1',
                        name: 'page2',
                    })
                    .expect(200);

                const page2Id = page2.body.id;

                const page3 = await agent
                    .post('/pages')
                    .send({
                        parent: page2Id,
                        parentUri: 'page1/page2',
                        name: 'page3',
                    })
                    .expect(200);

                const page3Id = page3.body.id;

                await agent.put(`/pages/${page1Id}`).send({ name: 'newpage1' });

                const editedPage2 = await agent
                    .get(`/pages/${page2Id}`)
                    .expect(200);

                expect(editedPage2.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            uri: 'newpage1/page2',
                        }),
                    })
                );

                const editedPage3 = await agent
                    .get(`/pages/${page3Id}`)
                    .expect(200);

                expect(editedPage3.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            uri: 'newpage1/page2/page3',
                        }),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('PUT /pages/:id при измененении родителя должен меняться uri страницы и ее детей', async () => {
                const newRootPage = await agent
                    .post('/pages')
                    .send({
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'newpage',
                    })
                    .expect(200);

                const newRootPageId = newRootPage.body.id;

                const page1 = await agent
                    .post('/pages')
                    .send({
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'page1',
                    })
                    .expect(200);

                const page1Id = page1.body.id;

                const page2 = await agent
                    .post('/pages')
                    .send({
                        parent: page1Id,
                        parentUri: 'page1',
                        name: 'page2',
                    })
                    .expect(200);

                const page2Id = page2.body.id;

                const page3 = await agent
                    .post('/pages')
                    .send({
                        parent: page2Id,
                        parentUri: 'page1/page2',
                        name: 'page3',
                    })
                    .expect(200);

                const page3Id = page3.body.id;

                await agent
                    .put(`/pages/${page1Id}`)
                    .send({
                        parent: newRootPageId,
                    })
                    .expect(200);

                const page1Info = await agent
                    .get(`/pages/${page1Id}`)
                    .expect(200);

                expect(page1Info.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            parent: newRootPageId,
                            id: page1Id,
                            name: 'page1',
                            uri: 'newpage/page1',
                            urifind: 'newpage/page1',
                        }),
                    })
                );

                const page2Info = await agent
                    .get(`/pages/${page2Id}`)
                    .expect(200);

                expect(page2Info.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            parent: page1Id,
                            id: page2Id,
                            name: 'page2',
                            uri: 'newpage/page1/page2',
                            urifind: 'newpage/page1/page2',
                        }),
                    })
                );

                const page3Info = await agent
                    .get(`/pages/${page3Id}`)
                    .expect(200);

                expect(page3Info.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            parent: page2Id,
                            id: page3Id,
                            name: 'page3',
                            uri: 'newpage/page1/page2/page3',
                            urifind: 'newpage/page1/page2/page3',
                        }),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test('PUT /pages/:id при измененении родителя на root должен меняться uri страницы и ее детей', async () => {
                const page1 = await agent
                    .post('/pages')
                    .send({
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'page1',
                    })
                    .expect(200);

                const page1Id = page1.body.id;

                const page2 = await agent
                    .post('/pages')
                    .send({
                        parent: page1Id,
                        parentUri: 'page1',
                        name: 'page2',
                    })
                    .expect(200);

                const page2Id = page2.body.id;

                const page3 = await agent
                    .post('/pages')
                    .send({
                        parent: page2Id,
                        parentUri: 'page1/page2',
                        name: 'page3',
                    })
                    .expect(200);

                const page3Id = page3.body.id;

                await agent
                    .put(`/pages/${page2Id}`)
                    .send({
                        parent: '00000000-0000-0000-0000-000000000000',
                    })
                    .expect(200);

                const page1Info = await agent
                    .get(`/pages/${page1Id}`)
                    .expect(200);

                expect(page1Info.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            parent: '00000000-0000-0000-0000-000000000000',
                            id: page1Id,
                            name: 'page1',
                            uri: 'page1',
                            urifind: 'page1',
                        }),
                    })
                );

                const page2Info = await agent
                    .get(`/pages/${page2Id}`)
                    .expect(200);

                expect(page2Info.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            parent: '00000000-0000-0000-0000-000000000000',
                            id: page2Id,
                            name: 'page2',
                            uri: 'page2',
                            urifind: 'page2',
                        }),
                    })
                );

                const page3Info = await agent
                    .get(`/pages/${page3Id}`)
                    .expect(200);

                expect(page3Info.body).toEqual(
                    expect.objectContaining({
                        page: expect.objectContaining({
                            parent: page2Id,
                            id: page3Id,
                            name: 'page3',
                            uri: 'page2/page3',
                            urifind: 'page2/page3',
                        }),
                    })
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'POST /pages/:id создание дочерних страниц',
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

                    const childPage1 = await agent
                        .post('/pages')
                        .send(childPageData1)
                        .expect(200);

                    const childPage2 = await agent
                        .post('/pages')
                        .send(childPageData2)
                        .expect(200);

                    const rootPageMeta = await agent
                        .get(`/pages/${id}`)
                        .expect(200);

                    expect(rootPageMeta.body.children).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                ...childPage1.body,
                            }),
                            expect.objectContaining({
                                ...childPage2.body,
                            }),
                        ])
                    );
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'GET /pages/:id/template/:template_id/params',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;

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
                        .send({ data: '[[ param1 ]]    [[ param2 ]]' })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            template: templatId,
                        })
                        .expect(200);

                    const params = await agent
                        .get(`/pages/${id}/template/${templatId}/params`)
                        .expect(200);

                    expect(params.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: expect.any(String),
                                value: '',
                                name: 'param1',
                                type: 'text',
                            }),
                            expect.objectContaining({
                                id: expect.any(String),
                                value: '',
                                name: 'param2',
                                type: 'text',
                            }),
                        ])
                    );
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'PUT /pages/:id/params/:paramId с некорректным value в body',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;

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
                        .send({ data: '[[ param1 ]] ' })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            template: templatId,
                        })
                        .expect(200);

                    const params = await agent
                        .get(`/pages/${id}/template/${templatId}/params`)
                        .expect(200);

                    const [param1] = params.body;

                    const response = await agent
                        .put(`/pages/${id}/params/${param1.id}`)
                        .send({
                            value: {},
                        })
                        .expect(400);

                    expect(response.body).toEqual(validationError);
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)('PUT /pages/:id/params/:paramId', async (page) => {
                const newPage = await agent
                    .post('/pages')
                    .send(page)
                    .expect(200);

                const { id } = newPage.body;

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
                    .send({ data: '[[ param1 ]]    [[ param2 ]]' })
                    .expect(200);

                await agent
                    .put(`/pages/${id}`)
                    .send({
                        template: templatId,
                    })
                    .expect(200);

                const params = await agent
                    .get(`/pages/${id}/template/${templatId}/params`)
                    .expect(200);

                const [param1, param2] = params.body;
                //
                await agent
                    .put(`/pages/${id}/params/${param1.id}`)
                    .send({
                        value: 'new1',
                    })
                    .expect(200);

                await agent.put(`/pages/${id}/params/${param2.id}`).send({
                    value: 'new2',
                });

                const newParams = await agent
                    .get(`/pages/${id}/template/${templatId}/params`)
                    .expect(200);

                expect(newParams.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            ...param1,
                            value: 'new1',
                        }),
                        expect.objectContaining({
                            ...param2,
                            value: 'new2',
                        }),
                    ])
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'PUT /pages/params/:paramId с некорректным value в body',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;

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
                        .send({ data: '[[ param1 ]] ' })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            template: templatId,
                        })
                        .expect(200);

                    const params = await agent
                        .get(`/pages/${id}/template/${templatId}/params`)
                        .expect(200);

                    const [param1] = params.body;

                    const response = await agent
                        .put(`/pages/params/${param1.id}`)
                        .send({
                            value: {},
                        })
                        .expect(400);

                    expect(response.body).toEqual(validationError);
                }
            );
            //----------------------------------------------------------------------------------------
            test.each(pages)('PUT /pages/params/:paramId', async (page) => {
                const {
                    body: { id },
                } = await agent.post('/pages').send(page).expect(200);

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
                    .put(`/templates/${templateId}`)
                    .send({ data: '[[ param1 ]]    [[ param2 ]]' })
                    .expect(200);
                await agent
                    .put(`/pages/${id}`)
                    .send({ template: templateId })
                    .expect(200);

                const params = await agent
                    .get(`/pages/${id}/template/${templateId}/params`)
                    .expect(200);

                const [param1, param2] = params.body;
                const firstParam =
                    param1.name === 'param1' ? param1.id : param2.id;
                const secondParam =
                    param2.name === 'param2' ? param2.id : param1.id;

                await agent
                    .put(`/pages/${id}/params/${firstParam}`)
                    .send({ value: 'new1' })
                    .expect(200);
                await agent
                    .put(`/pages/${id}/params/${secondParam}`)
                    .send({ value: 'new2' })
                    .expect(200);

                const newParams = await agent
                    .get(`/pages/${id}/template/${templateId}/params`)
                    .expect(200);

                expect(newParams.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(String),
                            value: 'new1',
                            name: 'param1',
                            type: 'text',
                        }),
                    ])
                );

                expect(newParams.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(String),
                            value: 'new2',
                            name: 'param2',
                            type: 'text',
                        }),
                    ])
                );
            });
            //----------------------------------------------------------------------------------------
            test.each(pages)(
                'Проверка восстановления параметров и их значений при смене шаблона страницы',
                async (page) => {
                    const newPage = await agent
                        .post('/pages')
                        .send(page)
                        .expect(200);

                    const { id } = newPage.body;

                    const newTemplate1 = await agent
                        .post('/templates')
                        .send({
                            name: 'template1',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const newTemplate2 = await agent
                        .post('/templates')
                        .send({
                            name: 'template2',
                            parent: '00000000-0000-0000-0000-000000000000',
                        })
                        .expect(200);

                    const templatId1 = newTemplate1.body.id;
                    const templatId2 = newTemplate2.body.id;

                    await agent
                        .put(`/templates/${templatId1}`)
                        .send({ data: '[[ param1 ]]    [[ param2 ]]' })
                        .expect(200);

                    await agent
                        .put(`/templates/${templatId2}`)
                        .send({ data: '[[ param1 ]]    [[ param2 ]]' })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            template: templatId1,
                        })
                        .expect(200);

                    const params = await agent
                        .get(`/pages/${id}/template/${templatId1}/params`)
                        .expect(200);

                    const [param1, param2] = params.body;
                    const firstParam =
                        param1.name === 'param1' ? param1.id : param2.id;
                    const secondParam =
                        param2.name === 'param2' ? param2.id : param1.id;

                    await agent
                        .put(`/pages/${id}/params/${firstParam}`)
                        .send({
                            value: 'new1-fromtemplate1',
                        })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}/params/${secondParam}`)
                        .send({
                            value: 'new2-fromtemplate1',
                        })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            template: templatId2,
                        })
                        .expect(200);

                    await agent
                        .put(`/pages/${id}`)
                        .send({
                            template: templatId1,
                        })
                        .expect(200);
                    //-----
                    const newParams = await agent
                        .get(`/pages/${id}/template/${templatId1}/params`)
                        .expect(200);

                    expect(newParams.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: firstParam,
                                value: 'new1-fromtemplate1',
                                name: 'param1',
                                type: 'text',
                            }),
                        ])
                    );

                    expect(newParams.body).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: secondParam,
                                value: 'new2-fromtemplate1',
                                name: 'param2',
                                type: 'text',
                            }),
                        ])
                    );
                }
            );
            //----------------------------------------------------------------------------------------
            //----------------------------------------------------------------------------------------
            describe('Просмотр удаленных страниц', () => {
                test('GET /pages/:id/meta (получение мета данных страницы)', async () => {
                    const pageData = {
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'page1',
                    };

                    const newPage = await agent
                        .post('/pages')
                        .send(pageData)
                        .expect(200);

                    const { id } = newPage.body;

                    await agent.delete(`/pages/${id}`).expect(200);

                    await agent.get(`/pages/${id}`).expect(400);

                    const filter = JSON.stringify({ where: { markdel: '10' } });
                    const response = await agent
                        .get(`/pages/${id}/?filter=${filter}`)
                        .expect(200);

                    expect(response.body).toEqual(
                        expect.objectContaining({
                            page: expect.objectContaining({
                                id,
                            }),
                        })
                    );
                });
                //----------------------------------------------------------------------------------------
                test('GET /pages/:id/template/:template_id/params (получение параметров страницы по ее шаблону)', async () => {
                    const pageData = {
                        parent: '00000000-0000-0000-0000-000000000000',
                        parentUri: '',
                        name: 'page1',
                    };

                    const newPage = await agent
                        .post('/pages')
                        .send(pageData)
                        .expect(200);

                    const { id } = newPage.body;

                    await agent.delete(`/pages/${id}`).expect(200);

                    await agent
                        .get(
                            `/pages/${id}/template/00000000-0000-0000-0000-000000000000/params`
                        )
                        .expect(400);

                    const filter = JSON.stringify({ where: { markdel: '10' } });
                    await agent
                        .get(
                            `/pages/${id}/template/00000000-0000-0000-0000-000000000000/params/?filter=${filter}`
                        )
                        .expect(200, []);
                });
                //----------------------------------------------------------------------------------------
                //----------------------------------------------------------------------------------------
            });
            test.each(pages)(
                'GET /pages/public/:id/pname/:paramName',
                async (page) => {
                    const {
                        body: { id },
                    } = await agent.post('/pages').send(page).expect(200);

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
                        .put(`/templates/${templateId}`)
                        .send({ data: '[[ param1 ]]    [[ param2 ]]' })
                        .expect(200);
                    await agent
                        .put(`/pages/${id}`)
                        .send({ template: templateId })
                        .expect(200);

                    const param1 = await agent
                        .get(`/pages/public/${id}/pname/param1`)
                        .expect(200);
                    expect(param1.body).toEqual(
                        expect.objectContaining({
                            name: 'param1',
                            value: expect.any(String),
                        })
                    );

                    const param2 = await agent
                        .get(`/pages/public/${id}/pname/param2`)
                        .expect(200);
                    expect(param2.body).toEqual(
                        expect.objectContaining({
                            name: 'param2',
                            value: expect.any(String),
                        })
                    );
                }
            );
            test.each(pages)('GET /pages', async (page) => {
                const response = await agent.get('/pages').expect(200);

                expect(response.body).toEqual(expect.any(Array));
            });
        });
    });

    describe('Получение дерева страниц', () => {
        let agent;

        // Авторизуемся как администратор
        beforeAll(async () => {
            const {
                getAuthedAgent,
            } = require('../../../test-cms/src/getAuthedAgent');
            const authedData = await getAuthedAgent(httpAgent);
            agent = authedData.agent;
        });

        afterAll(async () => {
            await sequelize.close();
            await new Promise((resolve) => setTimeout(() => resolve(), 500));
        });

        test('Проверка тела ответа', async () => {
            await agent
                .get('/pages/00000000-0000-0000-0000-000000000000/v2')
                .expect(200);
        });

        test('Получение дерева родительского элемента для несуществующего родителя', async () => {
            await agent
                .get('/pages/00000000-0000-0000-0000-000000000001/v2')
                .expect(400);
        });
    });
});
