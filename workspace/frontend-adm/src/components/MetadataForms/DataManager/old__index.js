import $api from 'helpers/axios';
import React from 'react';
import onChange from 'on-change';
import $modal from 'components/ui/MyModal/modal.helper';
import { ModalDetailedError } from 'components/ModalDetailedError';

export class DataManager extends React.PureComponent {
    constructor(props) {
        super(props);

        this.metaOwner = this.props.metaOwner;
        if (this.props?.options?.element) {
            this.type = this.props?.options?.type ?? 'element';
        } else {
            this.type = this.props?.options?.type ?? 'list';
        }

        this.primaryKey = this.props?.options?.primaryKey ?? 'id';
        this.element = this.props?.options?.element;

        // if (this.props?.options?.method === "copy") {
        //     this.element = null;
        // }
        this.formId = this.props?.options?.element ?? this.props.metaOwner;
        this.modalUUID = this.props.options?.payload?.modalUUID ?? this.props.metaOwner;
        this.parentModalUUID = this.props.options?.parentModalUUID ?? this.props.metaOwner;

        this.options = {};
        this.currentSort = null;
        switch (this.type) {
            case 'list':
                this.options = { limit: 200, offset: 0 };
                this.pages = null;
                break;
            case 'element':
                this.options = { where: { [this.primaryKey]: this.element }, withTabularParts: true };
                break;
        }

        /*
        {
            "record": {},
            "tabularParts": {
                "ce2595aa-20e1-4f3b-a963-501e26e96770": {
                "data": [],
                "create": [],
                "update": [],
                "delete": []
                }
            }
        }
        */

        let data = {
            record: {},
            tabularParts: {},
        };
        if (this.type === 'list') data = { list: [] };
        this.MasterData = onChange(data, this.hookData.bind(this));

        let meta = {
            record: {},
            tabularParts: {},
        };
        if (this.type === 'list') meta = { list: [] };
        this.MasterMetadata = onChange(meta, this.hookMetaData.bind(this));

        this.state = {
            type: this.type,
            primaryKey: this.primaryKey,
            method: this.props?.options?.method,
            ready: false,
        };

        this.selectedRows = [];
        this.refs = {};
        this.formRefs = {};
        this.subs = [];
    }

    get data() {
        return this.MasterData;
    }

    set data(value) {
        this.reWriteData(value, this.MasterData);
    }

    get meta() {
        return this.MasterMetadata;
    }

    set meta(value) {
        this.reWriteData(value, this.MasterMetadata);
    }

    reWriteData(data, MasterData) {
        if (data && Array.isArray(data)) {
            data.forEach((line) => {
                const newLine = Array.isArray(line) ? [] : line === null ? null : typeof line === 'object' ? {} : undefined;
                this.reWriteData(line, newLine);
                MasterData.push(newLine);
            });
        } else if (data && typeof data === 'object') {
            Object.keys(data).forEach((k) => {
                if (typeof data[k] === 'object') {
                    if (!MasterData[k]) {
                        if (data[k] && Array.isArray(data[k])) {
                            MasterData[k] = []; // Чтобы null не превращалось в прустой объект
                        } else if (data[k] && typeof data[k] === 'object') {
                            MasterData[k] = {}; // Чтобы null не превращалось в пустой объект
                        } else {
                            MasterData[k] = null;
                        }
                    }
                    this.reWriteData(data[k], MasterData[k]);
                } else {
                    MasterData[k] = data[k];
                }
            });
        } else {
            MasterData = data;
        }
    }

    componentDidMount() {
        this.Load();
    }

    createFieldByData(value, fieldMetadata) {
        const field = {
            type: fieldMetadata.ref ? 'ref' : fieldMetadata.type,
            ref: fieldMetadata.ref,
            placeholder: '',
            show: fieldMetadata.show ?? false,

            name: fieldMetadata.field,
            description: fieldMetadata.description,
            value,
        };

        if ((fieldMetadata.ref && typeof field.value !== 'object' && field.value !== null) || field.type === 'composite') {
            const label = this.refs?.[field.name]?.[field.value] ?? '';
            field.value = {
                value: field.value,
                label,
            };
        }

        return field;
    }

