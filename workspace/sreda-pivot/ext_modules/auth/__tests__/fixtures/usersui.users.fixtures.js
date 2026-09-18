const validationError = {
    message: 'Ошибка при валидации',
    errors: expect.any(Array),
    stack: expect.any(String),
    original: {},
};

const users = [
    {
        login: 'testuser1',
        password: '123',
        name: 'alex1',
        email: 'user1@mail.ru',
        details: 'test1',
        avatar: '',
        errorValidate: validationError,
        newRule: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
        defaultRules: {
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                id: '90499885-ae60-440b-a59f-cfd3958110cd',
                name: 'AllRead',
                details: 'AllRead',
                owned: true,
                role: [],
            },
        },
        extendedRules: {
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                id: '90499885-ae60-440b-a59f-cfd3958110cd',
                name: 'AllRead',
                details: 'AllRead',
                owned: true,
                role: [],
            },
            '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6': {
                id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                name: 'AllWrite',
                details: 'AllWrite',
                owned: true,
                role: [],
            },
        },
        defaultRoles: [],
        newRole: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
        extendedRoles: [
            {
                color: '',
                details: '',
                id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                name: 'SU',
                code: 1,
            },
        ],
        extendedRulesByRoles: {
            '07ed8360-e059-4e50-9fcd-4e214e291d5a': {
                id: '07ed8360-e059-4e50-9fcd-4e214e291d5a',
                name: 'TemplatesWrite',
                details: 'Редактирование шаблонов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6': {
                id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                name: 'AllWrite',
                details: 'AllWrite',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '12726ccb-ae56-4a18-b6b0-aef995ec9a5b': {
                id: '12726ccb-ae56-4a18-b6b0-aef995ec9a5b',
                name: 'WidgetsAccessRead',
                details: 'Просмотр доступа к виджетам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '12e32c9d-6e4f-4d57-ae22-5cddaabf343c': {
                id: '12e32c9d-6e4f-4d57-ae22-5cddaabf343c',
                name: 'Administrator',
                details: 'Администратор',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '17149f4a-0b45-4be3-9301-eccb697e77e0': {
                id: '17149f4a-0b45-4be3-9301-eccb697e77e0',
                name: 'PagesAccessRead',
                details: 'Просмотр доступа к страницам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '178741de-ba31-48a0-b2ee-cca297a5c763': {
                id: '178741de-ba31-48a0-b2ee-cca297a5c763',
                name: 'UsersRead',
                details: 'Чтение пользователей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '1bff8bf4-cffd-464f-a650-6112b89da4b6': {
                id: '1bff8bf4-cffd-464f-a650-6112b89da4b6',
                name: 'RolesWrite',
                details: 'Редактирование ролей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '1c313772-27bc-4404-bbab-d3e9bae83657': {
                id: '1c313772-27bc-4404-bbab-d3e9bae83657',
                name: 'RolesRead',
                details: 'Чтение ролей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '220ba56c-f6fd-422e-9352-2040eb0dc804': {
                id: '220ba56c-f6fd-422e-9352-2040eb0dc804',
                name: 'RulesRead',
                details: 'Чтение прав',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '282a94a9-8976-4823-81e8-9eee5e0ad4c5': {
                id: '282a94a9-8976-4823-81e8-9eee5e0ad4c5',
                name: 'News',
                details: 'Доступ к управлению новостями',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '299dcce3-9f44-4640-974c-f625a9493929': {
                id: '299dcce3-9f44-4640-974c-f625a9493929',
                name: 'FilesManager',
                details: 'Доступ к управлению файлами',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '2a451ea8-1f90-4489-9aae-090b4fe4f977': {
                id: '2a451ea8-1f90-4489-9aae-090b4fe4f977',
                name: 'UpdateSelfPages',
                details: 'Доступ к записи только к своих страниц',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '2fcb45e6-f1b3-47ca-9d26-af1b99abc113': {
                id: '2fcb45e6-f1b3-47ca-9d26-af1b99abc113',
                name: 'PagesWrite',
                details: 'Редактирование страниц',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '323f06f2-60d2-4d1a-b812-a62b9d936c6f': {
                id: '323f06f2-60d2-4d1a-b812-a62b9d936c6f',
                name: 'TemplatesRead',
                details: 'Чтение шаблонов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '3241db2c-cb73-4ec7-b523-d3e81e1605d2': {
                id: '3241db2c-cb73-4ec7-b523-d3e81e1605d2',
                name: 'PagesRead',
                details: 'Чтение страниц',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '396c8ea0-7181-45e5-bb55-90916cab5cd4': {
                id: '396c8ea0-7181-45e5-bb55-90916cab5cd4',
                name: 'UserManager',
                details: 'Доступ к управлению пользователями',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '4df82939-0cd0-447e-9d37-1efd6fab37f0': {
                id: '4df82939-0cd0-447e-9d37-1efd6fab37f0',
                name: 'FilesWrite',
                details: 'Редактирование файлов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '59438564-7d1a-4d67-98ee-c7dabaaadaf0': {
                id: '59438564-7d1a-4d67-98ee-c7dabaaadaf0',
                name: 'FilesAccessRead',
                details: 'Просмотр доступа к файлам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '6af1b8c5-e905-4794-b6d5-e7983df131d7': {
                id: '6af1b8c5-e905-4794-b6d5-e7983df131d7',
                name: 'UpdateSelfWidgets',
                details: 'Доступ к записи только своих виджетов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '839e656e-f138-4eb5-81a0-29076e791e92': {
                id: '839e656e-f138-4eb5-81a0-29076e791e92',
                name: 'WidgetsAccessWrite',
                details: 'Редактирование доступа к виджетам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                id: '90499885-ae60-440b-a59f-cfd3958110cd',
                name: 'AllRead',
                details: 'AllRead',
                owned: true,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'aabdb7e4-c595-49c4-9867-4526d070ff85': {
                id: 'aabdb7e4-c595-49c4-9867-4526d070ff85',
                name: 'GroupsRead',
                details: 'Чтение групп',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'b6df04e5-52b5-479d-a339-0462b32a9e98': {
                id: 'b6df04e5-52b5-479d-a339-0462b32a9e98',
                name: 'WidgetsWrite',
                details: 'Редактирование виджетов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'd4ae2a9f-db1a-48f9-9348-961d6b5d3c8d': {
                id: 'd4ae2a9f-db1a-48f9-9348-961d6b5d3c8d',
                name: 'FilesAccessWrite',
                details: 'Редактирование доступа к файлам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'd5193eee-7426-4ce9-87c3-4268cc88a274': {
                id: 'd5193eee-7426-4ce9-87c3-4268cc88a274',
                name: 'UsersWrite',
                details: 'Редактирование пользователей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'd88055db-5693-4960-aa88-7d1dec72d2ed': {
                id: 'd88055db-5693-4960-aa88-7d1dec72d2ed',
                name: 'FilesRead',
                details: 'Чтение файлов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'eb32c0e0-a57e-4a28-bca6-89379cff1d45': {
                id: 'eb32c0e0-a57e-4a28-bca6-89379cff1d45',
                name: 'GroupsWrite',
                details: 'Редактирование груп',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'eb4326bf-92cc-46c8-9ce8-96564b0eda46': {
                id: 'eb4326bf-92cc-46c8-9ce8-96564b0eda46',
                name: 'Profile',
                details: 'Доступ к собственному профайлу пользователями',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'ecfe336d-f243-4b73-aa74-01688d0c5d45': {
                id: 'ecfe336d-f243-4b73-aa74-01688d0c5d45',
                name: 'PagesAccessWrite',
                details: 'Редактирование доступа к страницам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'ef75e99b-51dd-47a5-914d-9b6d1df3cc20': {
                id: 'ef75e99b-51dd-47a5-914d-9b6d1df3cc20',
                name: 'Adminpanel',
                details: 'Доступ к панели администратора',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'fdf02195-d597-42d8-86da-8b4343cd6bfc': {
                id: 'fdf02195-d597-42d8-86da-8b4343cd6bfc',
                name: 'RulesWrite',
                details: 'Редактирование прав',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'fe00848f-e08a-447a-b70f-4e60f481b5b3': {
                id: 'fe00848f-e08a-447a-b70f-4e60f481b5b3',
                name: 'WidgetsRead',
                details: 'Чтение виджетов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
        },
    },
    {
        login: 'testuser2',
        password: '123',
        name: 'alex2',
        email: 'user2@mail.ru',
        details: 'test2',
        avatar: '',
        errorValidate: validationError,
        newRule: '396c8ea0-7181-45e5-bb55-90916cab5cd4',
        defaultRules: {
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                id: '90499885-ae60-440b-a59f-cfd3958110cd',
                name: 'AllRead',
                details: 'AllRead',
                owned: true,
                role: [],
            },
        },
        extendedRules: {
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                id: '90499885-ae60-440b-a59f-cfd3958110cd',
                name: 'AllRead',
                details: 'AllRead',
                owned: true,
                role: [],
            },
            '396c8ea0-7181-45e5-bb55-90916cab5cd4': {
                id: '396c8ea0-7181-45e5-bb55-90916cab5cd4',
                name: 'UserManager',
                details: 'Доступ к управлению пользователями',
                owned: true,
                role: [],
            },
        },
        defaultRoles: [],
        newRole: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
        extendedRoles: [
            {
                color: '',
                details: '',
                id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                name: 'SU',
                code: 1,
            },
        ],
        extendedRulesByRoles: {
            '07ed8360-e059-4e50-9fcd-4e214e291d5a': {
                id: '07ed8360-e059-4e50-9fcd-4e214e291d5a',
                name: 'TemplatesWrite',
                details: 'Редактирование шаблонов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6': {
                id: '09d683ab-8ff0-43a9-ba16-2c68bf3bc9c6',
                name: 'AllWrite',
                details: 'AllWrite',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '12726ccb-ae56-4a18-b6b0-aef995ec9a5b': {
                id: '12726ccb-ae56-4a18-b6b0-aef995ec9a5b',
                name: 'WidgetsAccessRead',
                details: 'Просмотр доступа к виджетам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '12e32c9d-6e4f-4d57-ae22-5cddaabf343c': {
                id: '12e32c9d-6e4f-4d57-ae22-5cddaabf343c',
                name: 'Administrator',
                details: 'Администратор',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '17149f4a-0b45-4be3-9301-eccb697e77e0': {
                id: '17149f4a-0b45-4be3-9301-eccb697e77e0',
                name: 'PagesAccessRead',
                details: 'Просмотр доступа к страницам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '178741de-ba31-48a0-b2ee-cca297a5c763': {
                id: '178741de-ba31-48a0-b2ee-cca297a5c763',
                name: 'UsersRead',
                details: 'Чтение пользователей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '1bff8bf4-cffd-464f-a650-6112b89da4b6': {
                id: '1bff8bf4-cffd-464f-a650-6112b89da4b6',
                name: 'RolesWrite',
                details: 'Редактирование ролей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '1c313772-27bc-4404-bbab-d3e9bae83657': {
                id: '1c313772-27bc-4404-bbab-d3e9bae83657',
                name: 'RolesRead',
                details: 'Чтение ролей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '220ba56c-f6fd-422e-9352-2040eb0dc804': {
                id: '220ba56c-f6fd-422e-9352-2040eb0dc804',
                name: 'RulesRead',
                details: 'Чтение прав',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '282a94a9-8976-4823-81e8-9eee5e0ad4c5': {
                id: '282a94a9-8976-4823-81e8-9eee5e0ad4c5',
                name: 'News',
                details: 'Доступ к управлению новостями',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '299dcce3-9f44-4640-974c-f625a9493929': {
                id: '299dcce3-9f44-4640-974c-f625a9493929',
                name: 'FilesManager',
                details: 'Доступ к управлению файлами',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '2a451ea8-1f90-4489-9aae-090b4fe4f977': {
                id: '2a451ea8-1f90-4489-9aae-090b4fe4f977',
                name: 'UpdateSelfPages',
                details: 'Доступ к записи только к своих страниц',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '2fcb45e6-f1b3-47ca-9d26-af1b99abc113': {
                id: '2fcb45e6-f1b3-47ca-9d26-af1b99abc113',
                name: 'PagesWrite',
                details: 'Редактирование страниц',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '323f06f2-60d2-4d1a-b812-a62b9d936c6f': {
                id: '323f06f2-60d2-4d1a-b812-a62b9d936c6f',
                name: 'TemplatesRead',
                details: 'Чтение шаблонов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '3241db2c-cb73-4ec7-b523-d3e81e1605d2': {
                id: '3241db2c-cb73-4ec7-b523-d3e81e1605d2',
                name: 'PagesRead',
                details: 'Чтение страниц',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '396c8ea0-7181-45e5-bb55-90916cab5cd4': {
                id: '396c8ea0-7181-45e5-bb55-90916cab5cd4',
                name: 'UserManager',
                details: 'Доступ к управлению пользователями',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '4df82939-0cd0-447e-9d37-1efd6fab37f0': {
                id: '4df82939-0cd0-447e-9d37-1efd6fab37f0',
                name: 'FilesWrite',
                details: 'Редактирование файлов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '59438564-7d1a-4d67-98ee-c7dabaaadaf0': {
                id: '59438564-7d1a-4d67-98ee-c7dabaaadaf0',
                name: 'FilesAccessRead',
                details: 'Просмотр доступа к файлам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '6af1b8c5-e905-4794-b6d5-e7983df131d7': {
                id: '6af1b8c5-e905-4794-b6d5-e7983df131d7',
                name: 'UpdateSelfWidgets',
                details: 'Доступ к записи только своих виджетов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '839e656e-f138-4eb5-81a0-29076e791e92': {
                id: '839e656e-f138-4eb5-81a0-29076e791e92',
                name: 'WidgetsAccessWrite',
                details: 'Редактирование доступа к виджетам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                id: '90499885-ae60-440b-a59f-cfd3958110cd',
                name: 'AllRead',
                details: 'AllRead',
                owned: true,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'aabdb7e4-c595-49c4-9867-4526d070ff85': {
                id: 'aabdb7e4-c595-49c4-9867-4526d070ff85',
                name: 'GroupsRead',
                details: 'Чтение групп',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'b6df04e5-52b5-479d-a339-0462b32a9e98': {
                id: 'b6df04e5-52b5-479d-a339-0462b32a9e98',
                name: 'WidgetsWrite',
                details: 'Редактирование виджетов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'd4ae2a9f-db1a-48f9-9348-961d6b5d3c8d': {
                id: 'd4ae2a9f-db1a-48f9-9348-961d6b5d3c8d',
                name: 'FilesAccessWrite',
                details: 'Редактирование доступа к файлам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'd5193eee-7426-4ce9-87c3-4268cc88a274': {
                id: 'd5193eee-7426-4ce9-87c3-4268cc88a274',
                name: 'UsersWrite',
                details: 'Редактирование пользователей',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'd88055db-5693-4960-aa88-7d1dec72d2ed': {
                id: 'd88055db-5693-4960-aa88-7d1dec72d2ed',
                name: 'FilesRead',
                details: 'Чтение файлов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'eb32c0e0-a57e-4a28-bca6-89379cff1d45': {
                id: 'eb32c0e0-a57e-4a28-bca6-89379cff1d45',
                name: 'GroupsWrite',
                details: 'Редактирование груп',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'eb4326bf-92cc-46c8-9ce8-96564b0eda46': {
                id: 'eb4326bf-92cc-46c8-9ce8-96564b0eda46',
                name: 'Profile',
                details: 'Доступ к собственному профайлу пользователями',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'ecfe336d-f243-4b73-aa74-01688d0c5d45': {
                id: 'ecfe336d-f243-4b73-aa74-01688d0c5d45',
                name: 'PagesAccessWrite',
                details: 'Редактирование доступа к страницам',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'ef75e99b-51dd-47a5-914d-9b6d1df3cc20': {
                id: 'ef75e99b-51dd-47a5-914d-9b6d1df3cc20',
                name: 'Adminpanel',
                details: 'Доступ к панели администратора',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'fdf02195-d597-42d8-86da-8b4343cd6bfc': {
                id: 'fdf02195-d597-42d8-86da-8b4343cd6bfc',
                name: 'RulesWrite',
                details: 'Редактирование прав',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
            'fe00848f-e08a-447a-b70f-4e60f481b5b3': {
                id: 'fe00848f-e08a-447a-b70f-4e60f481b5b3',
                name: 'WidgetsRead',
                details: 'Чтение виджетов',
                owned: false,
                role: [
                    {
                        id: '43106426-ffe3-4e1d-b623-6d210c6be0ff',
                        name: 'SU',
                        color: '',
                        details: '',
                    },
                ],
            },
        },
    },
];

const ids = [
    {
        id: 'sdsdsd',
        expectBad: validationError,
        expectDel: validationError,
        goodStatus: 400,
        badStatus: 400,
    },
    {
        id: '00000000-0000-0000-0000-000000000000',
        expectBad: { message: 'Такого пользователя не существует', errors: [] },
        expectDel: { result: true },
        goodStatus: 200,
        badStatus: 400,
    },
    {
        id: '074bd055-409b-4ad3-b73f-04620511c46f',
        expectBad: { message: 'Такого пользователя не существует', errors: [] },
        expectDel: { result: true },
        goodStatus: 200,
        badStatus: 400,
    },
];

module.exports = { users, ids, validationError };
