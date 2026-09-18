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
        statusDel: 400,
        status: 400,
    },
    {
        id: '00000000-0000-0000-0000-000000000000',
        expected: { message: 'Такой роли не существует', errors: [] },
        expectedDel: { result: true },
        statusDel: 200,
        status: 400,
    },
    {
        id: '860e9ba0-8441-4c53-8682-12453cc90c8c',
        expected: { message: 'Такой роли не существует', errors: [] },
        expectedDel: { result: true },
        statusDel: 200,
        status: 400,
    },
];

const defaultRole = {
    id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
    name: 'SU',
    color: '',
    details: '',
};

const defaultRoleRules = [
    {
        id: '90499885-ae60-440b-a59f-cfd3958110cd',
        name: 'AllRead',
        details: 'AllRead',
    },
    {
        id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
        name: 'AllWrite',
        details: 'AllWrite',
    },
    {
        id: 'ef75e99b-51dd-47a5-914d-9b6d1df3cc20',
        name: 'Adminpanel',
        details: 'Доступ к панели администратора',
    },
    {
        id: '396c8ea0-7181-45e5-bb55-90916cab5cd4',
        name: 'UserManager',
        details: 'Доступ к управлению пользователями',
    },
    {
        id: '299dcce3-9f44-4640-974c-f625a9493929',
        name: 'FilesManager',
        details: 'Доступ к управлению файлами',
    },
    {
        id: 'eb4326bf-92cc-46c8-9ce8-96564b0eda46',
        name: 'Profile',
        details: 'Доступ к собственному профайлу пользователями',
    },
    {
        id: '282a94a9-8976-4823-81e8-9eee5e0ad4c5',
        name: 'News',
        details: 'Доступ к управлению новостями',
    },
];

const defaultRoleUsers = [
    {
        id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
        login: 'su',
        status: 0,
        markdel: 0,
    },
];

const roles = [
    { name: 'test1', color: 'red', details: '', expectDel: { result: true } },
    { name: 'test2', color: 'red', details: '', expectDel: { result: true } },
];

const newRuleIds = [
    'ef75e99b-51dd-47a5-914d-9b6d1df3cc20',
    '299dcce3-9f44-4640-974c-f625a9493929',
];
const newRulesData = [
    {
        id: 'ef75e99b-51dd-47a5-914d-9b6d1df3cc20',
        name: 'Adminpanel',
        details: 'Доступ к панели администратора',
    },
    {
        id: '299dcce3-9f44-4640-974c-f625a9493929',
        name: 'FilesManager',
        details: 'Доступ к управлению файлами',
    },
];

const invalidNames = [{}, [], '', 5, null, undefined];

module.exports = {
    ids,
    defaultRole,
    roles,
    defaultRoleRules,
    defaultRoleUsers,
    newRuleIds,
    newRulesData,
    invalidNames,
};