    hookData(path, value, previousValue, applyData) {
        if (this.type === 'element') {
            if (path.indexOf('record.TabularParts') === 0) {
                const pathWithoutTabularPartPrefix = path.replaceAll('record.TabularParts.', '');
                const pathParts = pathWithoutTabularPartPrefix.split('.');
                // Изменение всей табличной части (тип value = массив рядов)
                if (pathParts.length === 1) {
                    const tabularPartName = pathParts[0];
                    // Название подписки (изменение всей табличной части целиком)
                    const subscribtionName = `TabularParts.${tabularPartName}.table`;
                    const tabularPath = `TabularParts.${tabularPartName}`;
                    if (this.formRefs[subscribtionName]) {
                        this.formRefs[subscribtionName].changeMasterData(tabularPath, value);
                    }
                }
                // Изменение ячейки в табличной части
                // Ожидаемый ключ: tabularParts.[название_табличной_части].[индекс_строк].[название_колонки]
                else if (pathParts.length === 3) {
                    const [tabularPartName, rowIndex, columnName] = pathParts;

                    // Название подписки (изменение ячейки табличной части)
                    const subscriptionName = `TabularParts.${tabularPartName}.cell`;
                    const tabularPath = `TabularParts.${tabularPartName}.${rowIndex}.${columnName}`;

                    if (this.formRefs[subscriptionName]) {
                        this.formRefs[subscriptionName].changeMasterData(tabularPath, value);
                    }
                }
            } else if (path.indexOf('record.') === 0) {
                if (this.formRefs[path]) {
                    const field = path.replaceAll('record.', '');
                    const fieldUI = this.createFieldByData(value, this.metadata.treeObject.Fields[field]);
                    this.formRefs[path].changeMasterData(fieldUI);
                }
            }
        } else if (this.type === 'list') {
            // Это не правильно, нужно привязываться к Имени props.name
            this.formRefs[this.type].changeMasterData(value);
        }

        this.subs.forEach((cb) => cb());
    }

    addSub(cb) {
        this.subs.push(cb);
    }

    removeSub(cb) {
        this.subs = this.subs.filter((sub) => sub !== cb);
    }

    hookMetaData(path, value, previousValue, applyData) {
        // console.log("hookMetaData", path, value, previousValue, applyData);
    }

    hookChangeFieldData(path, instance) {
        this.formRefs[path] = instance;
    }

    changeListData(originalData) {
        this.originalData = originalData;
        this.hookData('list', originalData);
    }

    async LoadTabularPart(routesTabularPart, tabularPart) {
        // http://localhost:3100/api/metadata/documents/tabularparts/74726395-9d1e-4a2b-a1c8-d74d0e20f063/4f4f5d80-3060-45ca-a8d1-4eb6ce0274fa?options={%22where%22:{%22owner%22:%226c4df464-955f-4627-9647-1c806178d6ac%22}}
        let result = [];
        const opt = {
            where: {
                owner: this.element,
            },
        };
        const query = encodeURIComponent(JSON.stringify(opt));

        try {
            const res = await $api.get(
                `/${routesTabularPart.toLowerCase()}/${this.metaOwner}/${tabularPart.id}?options=${query}`,
                { data: { flashOff: true } },
            );
            result = res.data;
        } catch (error) {
            // TODO - убрать это отсюда, это должен обрабатывать интерсептор $api
            console.error(error);
            const status = error?.response?.status ?? 'Error';
            const errors = error?.response?.data?.errors ?? [];
            const stack = [];
            const message = error.message ?? error.response.statusText ?? 'Ошибка при загрузке табличных частей';
            this.showErrorModal(status, errors, stack, message);

            return false;
        }

        return result;
    }

