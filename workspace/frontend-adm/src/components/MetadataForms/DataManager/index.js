import React from 'react';
import onChange from 'on-change';
import { ModalDetailedError } from 'components/ModalDetailedError';
import { ApiManager } from 'components/MetadataForms/DataManager/ApiManager';
import { MetadataServerContext } from 'components/MetadataForms/DataManager/serverContext';
import $modal from 'components/ui/MyModal/modal.helper';

/*
# Events
props = {
    onBeforeLoad
    onLoad
    onAfterLoad
    onBeforeSave
    onSave
    onAfterSave
    onBeforeDelete
    onDelete
    onAfterDelete
    onBeforeMarkDeleted
    onMarkDeleted
    onAfterMarkDeleted
}
*/
export class DataManager extends React.PureComponent {
    static contextType = MetadataServerContext;

    #ApiManager = null;

    constructor(props) {
        super(props);
        this.server = props.server ?? '';

        this.metaOwner = this.props.metaOwner;
        if (this.props?.options?.element) {
            this.type = this.props?.options?.type ?? 'element';
        } else {
            this.type = this.props?.options?.type ?? 'list';
        }

        this.primaryKey = this.props?.options?.primaryKey ?? 'id';
        this.element = this.props?.options?.element;
        this.formId = this.props?.options?.element ?? this.props.metaOwner;
        this.modalUUID = this.props?.options?.payload?.modalUUID ?? this.props.metaOwner;
        this.parentModalUUID = this.props?.options?.parentModalUUID ?? this.props.metaOwner;

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

        let data = { record: {} };

        if (this.props?.options?.payload?.parent) {
            data.record.parent = this.props?.options?.payload?.parent;
        }

        if (this.type === 'list') data = { list: [] };
        this.MasterData = onChange(data, this.hookData.bind(this));

        let meta = { record: {} };
        if (this.type === 'list') meta = { list: [] };
        this.MasterMetadata = onChange(meta, this.hookMetaData.bind(this));

        this.state = {
            type: this.type,
            primaryKey: this.primaryKey,
            method: this.props?.options?.method,
            ready: false,
        };
        this.isDirty = false;
        this.lastOperationType = null;

        this.selectedRows = [];

        this.refs = {};
        // TODO - что это? зачем это?
        this.formRefs = {};
        this.subs = [];

        this.#ApiManager = new ApiManager({
            DataManager: this,
            metaOwner: this.metaOwner,
            type: this.type,
            method: this.state.method,
            options: this.options,
            element: this.element,
            server: this.server,

            onBeforeLoad: props.onBeforeLoad,
            onLoad: props.onLoad,
            onAfterLoad: props.onAfterLoad,
            onBeforeSave: props.onBeforeSave,
            onSave: props.onSave,
            onAfterSave: props.onAfterSave,
            onBeforeDelete: props.onBeforeDelete,
            onDelete: props.onDelete,
            onAfterDelete: props.onAfterDelete,
            onBeforeMarkDeleted: props.onBeforeMarkDeleted,
            onMarkDeleted: props.onMarkDeleted,
            onAfterMarkDeleted: props.onAfterMarkDeleted,
        });
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
            const newData = []; // MasterData.length = 0;
            data.forEach((line) => {
                const newLine = Array.isArray(line) ? [] : line === null ? null : typeof line === 'object' ? {} : undefined;
                const res = this.reWriteData(line, newLine);
                newData.push(res);
            });
            MasterData = newData;
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
                    MasterData[k] = this.reWriteData(data[k], MasterData[k]);
                } else {
                    MasterData[k] = data[k];
                }
            });
        } else {
            MasterData = data;
        }

        return MasterData;
    }

    // innerFieldName передается, если изменение произошло у поля не примитивного типа
    createFieldByData(value, fieldMetadata, innerFieldName) {
        const field = {
            type: fieldMetadata.ref ? 'ref' : fieldMetadata.type,
            ref: fieldMetadata.ref,
            placeholder: '',
            show: fieldMetadata.show ?? false,

            name: fieldMetadata.field,
            description: fieldMetadata.description,
            precision: fieldMetadata.precision,
            options: fieldMetadata.options,
        };

        if (!innerFieldName) field.value = value;

        if (innerFieldName) {
            field.value = {
                ...this.data.record[fieldMetadata.field],
                [innerFieldName]: value,
            };
        }

        return field;
    }

    hookData(path, value, previousValue, applyData) {
        if (this.type === 'element') {
            if (path.indexOf('record.TabularParts') === 0) {
                const pathWithoutTabularPartPrefix = path.replaceAll('record.TabularParts.', '');
                const tabularPartName = pathWithoutTabularPartPrefix.split('.')[0];

                const subscribtionName = `record.TabularParts.${tabularPartName}`;
                if (this.formRefs[subscribtionName] && this.formRefs[subscribtionName].length > 0) {
                    this.formRefs[subscribtionName]?.forEach((instance) => instance?.changeMasterData(path, value));
                }

                // Изменение всей табличной части (тип value = массив рядов)
                // if (pathParts.length === 1) {
                // Название подписки (изменение всей табличной части целиком)
                // const tabularPath = `record.TabularParts.${tabularPartName}`;
                // }

                // // Изменение ячейки в табличной части
                // // Ожидаемый ключ: tabularParts.[название_табличной_части].[индекс_строк].[название_колонки]
                // else if (pathParts.length === 3) {
                //     const [tabularPartName, rowIndex, columnName] = pathParts;

                //     // Название подписки (изменение ячейки табличной части)
                //     const subscriptionName = `TabularParts.${tabularPartName}.cell`;
                //     const tabularPath = `TabularParts.${tabularPartName}.${rowIndex}.${columnName}`;

                //     if (this.formRefs[subscriptionName]) {
                //         this.formRefs[subscriptionName].changeMasterData(tabularPath, value);
                //     }
                // }
            } else if (path.indexOf('record.') === 0) {
                if (this.formRefs[path] && this.formRefs[path].length > 0) {
                    const field = path.replaceAll('record.', '');
                    const fieldUI = this.createFieldByData(value, this.metadata.treeObject.Fields[field]);

                    this.formRefs[path].forEach((instance) => instance?.changeMasterData(fieldUI));
                }
                const fieldPath = path.split('.').slice(0, 2).join('.');
                if (fieldPath && path.split('.')[2]) {
                    const field = fieldPath.replaceAll('record.', '');
                    const fieldUI = this.createFieldByData(value, this.metadata.treeObject.Fields[field], path.split('.')[2]);

                    this.formRefs[fieldPath]?.forEach((instance) => instance?.changeMasterData(fieldUI));
                }
            }
        } else if (this.type === 'list') {
            // Это неправильно, нужно привязываться к Имени props.name
            this.formRefs[this.type]?.forEach((instance) => instance?.changeMasterData(value));
        }

        // @deprecated
        this.subs.forEach((cb) => cb());
        this.isDirty = true;
    }

    /**
     * @deprecated Используйте метод newMethod()
     */
    addSub(cb) {
        this.subs.push(cb);
    }

    /**
     * @deprecated Используйте метод newMethod()
     */
    removeSub(cb) {
        this.subs = this.subs.filter((sub) => sub !== cb);
    }

    hookMetaData(path, value, previousValue, applyData) {
        // console.log("hookMetaData", path, value, previousValue, applyData);
    }

    getValueByPath(obj, path) {
        return path.split('.').reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : undefined, obj);
    }

    setValueByPath(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    hookChangeFieldData(path, instance) {
        if (!this.formRefs[path]) this.formRefs[path] = [];
        this.formRefs[path].push(instance);
        return (data) => {
            this.setValueByPath(instance.DataManager.MasterData, path, data);
        };
    }

    changeListData(originalData) {
        this.originalData = originalData;
        this.hookData('list', originalData);
    }

    componentDidMount() {
        // Сервер из React Context имеет приоритет над props.server (см. SRDMDLTKLN-525).
        // После получения сервера из контекста — синхронизируем ApiManager.
        const contextServer = this.context || this.props.server || '';
        if (contextServer) {
            this.server = contextServer;
            this.#ApiManager.server = contextServer;
        }
        this.Load().then((res) => {
            this.metadata = res.metadata;
            this.meta = res.meta;
            this.setState({ ready: true }, () => {
                this.data = res.data;
            });
            this.pages = res.pages;
        });
    }

    showErrorModal = (errorStatus, errors, errorStack, errorTitle) => {
        $modal.show(
            'Непредвиденная ошибка!',
            <ModalDetailedError errorStatus={errorStatus} errors={errors} errorStack={errorStack} errorTitle={errorTitle} />,
        );
    };

    cloneElements(childrens) {
        if (childrens) {
            const children = Array.isArray(childrens) ? childrens : [childrens];
            return children.map((htmlElement) => {
                if (Array.isArray(htmlElement)) {
                    return htmlElement.map((htmlElement) => this.cloneElements(htmlElement));
                }

                let props = { ...htmlElement.props };
                if (typeof htmlElement.type !== 'string') {
                    props = { ...props, DataManager: this };
                }

                if (typeof htmlElement.props.children === 'object') {
                    return React.cloneElement(htmlElement, props, ...this.cloneElements(htmlElement.props.children));
                } 
                    return React.cloneElement(htmlElement, props, htmlElement.props.children);
                
            });
        }
        return [];
    }

    render() {
        return <>{this.state.ready && this.cloneElements(this.props.children)}</>;
    }

    async ReloadData() {
        let result;
        if (!this.metadata) return new Promise((reject) => reject('Отстутсуют метаданные'));

        const options = {
            ...this.options,
            // Какая-то херота...
            ...(this.currentSort && {
                order: [[this.currentSort.column, this.currentSort.direction]],
            }),
        };

        try {
            result = await this.#ApiManager.LoadData(this.metadata, options);

            const { data, meta, metadata } = result;
            this.meta = meta;
            this.data = data;
        } catch (error) {
            throw error;
        }

        this.isDirty = true;

        return result;
    }

    // #Api functions
    async Load() {
        const {element} = this;
        const result = await this.#ApiManager.Load(element);
        return result;
    }

    async Save() {
        let result;
        if (this.type === 'element') {
            // debugger;
            result = await this.#ApiManager.Save(this.MasterData);

            const record = result.res.data?.rows?.[0] || result.res.data;
            if (record && typeof record === 'object' && this.metadata?.treeObject?.Fields) {
                const allowedFields = Object.keys(this.metadata.treeObject.Fields);
                Object.keys(record).forEach((name) => {
                    if (allowedFields.includes(name)) {
                        this.data.record[name] = record[name];
                    }
                });

                if (!this.element && record[this.primaryKey]) {
                    this.element = record[this.primaryKey];
                    if (this.options?.where) {
                        this.options.where[this.primaryKey] = this.element;
                    }
                }
            }
            this.lastOperationType = result.operationType;
        }
        this.isDirty = true;
        return result;
    }

    async Delete() {
        const elements = this.selectedRows.map((el) => el.id);
        const result = await this.#ApiManager.Delete(elements);
        return result;
    }

    async MarkDeleted() {
        const elements = this.selectedRows.map((el) => el.id);
        const result = await this.#ApiManager.MarkDeleted(elements);
        return result;
    }

    // #Events
}
