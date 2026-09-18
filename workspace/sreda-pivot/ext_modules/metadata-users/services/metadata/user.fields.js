const allFieldsGenerator = (fieldIds) => [
    {
        id: fieldIds.id,
        name: 'Идентификатор',
        description: 'Идентификатор',
        settings: {
            nameField: 'id',
            type: 'uuid',
            notnull: true,
            unique: true,
            default: 'UUID',
            showfield: false,
            editing: false,
        },
    },
    {
        id: fieldIds.login,
        name: 'Логин',
        description: 'Логин пользователя',
        settings: {
            nameField: 'login',
            type: 'string',
            notnull: true,
            unique: true,
            showfield: true,
        },
    },
    {
        id: fieldIds.status,
        name: 'Статус',
        description: 'Статус',
        settings: {
            nameField: 'status',
            type: 'string',
            notnull: false,
            showfield: true,
        },
    },
];

module.exports = { allFieldsGenerator };
