module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Коннекторы
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                    class: 'Connector',
                    name: 'Коннекторы',
                    description: 'Коннекторы',
                    manifest: '{}',
                    rank: 2,
                },
                {
                    id: '5af041e3-6657-4064-a89a-390135440967',
                    markdel: 0,
                    parent: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                    class_id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                    class: 'Connector',
                    name: 'SREDA_pivot',
                    description: 'Для внутренних нужд сервиса pivot',
                    manifest: JSON.stringify({
                        owner_id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                        class_id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                        class: 'Connector',
                        name: 'SREDA_pivot',
                        description: 'Для внутренних нужд сервиса pivot',
                        settings: {
                            id: '5af041e3-6657-4064-a89a-390135440967',
                            dialect: 'postgres',
                            host: process.env.DB_HOST || '',
                            port: Number(process.env.DB_PORT) || 5432,
                            database: process.env.DB_DATABASE || '',
                            schema: process.env.DB_SCHEMA || 'pivot',
                            user: process.env.DB_USER || '',
                            pool: '',
                            cluster: '',
                            connection_string: '',
                            gss: false,
                        },
                        events: {},
                    }),
                    rank: 0,
                },
            ],
            {},
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {
                where: {
                    id: [
                        'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                        '5af041e3-6657-4064-a89a-390135440967',
                    ],
                },
            },
        );
    },
};