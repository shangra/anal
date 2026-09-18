/*
    Компонент для управления данными в окне, эвенты которые доступны:

    # Таблица обработчиков событий формы (для примера)
    |------------------------|----------------------------|-------------------------------------------------------------------------|
    | Имя события            | Название на русском        | Описание                                                                |
    |------------------------|----------------------------|-------------------------------------------------------------------------|
    | onBeforeLoad           | ПередЗагрузкой             | Вызывается перед отправкой на сервер запроса метаданных и данных.       |
    | onLoad                 | ПриЗагрузке                | Вызывается после запроса метаданных, но до запроса данных.              |
    | onAfterLoad            | ПослеЗагрузки              | Вызывается после получения данных с сервера.                            |
    | onBeforeSave           | ПередСохранением           | Вызывается перед отправкой на сервер запроса с данными.                 |
    | onSave                 | ПриСохранении              | Вызывается вместо отправки запроса на сервер (как декоратор).           |
    | onAfterSave            | ПослеСохранения            | Вызывается после записи данных на сервере и получении от него ответа.   |
    | onBeforeDelete         | ПередУдалением             | Вызывается перед отправкой на сервер запроса на удаление.               |
    | onDelete               | ПриУдалении                | Вызывается вместо отправки запроса на сервер (как декоратор).           |
    | onAfterDelete          | ПослеУдаления              | Вызывается после ответа сервера об удалении объекта(ов).                |
    | onBeforeMarkDeleted    | ПередПометкойНаУдаление    | Вызывается перед отправкой на сервер запроса пометки удаления.          |
    | onMarkDeleted          | ПриПометкеНаУдаление       | Вызывается вместо отправки запроса на сервер (как декоратор).           |
    | onAfterMarkDeleted     | ПослеПометкиНаУдаление     | Вызывается после ответа сервера о пометке на удаление объектов.         |
    |------------------------|----------------------------|-------------------------------------------------------------------------|

    */

import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';

export class ApiManager {
    constructor(options) {
        this.metaOwner = options.metaOwner;
        this.type = options.type;
        this.method = options.method;
        this.primaryKey = options?.primaryKey ?? 'id';
        this.element = options.element;

        this.options = options.options;
        this.props = options;

        // server — обязательный параметр; '' означает «основной сервер» (default backend).
        // Если не передан — подставляем '' для обратной совместимости, но вызывающий код
        // всегда должен явно передавать server (см. SRDMDLTKLN-525).
        this.server = options?.server ?? '';
        this.DataManager = options.DataManager;
    }

    // Получение разрешенных атрибутов
    getAttributes(metadata) {
        const fields = metadata?.treeObject?.Fields ?? {};
        const attributes = Object.keys(fields).filter((el) => fields[el].show);
        attributes.push(this.primaryKey);
        return attributes.length > 0 ? attributes : undefined;
    }

    methodFactory(data, method) {
        if (method === 'copy') {
            // console.log("methodFactory", data);
            // Удаляем все связанные поля которые при копировании не нужны
            delete data.record.id;
            delete data.record.code;
            delete data.record.markdel;
            delete data.record.createdAt;
            delete data.record.updatedAt;
            delete data.record.createdUser;
            delete data.record.updatedUser;

            const TabsName = Object.keys(data.record?.TabularParts ?? {});
            for (const tabName of TabsName) {
                for (const line of data.record.TabularParts[tabName]) {
                    delete line.id;
                    delete line.code;
                    delete line.createdAt;
                    delete line.updatedAt;
                    delete line.createdUser;
                    delete line.updatedUser;
                }
            }
        }
        return data;
    }

