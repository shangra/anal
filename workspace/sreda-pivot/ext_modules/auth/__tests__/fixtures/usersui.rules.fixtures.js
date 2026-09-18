const {
    ALL_USER_RULES_ARRAY,
} = require('../../../test-cms/fixtures/default.fixtures');

const ids = [
    {
        id: 'sdsdsd',
        expected: {
            message: 'Ошибка при валидации',
            errors: expect.any(Array),
        },
        status: 400,
    },
    {
        id: '00000000-0000-0000-0000-000000000000',
        expected: { message: 'Такого права не существует', errors: [] },
        status: 400,
    },
    {
        id: '074bd055-409b-4ad3-b73f-04620511c46f',
        expected: { message: 'Такого права не существует', errors: [] },
        status: 400,
    },
];

const rules = [
    {
        id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
        name: 'AllWrite',
        details: 'AllWrite',
        expectDefault: {
            users: [
                {
                    id: '64a81949-4eae-45a8-9e21-cf1d13fd180a',
                    login: 'testuser',
                    status: 0,
                    markdel: 0,
                },
            ],
            roles: [
                {
                    id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                    code: 1,
                    markdel: 0,
                    name: 'SU',
                    color: '',
                    details: '',
                },
            ],
        },
    },
    {
        id: 'ef75e99b-51dd-47a5-914d-9b6d1df3cc20',
        name: 'Adminpanel',
        details: 'Доступ к панели администратора',
        expectDefault: {
            users: [
                {
                    id: '64a81949-4eae-45a8-9e21-cf1d13fd180a',
                    login: 'testuser',
                    status: 0,
                    markdel: 0,
                },
            ],
            roles: [
                {
                    id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                    name: 'SU',
                    color: '',
                    details: '',
                    code: 1,
                    markdel: 0,
                },
            ],
        },
    },
    {
        id: 'eb4326bf-92cc-46c8-9ce8-96564b0eda46',
        name: 'Profile',
        details: 'Доступ к собственному профайлу пользователями',
        expectDefault: {
            users: [
                {
                    id: '64a81949-4eae-45a8-9e21-cf1d13fd180a',
                    login: 'testuser',
                    status: 0,
                    markdel: 0,
                },
            ],
            roles: [
                {
                    id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                    name: 'SU',
                    markdel: 0,
                    color: '',
                    details: '',
                    code: 1,
                },
            ],
        },
    },
];

const otherServicesRules = [
    'CodeWrite',
    'CodeManager',
    'CodeRead',
    'ContentLoaderGOSB',
    'ProcessesManager',
    'ProcessesRead',
    'ProcessesWrite',
];

const allRules = ALL_USER_RULES_ARRAY.filter(
    (rule) => !otherServicesRules.includes(rule.name)
).map(({ id, name, details }) => ({
    id,
    name,
    details,
}));

const user = {
    login: 'testuser2',
    password: '123',
    name: 'alex2',
    email: 'user2@mail.ru',
    details: 'test2',
    avatar: '',
};

module.exports = { ids, rules, allRules, user };
