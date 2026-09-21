const crypto = require('crypto');
const MetadataModel = require('../../model/Metadata.model');
const Extensions = require('../../../../../core/class/Extensions.class');

/**
 * @typedef {object} IMultiRefRaw
 * @property {string} type
 * @property {string} value
 * @property {string} link
 */

/**
 * @typedef {object} IMultiRef
 * @property {string} type
 * @property {string} name
 */

/**
 * @typedef {object} IField
 * @property {string} field
 * @property {string} name
 * @property {string} description
 * @property {string} id
 * @property {string} increment
 * @property {string} notnull
 * @property {string} type
 * @property {string} len
 * @property {string} precision
 * @property {string} default
 * @property {string} virtual
 * @property {boolean} unique
 * @property {boolean} show
 * @property {string} value
 * @property {IMultiRefRaw[]} multiRef
 * @property {IMultiRef[]} multiRefFields
 */

/**
 * @typedef {import('../../../db/models/metadata').IMetadata} IMetadata
 */

/**
 * @class
 * @template {MetadataModel} [T = MetadataModel]
 * @template {IMetadata} [ResultT = IMetadata]
 */
class LevelClass extends Extensions {
    /** @type {string} */
    component;

    /** @type {any[]} */
    children = [];

    /**
     * constructor
     * @param {any & { MetadataModel: T | MetadataModel }} props 
     */
    constructor(props = {}) {
        super(props);
        this.MetadataModel = props.MetadataModel ?? MetadataModel;

        this.id = props.id ?? crypto.randomUUID();
        this.childrenCRUD = ['u', 'd', 'rls'];
        this.owner_id = props.owner_id ?? '00000000-0000-0000-0000-000000000000';
        this.props = props;
        this.parent = props.parent;
    }

    needLoading() {
        //@ts-ignore
        return this.id === this.class_id;
    }

    /**
     * @param {IMetadata} item
     */
    async item(item, options = {}) {
        if (options.MetadataModel) this.MetadataModel = options.MetadataModel;
        const menuItem = {
            id: item.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: item.name,
            description: item.description,
            crud: this.childrenCRUD,
            routes: this.props.routes,
        };
        if (options.instance) menuItem.classInstance = this;

        if (this.parent) menuItem.parent = this.parent;

        menuItem.needToLoading = this.needLoading();

        //@ts-expect-error
        if (typeof this.subTree === 'function') {
            menuItem.needToLoading = true;
            if (!options.hideSubTree) {
                //@ts-expect-error
                const subChildren = await this.subTree(item, options)
                if (subChildren.length > 0) menuItem.children = subChildren;
            }
        }

        return menuItem;
    }

    getCurrentInstance(metadata, options = {}) {
        return this.props;
    }

    async tree(metadata, options = {}) {
        if (options.MetadataModel) this.MetadataModel = options.MetadataModel;

        const tree = this.props;
        if (options.instance) tree.classInstance = this;
        /** @type {any} */
        let children = await this.getChildren(this.owner_id, this.id, options);
        children = children.map(async (/** @type {any} */ item) => this.item(item, options));
        children = await Promise.all(children);
        if (children.length > 0) tree.children = children;

        return tree;
    }

    /**
     * @param {string} id 
     * @param {object} options 
     * @returns {Promise<ResultT>}
     */
    async getItem(id, options) {
        const data = await this.MetadataModel.getItem(id, options);
        if (!data) {
            return data;
        }
        if (typeof data.manifest === 'string') {
            try {
                data.manifest = JSON.parse(data.manifest);
            } catch (e) {
                data.manifest = {};
            }
        } else {
            data.manifest = data.manifest ?? {};
        }
        return data;
    }

    /**
     * @param {string | string[]} owner_id 
     * @returns {Promise<ResultT[]>}
     */
    async getOwnerChildren(owner_id = '00000000-0000-0000-0000-000000000000', options) {
        let data = await this.MetadataModel.get({ owner_id }, options);
        data = data.map((/** @type {{ manifest: string; }} */ child) => {
            child.manifest = JSON.parse(child.manifest);
            return child;
        });
        return data;
    }

    /**
     * @param {string} owner_id 
     * @param {string} [class_id] 
     * @returns {Promise<ResultT[]>}
     */
    async getChildren(owner_id = '00000000-0000-0000-0000-000000000000', class_id = undefined, options = {}) {
        if (!class_id) {
            class_id = this.id;
        }

        return this.MetadataModel.get({ owner_id, class_id }, options);
    }