    async LoadTabularParts(metadata) {
        let metaResult = {};
        let result = {};
        if (this.type === 'element') {
            let routesTabularPart = '';
            metadata.children.forEach((el) => {
                if (el.class === 'TabularParts') {
                    routesTabularPart = el.routes;
                }
            });

            const {TabularParts} = metadata.treeObject;
            for (const tabularName of Object.keys(TabularParts)) {
                const data = await this.LoadTabularPart(routesTabularPart, TabularParts[tabularName], this.options);
                metaResult = { ...metaResult, [tabularName]: { cols: data.cols, metadata: data.metadata, refs: data.refs } };
                result = { ...result, [tabularName]: data?.rows ?? [] };
            }
        }
        return { data: result, meta: metaResult };
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
        }
        return data;
    }

    LoadData(inputMetadata, options) {
        const opt = JSON.parse(JSON.stringify(options));
        if (this.attributes) {
            opt.attributes = this.attributes;
        }
        let originalData;

        if (this.currentSort && !options.order) {
            options.order = [[this.currentSort.column, this.currentSort.direction]];
        }

        if (this.type === 'list') {
            opt.limit = this.options.limit;
            opt.offset = this.options.offset;
        } else {
            opt.withTabularParts = true;
            opt.withMetadata = true;
        }

        const query = encodeURIComponent(JSON.stringify(opt));

        return $api
            .get(`/${inputMetadata.routes.toLowerCase()}/${inputMetadata.id}?options=${query}`, { data: { flashOff: true } })
            .then(async (res) => {
                if (res.data.refs) {
                    this.refs = res.data.refs;
                }
                const meta = {};
                let data = {};

                if (this.type === 'element') {
                    // Обработка элемента (новая или существующая запись)
                    if (this.element) {
                        data.record = res.data.rows?.[0] || {};
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
                    data.list = res.data.rows;
                    originalData = res.data;
                    this.pages = Math.ceil(res.data.count / (this.options.limit || 1));

                    meta.list = {
                        cols: res.data.cols,
                        metadata: res.data.metadata,
                    };
                }

                if (this.state.method) {
                    data = this.methodFactory(data, this.state.method);
                }

                data = this.onLoad(data);

                this.metadata = res.data.metadata;
                this.data = data;
                this.meta = meta;
            })
            .catch((error) => {
                // TODO - убрать это отсюда, это должен обрабатывать интерсептор $api
                console.error(error);
                const status = error?.response?.status ?? 'Error';
                const errors = error?.response?.data?.errors ?? [];
                const message = error.message ?? error.response.statusText ?? 'Ошибка при загрузке ????';
                const stack = [];
                this.showErrorModal(status, errors, stack, message);
            })
            .finally(() => {
                if (this.type === 'list' && originalData) {
                    this.changeListData(originalData);
                }
            });
    }

    // Получение разрешенных атрибутов
    getAttributes(metadata) {
        const fields = metadata?.treeObject?.Fields ?? {};
        const attributes = Object.keys(fields).filter((el) => fields[el].show);
        attributes.push(this.primaryKey);
        return attributes.length > 0 ? attributes : undefined;
    }

    ReloadData() {
        if (!this.metadata) return new Promise((reject) => reject('Отстутсуют метаданные'));

        const options = {
            ...this.options,
            ...(this.currentSort && {
                order: [[this.currentSort.column, this.currentSort.direction]],
            }),
        };

        return this.LoadData(this.metadata, options);
    }

    // Инициализация загрузки
    Load() {
        // http://localhost:3100/api/metadata/object/0d195f67-1f92-4ae6-aec1-225773ebc726
        if (this.onBeforeLoad()) {
            let afterLoadError;
            $api.get(`/metadata/object/${this.metaOwner}`, { data: { flashOff: true } })
                .then((res) => {
                    this.metadata = res.data;
                    this.setState({ ready: true }, () => {
                        if (this.type === 'list') {
                            this.attributes = this.getAttributes(this.metadata);

                            this.options = { limit: 200, offset: 0 };
                        }
                        if (this.type === 'element' && !this.element) {
                            this.options = {
                                ...this.options,
                                withTabularParts: true,
                            };
                        }
                        this.LoadData(this.metadata, this.options);
                    });
                })
                .catch((error) => {
                    // TODO - убрать это отсюда, это должен обрабатывать интерсептор $api
                    console.error(error);
                    const status = error?.response?.status ?? 'Error';
                    const errors = error?.response?.data?.errors ?? [];
                    const message = error.message ?? error.response.statusText ?? 'Ошибка при загрузке ????';
                    const stack = [];
                    this.showErrorModal(status, errors, stack, message);

                    afterLoadError = error;
                })
                .finally(() => {
                    this.onAfterLoad(this, afterLoadError);
                });
        }
    }

    UpdateData(data) {
        return $api
            .put(`/${this.metadata.routes.toLowerCase()}/${this.metadata.id}`, data)
            .then((res) => ({
                    operationType: 'update',
                    res,
                }))
            .catch((error) => {
                // TODO - убрать это отсюда, это должен обрабатывать интерсептор $api
                console.error(error);
                const status = error?.response?.status ?? 'Error';
                const errors = error?.response?.data?.errors ?? [];
                const message = error.message ?? error.response.statusText ?? 'Ошибка при загрузке ????';
                const stack = [];
                this.showErrorModal(status, errors, stack, message);

                throw error;
            });
    }

    CreateData(data) {
        return $api
            .post(`/${this.metadata.routes.toLowerCase()}/${this.metadata.id}`, data)
            .then((res) => ({
                    operationType: 'create',
                    res,
                }))
            .catch((error) => {
                // TODO - убрать это отсюда, это должен обрабатывать интерсептор $api
                console.error(error);
                const status = error?.response?.status ?? 'Error';
                const errors = error?.response?.data?.errors ?? [];
                const message = error.message ?? error.response.statusText ?? 'Ошибка при загрузке ????';
                const stack = [];
                this.showErrorModal(status, errors, stack, message);

                throw error;
            });
    }

    // Инициализация сохранения
    Save(options) {
        // PUT http://localhost:3100/api/metadata/documents/74726395-9d1e-4a2b-a1c8-d74d0e20f063

        const data = this.MasterData;

        if (this.onBeforeSave(data)) {
            let notificationMessage;
            if (data.record.id) {
                return this.UpdateData(data);
                // .then(() => {
                //     notificationMessage = 'Успешно обновлен';
                // })
                // .catch(() => {
                //     notificationMessage = 'При обновленеии, что-то пошло не так';
                // });
            } 
                return this.CreateData(data);
                // .then(() => {
                //     notificationMessage = 'Успешно создан';
                // })
                // .catch(() => {
                //     notificationMessage = 'При создании, что-то пошло не так';
                // });
            

            // if (options.notify) {
            //     $message.show(notificationMessage);
            // }
        }
    }

    DeleteData(data, force = false) {
        const query = force ? '?force=true' : '';

        const options = {
            data,
        };

        return $api
            .delete(`/${this.metadata.routes.toLowerCase()}/${this.metadata.id}${query}`, options)
            .then((res) => {
                // console.log('then', res.data);
            })
            .catch((error) => {
                // TODO - убрать это отсюда, это должен обрабатывать интерсептор $api

                console.error(error);
                const status = error?.response?.status ?? 'Error';
                const errors = error?.response?.data?.errors ?? [];
                const message = error.message ?? error.response.statusText ?? 'Ошибка при загрузке ????';
                const stack = [];
                this.showErrorModal(status, errors, stack, message);
            })
            .finally(() => {
                console.log('DONE');
            });
    }

    // Инициализация удаления
    Delete(elements) {
        // DELETE http://localhost:3100/api/metadata/guide/f68cf6a2-fcdd-439b-b8a3-007a049101cd
        const data = { id: elements };
        return this.DeleteData(data, true);
    }

    // Маркировка удаления
    MarkDeleted(elements) {
        const record = { id: elements, markdel: true };
        return this.UpdateData({ record });
    }

    // Перед загрузкой
    onBeforeLoad() {
        return this.props?.onBeforeLoad?.() ?? true;
    }

    // Загрузка
    onLoad(data) {
        return this.props?.onLoad?.(data) ?? data;
    }

    // После загрузки
    onAfterLoad(instance, error = undefined) {
        this.props?.onAfterLoad?.(instance, error);
    }

    // Перед сохранением
    onBeforeSave() {
        return this.props?.onBeforeSave?.() ?? true;
    }

    // Сохранение
    onSave(data) {
        return this.props?.onSave?.(data) ?? data;
    }

    // После сохранения
    onAfterSave(instance, error = undefined) {
        this.props?.onAfterSave?.(instance, error);
    }

    // Перед удалением
    onBeforeDelete() {
        return this.props?.onBeforeDelete?.() ?? true;
    }

    // Удаление
    onDelete(data) {
        return this.props?.onDelete?.(data) ?? data;
    }

    // После удаления
    onAfterDelete(instance, error = undefined) {
        this.props?.onAfterDelete?.(instance, error);
    }

    // Перед пометкой удаления
    onBeforeMarkDeleted() {
        return this.props?.onBeforeMarkDeleted?.() ?? true;
    }

    // При пометке удаления
    onMarkDeleted(data) {
        return this.props?.onMarkDeleted?.(data) ?? data;
    }

    // После пометки удаления
    onAfterMarkDeleted(instance, error = undefined) {
        this.props?.onAfterMarkDeleted?.(instance, error);
    }

    cloneElements(childrens) {
        if (childrens) {
            const children = Array.isArray(childrens) ? childrens : [childrens];
            return children.map((htmlElement) => {
                let props = { ...htmlElement.props };
                if (typeof htmlElement.type !== 'string') {
                    props = { ...props, DataManager: this };
                }
                return React.cloneElement(htmlElement, props, ...this.cloneElements(htmlElement.props.children));
            });
        }
        return [];
    }

    showErrorModal = (errorStatus, errors, errorStack, errorTitle) => {
        $modal.show(
            'Непредвиденная ошибка!',
            <ModalDetailedError errorStatus={errorStatus} errors={errors} errorStack={errorStack} errorTitle={errorTitle} />,
        );
    };

    render() {
        return <>{this.state.ready && this.cloneElements(this.props.children)}</>;
    }
}
