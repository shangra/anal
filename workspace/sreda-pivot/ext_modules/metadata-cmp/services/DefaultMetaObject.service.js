const fs = require('fs');
const path = require('path');
const ApiError = require('../../../core/exceptions/ApiError');
const Extensions = require('../../../core/class/Extensions.class');
const MetadataCMPClass = require('./Metadata.service');
const { Transaction } = require('sequelize');
const MetadataCMP = new MetadataCMPClass();

class DefaultMetaObject extends Extensions {
    /** @type {string} */
    id;

    /**
     * @param {string} [dirname]
     */
    constructor(dirname) {
        super();
        this.dirname = dirname;
        this.pathMetadata = './metadata';
    }

    /**
     * @param {string} [id]
     * @returns
     */
    async form(id) {
        return { form: [] };
    }

    async getClassesMetadata(innerResult, functionParams) {
        const container = global.sreda?.bottle?.container;
        // Если класс зарегистрирован в DI — берём оттуда
        if (container && container[this.id]) {
            return { ...innerResult, [this.id]: container[this.id] };
        }

        // Иначе старый способ через fs, если директория известна
        if (this.dirname) {
            try {
                let dirs = await fs.promises.readdir(path.join(this.dirname, this.pathMetadata));
                dirs = dirs.filter((dir) => dir.toLowerCase().includes('.class.js'));
                dirs = dirs.map((dir) => path.join(this.dirname, this.pathMetadata, dir));
                return { ...innerResult, [this.id]: dirs[0] };
            } catch (e) {
                // папки нет — ок, пропускаем
            }
        }

        return innerResult;
    }

    async metadata() {
        const fullForm = await this.form();
        const form = {
            type: 'create',
            form: fullForm.form,
            buttons: fullForm.buttons ?? [],
            manifest: {
                name: '',
                description: '',
            },
            data: {},
        };
        return form;
    }

    /**
     * @param {string} id
     * @returns
     */
    async metadataItem(id) {
        const [
            data,
            fullForm
        ] = await Promise.all([
            MetadataCMP.getItem(id),
            this.form(id)
        ]);

        const form = fullForm?.form ?? [];
        const buttons = fullForm?.buttons ?? [];

        if (!data) {
            // Виртуальные узлы дерева (Меры, Измерения, Процессинг и т.п.)
            // имеют id = class_id и не хранятся в Metadata.
            if (id === this.id) {
                return {
                    type: 'update',
                    form,
                    buttons,
                    manifest: {
                        name: '',
                        description: '',
                    },
                    data: {
                        id,
                    },
                };
            }

            throw ApiError.NotFound('Метаданные не найдены');
        }

        const manifest = data.manifest && typeof data.manifest === 'object' ? data.manifest : {};
        const settings = manifest.settings && typeof manifest.settings === 'object' ? manifest.settings : {};

        return {
            type: 'update',
            form,
            buttons,
            manifest: {
                name: manifest.name ?? data.name ?? '',
                description: manifest.description ?? data.description ?? '',
            },
            data: {
                id: id,
                ...settings,
            }
        };
    }

    /**
     * Выполняет проверку тела запроса при создании и обновлении.
     *
     * @param {object} body тело запроса
     *
     * @returns {Promise<string[]>} массив сообщений с ошибками
     */
    async validate(body) {
        return [];
    }

    /**
     * 
     * @param {*} body 
     * @param {*} transaction 
     * @returns 
     */
    async createMetadata(body, transaction) {
        const errors = await this.validate(body);
        if (errors.length > 0) {
            const message = Object.values(errors).join('\n');
            throw ApiError.BadRequest(message);
        }

        return MetadataCMP.setMetadata(body, transaction);
    }

    /**
     *
     * @param {string} id
     * @param {object} body
     * @param {Transaction} [transaction]
     * @returns
     */
    async updateMetadata(id, body, transaction) {
        const errors = await this.validate(body);
        const parentId = '00000000-0000-0000-0000-000000000000';

        if (errors.length > 0) {
            const message = Object.values(errors).join('\n');
            throw ApiError.BadRequest(message);
        }

        //Для верхнего уровня сущности, чтобы не менялся родитель
        if (id === body.class_id) {
            body.owner_id = parentId;
        } 
        
        return MetadataCMP.updMetadata(id, body, transaction);
    }

    /**
     * @param {string} id
     * @returns
     */
    async deleteMetadata(id, { transaction } = { transaction: null }) {
        return MetadataCMP.delMetadata(id, { transaction });
    }

    async findMetadata(getOptions, options) {
        return MetadataCMP.getMetadataByOptions(getOptions, options);
    }
}

module.exports = DefaultMetaObject;