    /**
     * @param {string[]} children 
     * @returns {void}
     */
    appendChildren(children) {
        this.children ||= [];
        this.children.push(...children);
    }

    /**
     * проходимся по полям и вытаскиваем колонки и аттрибуты
     * 
     * @template {Record<string, { value: string, virtual: boolean, off?: boolean }>} T
     * @param {T} fields 
     */
    parseAttributes(fields) {
        const cols = [];
        const attributes = [];
        for (const fieldName in fields) {
            const field = fields[fieldName];
            const off = field.off;

            if (!off) {
                cols.push(field);

                attributes.push(
                    field.virtual
                        ? [field.value, fieldName]
                        : fieldName
                );
            }
        }

        return { attributes, cols };
    }

    /**
     * @param {Record<string, { settings: { primarykey: boolean }, fields: string[] }>} keys 
     * @returns {string[]}
     */
    getPK(keys) {
        /** @type {string[]} */
        let fieldsPK = [];
        Object.keys(keys).forEach((key) => {
            if (keys[key].settings?.primarykey) {
                fieldsPK = Object.keys(keys[key].fields ?? []);
            }
        });
        return fieldsPK;
    }
    /**
     * @param {Record<string, { settings: { primarykey: boolean, fieldview: { value: string } | string }, fields: Record<string, string> }>} keys 
     * @returns {{ fields: string[], viewId: string }[]}
     */
    getPkAndViewId(keys) {
        const pkKeys = Object.values(keys).filter((key) => key?.settings?.primarykey);
        /** @type {string[]} */
        return pkKeys.map((key) => ({
            fields: Object.keys(key.fields ?? {}),
            //@ts-ignore
            viewId: key.settings.fieldview?.value || key.settings.fieldview
        }));
    }

    /**
     * @param {Record<string, { notnull: boolean }>} fields 
     * @returns {string[]}
     */
    getRequired(fields) {
        const fieldsRequired = [];
        Object.keys(fields).forEach((key) => {
            if (fields[key].notnull) {
                fieldsRequired.push(key);
            }
        });
        return fieldsRequired;
    }

    /**
     * @param {string} id 
     */
    async getFamilyTree(id) {
        const parents = await this.getOwnerChildren(id);

        const ids = parents.map(({ id }) => id);

        const allChildren = await this.getOwnerChildren(ids);

        const children = allChildren.reduce((acc, item) => {
            const key = item.manifest?.owner_id ?? item.owner_id;
            acc[key] ||= [];
            acc[key].push(item);

            return acc;
        }, {});

        return { parents, children };
    }

    toJSON(val) {
        try { val = JSON.parse(val); } catch { }

        return val;
    }

    /**
     * @param  {...any} args 
     * @returns {Promise<boolean>}
     */
    async isNextLevelAvaliable(...args) {
        return true
    }

    // /**
    //  * формируем массив связей для мульти ссылок в полях
    //  * логика:
    //  * берем данные мультрирефа и конверитим их в группированные поля с форматом навзания и типа данных
    //  * 
    //  * @param {IMultiRefRaw[]} multiRef 
    //  * @param {string} field 
    //  * @returns {Promise<IMultiRef[]>}
    //  */
    // async getCompositeFields(multiRef, field) {
    //     return [];
    // }

    /**
     * @param {Record<string, IField>} fields 
     */
    async generateSyncField(fields) {
        return fields;
    }

    /**
     * @param {*} keys
     * @param {*} treeObject
     */
    async generateKeys(keys, treeObject) {
        return keys;
    }

    /**
     * Физическое имя колонки из атрибута выборки: строка, [field, alias], { field, name, alias }.
     * @param {unknown} attr
     * @returns {unknown}
     */
    getFizField(attr) {
        if (attr == null || attr === '') {
            return attr;
        }
        if (Array.isArray(attr)) {
            return this.getFizField(attr[0]);
        }
        if (typeof attr === 'object') {
            return this.getFizField(attr.field ?? attr.name ?? attr.alias);
        }
        const text = String(attr);
        if (text.includes(':->:')) {
            return text.split(':->:')[0];
        }
        return text;
    }

    /**
     * @param {unknown[]} attrs
     * @returns {unknown[]}
     */
    getFizFields(attrs) {
        return (Array.isArray(attrs) ? attrs : []).map((item) => this.getFizField(item));
    }

}

module.exports = LevelClass;
