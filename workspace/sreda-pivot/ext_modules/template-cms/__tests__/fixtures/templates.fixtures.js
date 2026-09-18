const msgErrorTemplateExist = 'Такого шаблона не существует';
const errorTemplateExist = { message: msgErrorTemplateExist, errors: [], stack: '', original: {} };
const msgErrorValidation = 'Ошибка при валидации';
const msgErrorParamExist = 'Такого параметра шаблона не существует';
const msgErrorTypeExist = 'Такого типа параметра шаблона не существует';
const msgErrorNameInvalid = 'Такое имя шаблона уже существует';

const ids = [
    {
        id: 'sdsdsd',
        expected: {
            message: msgErrorValidation,
            errors: expect.any(Array),
            stack: '',
            original: {},
        },
        expectedDel: {
            message: msgErrorValidation,
            errors: expect.any(Array),
            stack: '',
            original: {},
        },
        expectedParam: {
            message: msgErrorValidation,
            errors: expect.any(Array),
            stack: '',
            original: {},
        },
        expectedParamType: {
            message: msgErrorValidation,
            errors: expect.any(Array),
            stack: '',
            original: {},
        },
        statusDel: 400,
        status: 400,
    },
    {
        id: '860e9ba0-8441-4c53-8682-12453cc90c8c',
        expected: { message: msgErrorTemplateExist, errors: [], stack: '', original: {} },
        expectedParam: {
            message: msgErrorParamExist,
            errors: expect.any(Array),
            stack: '',
            original: {},
        },
        expectedParamType: {
            message: msgErrorTypeExist,
            errors: expect.any(Array),
            stack: '',
            original: {},
        },
        expectedDel: { result: true },
        statusDel: 200,
        status: 400,
    },
];

const listTypes = [
    {
        id: 'f9a427f9-956c-4367-a0bd-719fa1f54ba1',
        type: 'text',
        value: 'Текст',
    },
    {
        id: '7b3fb89b-b402-438a-94e5-3745c75dea72',
        type: 'editorjs',
        value: 'EditorJS',
    },
    {
        id: '55a33e2d-cb18-4486-80d7-9b7b25909031',
        type: 'json',
        value: 'Json',
    },
    {
        id: '62cd60f0-0fa3-4ada-9650-2ac624fdc090',
        type: 'filelink',
        value: 'Ссылка на файл',
    },
    {
        id: '2fc57216-2d3b-44f9-92ab-503e6d851670',
        type: 'javascript',
        value: 'Выражение на javascript',
    },
    {
        id: 'c8aa895a-86d7-46bd-8460-057d13d58310',
        type: 'pages',
        value: 'Ссылка на страницу',
    },
    {
        id: '7b11ddef-849b-49f9-8c59-c5969580a2f6',
        type: 'html',
        value: 'Текст HTML',
    },
    {
        id: 'b928bced-e491-4060-8454-129a0e3e3878',
        type: 'system',
        value: 'Системный параметр',
    },
];

const invalidValues = [{}, [], 5, null];

const templateDatas = [
    {
        data: '[[ param1 ]] dfdfd 343434 [[ param2 ]] dsf;dskfjdsklfjdslkj [[ param3 ]] [[ param4 ]]',
        params: ['param1', 'param2', 'param3', 'param4'],
    },
    {
        data: '[[ param2 ]]',
        params: ['param2'],
    },
];

const newParamsType = [
    '62cd60f0-0fa3-4ada-9650-2ac624fdc090', // ссылка на файл
    '2fc57216-2d3b-44f9-92ab-503e6d851670', // выражение на javascript
];

const TEMPLATE_ROOT_ID = '00000000-0000-0000-0000-000000000000';

module.exports = {
    ids,
    listTypes,
    invalidValues,
    templateDatas,
    newParamsType,
    errorTemplateExist,
    msgErrorValidation,
    msgErrorTemplateExist,
    msgErrorNameInvalid,
    TEMPLATE_ROOT_ID,
};