    async LoadData(inputMetadata, options) {
        const opt = JSON.parse(JSON.stringify(options));
        if (this.attributes) {
            opt.attributes = this.attributes;
        }
        let originalData;

        if (this.currentSort && !options.order) {
            options.order = [[this.currentSort.column, this.currentSort.direction]];
        }

        if (this.type === 'list') {
            opt.limit = options.limit;
            opt.offset = options.offset;
        } else {
            opt.withTabularParts = true;
            opt.withMetadata = true;
            opt.withHierarchy = false;
        }

        const meta = {};
        let data = {};
        let metadata = inputMetadata;
        let pages = 0;

        try {
            const query = encodeURIComponent(JSON.stringify(opt));
            const res = await $api.get(
                buildUrl(this.server, `${inputMetadata.routes.toLowerCase()}/${inputMetadata.id}?options=${query}`),
                { data: { flashOff: true } },
            );
            if (res.data.refs) {
                this.refs = { ...res.data.refs }; // лучше сделать через deepmerge!!!!
            }

            if (this.type === 'element') {
                // Обработка элемента (новая или существующая запись)
                if (this.element) {
                    data.record = res.data.rows?.[0] || {};

                    const metaTmp = structuredClone(res.data);
                    delete metaTmp.rows;

                    // Как оказалось нужно больше чем просто метаданные, но нужны еще и параметры запросов
                    meta.record = metaTmp;
                } else {
                    data.record = res.data.emptyRecord || {};
                    data.record.TabularParts = {};

                    this.refs.TabularParts = {};
                    const tabularParts = inputMetadata.treeObject.TabularParts || {};
                    for (const tabularName of Object.keys(tabularParts)) {
                        this.refs.TabularParts[tabularName] = {};
                    }

                    // Инициализация табличных частей
                    const tabularPartsMeta = inputMetadata.treeObject.TabularParts;
                    for (const tabularName of Object.keys(tabularPartsMeta)) {
                        data.record.TabularParts[tabularName] = [];
                        if (tabularPartsMeta[tabularName].columns) {
                            if (!meta.tabularParts) meta.tabularParts = {};
                            meta.tabularParts[tabularName] = {
                                cols: tabularPartsMeta[tabularName].columns,
                                metadata: tabularPartsMeta[tabularName],
                            };
                        }
                    }
                }

                // Дополняем метаданные
                if (res.data.metadata?.tabularParts) {
                    meta.tabularParts = {
                        ...meta.tabularParts,
                        ...res.data.metadata.tabularParts,
                    };
                }
            } else if (this.type === 'list') {
                originalData = res.data;
                pages = Math.ceil(res.data.count / (this.options.limit || 1));

                const metaTmp = structuredClone(res.data);
                delete metaTmp.rows;

                // Как оказалось нужно больше чем просто метаданные, но нужны еще и параметры запросов
                meta.list = metaTmp;

                // Данные должны заполняться только после метадаты
                data.list = res.data.rows;
            }

            if (this.method) {
                data = this.methodFactory(data, this.method);
            }

            data = await this.onLoad(data);

            metadata = res.data.metadata;
        } catch (error) {
            console.error(error);
        } finally {
            //
        }

        return { data, meta, metadata, pages };
    }

    // Инициализация загрузки
    async Load() {
        // http://localhost:3100/api/metadata/object/0d195f67-1f92-4ae6-aec1-225773ebc726
        // this.options = {};

        let meta;
        let data;
        let metadata;
        let pages;

        if (this.onBeforeLoad()) {
            let afterLoadError;

            try {
                const res = await $api.get(buildUrl(this.server, `metadata/object/${this.metaOwner}`), {
                    data: { flashOff: true },
                });
                metadata = res.data;

                if (this.type === 'list') {
                    this.attributes = this.getAttributes(metadata);

                    if (!'limit' in this.options && !'offset' in this.options) {
                        this.options = { limit: 200, offset: 0 };
                    }
                }
                if (this.type === 'element' && !this.element) {
                    this.options = {
                        ...(this.options ?? {}),
                        withTabularParts: true,
                        withHierarchy: false,
                    };
                }

                // console.log(this.metadata, this.options);
                const result = await this.LoadData(metadata, this.options);
                data = result.data;
                meta = result.meta;
                pages = result.pages;
                // metadata = result.metadata;
                // only this changed - rest is linter
                if (result.metadata?.treeObject?.Fields) {
                    metadata = {
                        ...metadata,
                        treeObject: {
                            ...metadata.treeObject,
                            Fields: {
                                ...metadata.treeObject.Fields,
                                ...result.metadata.treeObject.Fields,
                            },
                            FieldsGUID: result.metadata.treeObject.FieldsGUID
                                ? { ...metadata.treeObject.FieldsGUID, ...result.metadata.treeObject.FieldsGUID }
                                : metadata.treeObject.FieldsGUID,
                        },
                    };
                }
            } catch (error) {
                console.error(error);
                afterLoadError = error;
            } finally {
                await this.onAfterLoad(this.DataManager, { meta, data, metadata }, afterLoadError);
            }
        }

        this.metadata = metadata;
        return { data, meta, metadata, pages };
    }

