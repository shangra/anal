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
        id: fieldIds.code,
        name: 'Код',
        description: 'Код',
        settings: {
            nameField: 'code',
            type: 'string',
            notnull: true,
            unique: true,
            showfield: true,
        },
    },
    {
        id: fieldIds.name,
        name: 'Имя',
        description: 'Имя',
        settings: {
            nameField: 'name',
            type: 'string',
            notnull: true,
            unique: true,
            showfield: true,
        },
    },
    {
        id: fieldIds.details,
        name: 'Подробности',
        description: 'Подробности',
        settings: {
            nameField: 'details',
            type: 'string',
            notnull: false,
            showfield: true,
        },
    },
];

module.exports = { allFieldsGenerator };
