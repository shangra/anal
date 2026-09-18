const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');

class KeysService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = '7827a8a5-4f92-443a-bb73-1dfcca358abf';
        this.component = 'Keys';
    }

    async form() {
        return {
            form: [
                {
                    name: 'primarykey',
                    description: 'Первичный ключ',
                    type: 'BOOL',
                },
                // {
                //     name: 'view',
                //     description: 'Представление',
                //     type: 'BOOL',
                // },
            ],
        };
    }
}

module.exports = KeysService;