    async UpdateData(data) {
        const result = {
            operationType: 'update',
        };

        try {
            const res = await $api.put(
                buildUrl(this.server, `${this.metadata.routes.toLowerCase()}/${this.metadata.id}`),
                data,
            );
            result.res = res;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            //
        }
        return result;
    }

    async CreateData(data) {
        const result = {
            operationType: 'create',
        };

        try {
            const res = await $api.post(
                buildUrl(this.server, `${this.metadata.routes.toLowerCase()}/${this.metadata.id}`),
                data,
            );
            result.res = res;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            //
        }
        return result;
    }

    // Инициализация сохранения
    async Save(data) {
        // PUT http://localhost:3100/api/metadata/documents/74726395-9d1e-4a2b-a1c8-d74d0e20f063
        let result;
        if (this.onBeforeSave(data)) {
            let errorForAfter;
            try {
                if (data.record.id) {
                    result = await this.UpdateData(data);
                } else {
                    result = await this.CreateData(data);
                }
            } catch (error) {
                errorForAfter = error;
                throw error;
            } finally {
                this.onAfterSave(this, result, errorForAfter);
            }
        }
        return result;
    }

    async DeleteData(data, force = false) {
        let result;

        try {
            const query = force ? '?force=true' : '';
            const options = {
                data,
            };
            result = await $api.delete(
                buildUrl(this.server, `${this.metadata.routes.toLowerCase()}/${this.metadata.id}${query}`),
                options,
            );
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            console.log('DELETE', data);
        }

        return result;
    }

    // Инициализация удаления
    async Delete(elements) {
        // DELETE http://localhost:3100/api/metadata/guide/f68cf6a2-fcdd-439b-b8a3-007a049101cd
        let result;
        const data = { id: elements };
        if (this.onBeforeDelete(data)) {
            let errorForAfter;
            try {
                result = await this.DeleteData(data, true);
            } catch (error) {
                errorForAfter = error;
                throw error;
            } finally {
                this.onAfterDelete(this, result, errorForAfter);
            }
        }
        return result;
    }

    // Маркировка удаления
    async MarkDeleted(elements) {
        const record = { id: elements, markdel: true };
        return this.UpdateData({ record });
    }

    // Перед загрузкой
    async onBeforeLoad() {
        return (await this.props?.onBeforeLoad?.()) ?? true;
    }

    // Загрузка
    async onLoad(data) {
        return (await this.props?.onLoad?.(data)) ?? data;
    }

    // После загрузки
    async onAfterLoad(instance, error = undefined) {
        await this.props?.onAfterLoad?.(instance, error);
    }

    // Перед сохранением
    async onBeforeSave() {
        return (await this.props?.onBeforeSave?.()) ?? true;
    }

    // Сохранение
    async onSave(data) {
        return (await this.props?.onSave?.(data)) ?? data;
    }

    // После сохранения
    async onAfterSave(instance, data, error = undefined) {
        await this.props?.onAfterSave?.(instance, data, error);
    }

    // Перед удалением
    async onBeforeDelete(params) {
        return (await this.props?.onBeforeDelete?.(params)) ?? true;
    }

    // Удаление
    async onDelete(data) {
        return this.props?.onDelete?.(data) ?? data;
    }

    // После удаления
    async onAfterDelete(instance, result, error = undefined) {
        await this.props?.onAfterDelete?.(instance, result, error);
        return result;
    }

    // Перед пометкой удаления
    async onBeforeMarkDeleted() {
        return this.props?.onBeforeMarkDeleted?.() ?? true;
    }

    // При пометке удаления
    async onMarkDeleted(data) {
        return this.props?.onMarkDeleted?.(data) ?? data;
    }

    // После пометки удаления
    async onAfterMarkDeleted(instance, error = undefined) {
        this.props?.onAfterMarkDeleted?.(instance, error);
    }
}
