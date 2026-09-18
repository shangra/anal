const ids = [
    {
        id: 'sdsdsd',
        expected: {
            message: 'Ошибка при валидации',
            errors: expect.any(Array),
        },
        expectedDel: {
            message: 'Ошибка при валидации',
            errors: expect.any(Array),
        },
        expectedGet: {
            message: 'Ошибка при валидации',
            errors: expect.any(Array),
        },
        expectedGetParam: {
            message: 'Ошибка при валидации',
            errors: expect.any(Array),
        },
        statusDel: 400,
        statusGet: 400,
        status: 400,
    },
    {
        id: '860e9ba0-8441-4c53-8682-12453cc90c8c',
        expected: { message: 'Такой страницы не существует', errors: [] },
        expectedGet: { message: 'Такой страницы не существует', errors: [] },
        expectedGetParam: {
            message: 'Такого параметра шаблона не существует',
            errors: [],
        },
        expectedDel: { result: true },
        statusDel: 200,
        statusGet: 400,
        status: 400,
    },
];

const rootPage = {
    id: '',
    name: '',
    uri: '',
    parent: '',
    active: '',
    link: '',
    template: '',
    content_type: '',
    description: '',
};
const expectUriExist = {
    message: 'Страница с таким uri уже существует',
    errors: [],
    stack: '',
    original: {},
};
const expectPageNotFound = {
    message: 'Такой страницы не существует',
    errors: [],
    stack: '',
    original: {},
};
const validationError = {
    message: 'Ошибка при валидации',
    errors: expect.any(Array),
    stack: '',
    original: {},
};

const pages = [
    {
        parent: '00000000-0000-0000-0000-000000000000',
        parentUri: '',
        name: 'page1',
        content_type: 'application/json',
    },
    {
        parent: '00000000-0000-0000-0000-000000000000',
        parentUri: '',
        name: 'page2',
        content_type: 'text/html',
    },
];

const pageAttributes = [
    { attr: 'template' },
    { attr: 'name' },
    { attr: 'description' },
    { attr: 'uri' },
    { attr: 'content_type' },
    { attr: 'active' },
    { attr: 'link' },
    { attr: 'parent' },
];

const newPageData = {
    parent: '00000000-0000-0000-0000-000000000000',
    name: 'newname',
    description: 'newdescr',
    uri: 'newname',
    active: 1,
    content_type: 'text/html',
    template: '00000000-0000-0000-0000-000000000000',
    link: '00000000-0000-0000-0000-000000000000',
};

const paramTypeJavascript = '2fc57216-2d3b-44f9-92ab-503e6d851670';
const messagePageNotFound = 'Страница не найдена';
const PAGE_ROOT_ID = '00000000-0000-0000-0000-000000000000';

const templateParams = [
    {
        id: '11926726-1268-4fa7-90eb-087aff84a653',
        value: '',
        name: 'param1',
        description: '',
        type: 'text',
    },
    {
        id: 'dfd74ec3-3963-451b-a661-81d8ab1a57ce',
        value: '',
        name: 'param2',
        description: '',
        type: 'text',
    },
];

const baseRenderResult = expect.objectContaining({
    form: expect.any(String),
    script: { varsPrimitive: {}, classes: {}, functions: {}, vars: {} },
});

const pageParams = [
    {
        name: 'param',
        paramtype: 'javascript',
        value: 'console.log("asdfg")',
        result: {},
    },
    {
        name: 'param',
        paramtype: 'json',
        value: '{"Hello": "world"}',
        result: {},
    },
    {
        name: 'param',
        paramtype: 'html',
        value: '<h1 style="color: rgb(123,70,34); background: red">Hello world</h1>',
        result: {},
    },
    // { name: 'param', paramtype: 'pages', value: 'c0dfb6ba-424b-457b-ae50-9d7d13c332c6', result: {} },
    {
        name: 'param',
        paramtype: 'filelink',
        value: 'f9a427f9-956c-4367-a0bd-719fa1f54ba1',
        result: {},
    },
    {
        name: 'param',
        paramtype: 'js',
        value: 'console.log("asdfg")',
        result: {},
    },
    {
        name: 'param',
        paramtype: 'system',
        value: '"{"parent":"1d9d06a8-ea67-42a2-88b3-fa73300d931f","template":"a55d0c71-8441-4215-b544-553ac558ca33","paramName":"cubeId"}"',
        result: {},
    },
    {
        name: 'param',
        paramtype: 'editorjs',
        value: '{"time":1720105494562,"blocks":[{"id":"null","type":"customParagraph","data":{"text":"Тест чата 04.07.2024"},"tunes":{"alignmentTune":{"alignment":"left"}}}],"version":"2.23.2"}',
        result: {},
    },
];

module.exports = {
    ids,
    rootPage,
    pages,
    expectUriExist,
    expectPageNotFound,
    validationError,
    pageAttributes,
    newPageData,
    paramTypeJavascript,
    messagePageNotFound,
    PAGE_ROOT_ID,
    templateParams,
    pageParams,
};
