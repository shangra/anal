const Extensions = require('../../../core/class/Extensions.class');
const MetaData = require('./metadata/source/MetaData.class');
const MetadataModel = require('./model/Metadata.model');

const MemorySave = require('../../../core/services/memory-save');
const httpContext = require('../../../core/services/http-context');
const ApiError = require('../../../core/exceptions/ApiError');

const constants = require('../constants');
const { capitallize } = require('../../utils/services');

/**
 * @param {unknown} raw
 * @returns {object}
 */
function parseManifest(raw) {
    if (raw == null || raw === '') {
        return {};
    }
    if (typeof raw === 'object') {
        return raw;
    }
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

/**
 * @typedef {import("sequelize").Transaction} Transaction
 * @typedef {string | { value?: string, link: string }} Ref
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * @typedef {import('./metadata/source/type').default} LevelClassI
 * @typedef {{ value?: string, link?: string, fieldChildren?: string[], name?: string }} IRefObj
 * @typedef {string | IRefObj} IRef
 */

class MetadataService extends Extensions {
    /**
     * @constructor
     */
    constructor(options = {}) {
        super();

        this.MetadataModel = options.MetadataModel || MetadataModel;

        const name = 'Metadata';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    /**
     * Для перегрузки подключаемыми классами
     * 
     * @returns {Promise<Record<string, string>>}
     */
    async getClassesMetadata() {
        return {};
    }

    /**
     * @param {string} parent 
     * @returns 
     */
    async getMetadataParent(parent) {
        const result = await this.MetadataModel.get({ parent });
        result.forEach(i => i.manifest = parseManifest(i.manifest));
        return result;
    }

    /**
     * @param {WhereOptions} getOptions 
     * @param {{ force?: boolean; transaction?: Transaction }} [options] 
     * @returns 
     */
    async getMetadataByOptions(getOptions, options = {}) {
        let result = [];
        getOptions = getOptions ?? {};
        if (getOptions.where) {
            result = await this.MetadataModel.get(getOptions.where, options);
        }
        return result;
    }

    /**
     * @param {string} class_id
     * @param {string} parent
     */
    async getMetadataLinks(class_id, parent) {
        let owner_id;
        if (parent && parent !== '') {
            owner_id = parent;
        }
        return await this.MetadataModel.getLinks(class_id, owner_id);
    }

    /**
     * @param {string} id 
     * @param {object} [options] 
     * @returns 
     */
    async getMetadata(id, options) {
        const metadata = await this.MetadataModel.getItem(id, options);
        let extItem;
        if (metadata) {
            const ext = await this.getClassesMetadata();
            const classFile = ext[metadata.class_id];
            const ext_class = require(classFile);
            const instance = new ext_class({ MetadataModel: this.MetadataModel });
            extItem = await instance.item(metadata, options);

            extItem.manifest = parseManifest(metadata.manifest);
            extItem.treeObject = {};
            if (instance.tableInfo) {
                extItem.treeObject = await instance.tableInfo(instance, id, options);
            }
        }

        return extItem;
    }

    /**
     * @param {string[]} ids 
     * @param {object} options 
     * @param {*} defaultClass 
     * @returns {Promise<Record<string, LevelClassI>>}
     */
    async getParentInstanceByIds(ids, options, defaultClass) {
        const metas = await this.getItems(ids);

        /** @type {Record<string, LevelClassI>} */
        const mapping = {};
        const result = metas.map(
            async (meta, index) => {
                mapping[ids[index]] = await this.getInstance(
                    { link: meta.class_id, value: ids[index] },
                    options,
                    defaultClass
                );
            }
        );

        await Promise.all(result);

        return mapping;
    }

    /**
     * @param {string} refId 
     * @param {object} [options]
     * @param {object} [defaultClass]
     * @return {Promise<LevelClassI>} options 
     */
    async getParentInstance(refId, options = {}, defaultClass) {
        const meta = await this.getItem(refId, options);        
        const result = meta ? await this.getInstance({ link: meta.class_id, value: refId }, options ? options : meta, defaultClass) : undefined;
        return result;
    }

    /**
     * @param {Ref} ref 
     * @param {object} options 
     * @param {any} [defaultClass]
     * @returns {Promise<LevelClassI>}
     */
    async getInstance(ref, options, defaultClass) {
        let result;
        if (typeof ref === 'object') {
            const ClassesMetadata = await this.getMetadataClass();
            const linkClass = ClassesMetadata[ref.link];
            const { value } = ref;
            if (typeof options === 'object') options.id = value;
            linkClass && (result = new linkClass(options));
        } else if (defaultClass) {
            if (typeof options === 'object') options.id = ref;
            result = new defaultClass(options);
        }
        return result;
    }

    async getMetadataClass() {
        const result = {};
        const ext = await this.getClassesMetadata();
        // return Object.fromEntries(Object.entries(ext).map(([key, val]) => [key, require(val)]))
        for (const classGuid in ext) {
            const classFile = ext[classGuid];
            const ext_class = require(classFile);
            result[classGuid] = ext_class;
        }

        return result;
    }

    async getMetadatasV3(options = {}) {
        const tree = await new MetaData().getCurrentInstance();
        tree.needToLoading = true;
        return tree;
    }

    async getMetadatasV2(options = {}) {
        const tree = await new MetaData().tree();
        tree.children = await this.getTreeChildrenV2(tree.id, options);

        // TODO убрать либо придумать как избавиться от этого флага
        tree.needToLoading = true;

        return tree;
    }

    /**
     * @deprecated
     * @param {object} options 
     * @returns 
     */
    async getMetadatas(options = {}) {
        const sessionStorage = httpContext.get('sessionStorage');
        // const memoryKey = `TreeMetadata_${sessionStorage.user.id}`;
        let tree;// = await MemorySave.get(memoryKey);
        // if (true) {
        const ext = await this.getClassesMetadata();
        tree = await new MetaData().tree();
        let children = [];
        for (const classGuid in ext) {
            const classFile = ext[classGuid];
            const ext_class = require(classFile);
            const extTree = new ext_class({ owner_id: classGuid }).tree(options);
            children.push(extTree);
        }
        children = await Promise.all(children);
        if (children.length > 0) {
            tree.children = children;
        }

        // await MemorySave.set(memoryKey, tree);
        // }
        return tree;
    }

    /**
     * @param {string} metadataId 
     * @param {number} markdel 
     * @returns 
     */
    async getMetadataChildren(metadataId, markdel = 0) {
        const metadataFamily = await this.MetadataModel.getMetadataWithFamily(metadataId);
        return metadataFamily?.descendants ?? [];
    }

    /**
     * @param {string} metadata_id
     * @param {object} options
     * @returns
     */
    async getTreeChildrenV3(metadata_id, options = {}) {
        const item = await this.MetadataModel.getItem(metadata_id, options);

        const [
            children,
            extModules
        ] = await Promise.all([
            item?.id === item?.class_id ? this.MetadataModel.getChild(metadata_id, options) : [],
            this.getClassesMetadata()
        ]);

        /**
         * проверяет что это не часть метаданных верхнего уровня
         */
        /** @type {boolean} */
        const isMetadataType = children.some((item) => item.id === item.class_id);

        /**
         * если это не метаднные верхнего уровня то вернем результат `item`
         */
        if (isMetadataType) {
            const promise = children.map(async (child) => {

                const instance = this.getClassInstance(extModules, child.class_id, child.owner_id);

                if (!instance) return;

                const instanceItem = await instance.item(child, options);

                instanceItem.crud = instance.props.crud;

                instanceItem.needToLoading = true;

                return instanceItem;
            });

            return (await Promise.all(promise)).filter(Boolean);
        }

        if (item?.id !== item?.class_id) {
            const instance = this.getClassInstance(extModules, item.class_id);

            const tree = await instance.subTree({ id: metadata_id }, options);

            return tree;
        }

        options.owner_id = metadata_id;
        const instance = await this.getParentInstance(metadata_id, options);

        const promise = children.map(async child => instance.item(child, options));

        return Promise.all(promise);
    }

    /**
     * @param {string} metadata_id
     * @param {object} options
     * @returns 
     */
    async getTreeChildrenV2(metadata_id, options = {}) {
        let items = []; //что-то должно вернуться

        let [
            children,
            extModules
        ] = await Promise.all([
            this.MetadataModel.getChild(metadata_id, options),
            this.getClassesMetadata()
        ]);

        /**
         * проверяет что это не часть метаданных верхнего уровня
         */
        /** @type {boolean} */
        children = children.filter((item) => extModules[item.class_id]);  // из-за того что в БД может быть объект по которому нет модуля, надо их почистить
        const isMetadataChild = children.some((item) => !extModules[item.class_id]);

        /**
         * если это не метаднные верхнего уровня то вернем результат `item`
         */
        if (isMetadataChild) {
            const metadata = await this.MetadataModel.getItem(metadata_id);
            const instance = this.getClassInstance(extModules, metadata.class_id);
            items = await instance.tree(metadata, options);
        }

        if (!isMetadataChild) {
            const promise = children.map(async child => {
                const instance = this.getClassInstance(extModules, child.class_id);
                return this.getItemOrTree(instance, child, options);
            });

            items = await Promise.all(promise);
        }

        return items;
    }

    /**
     * @deprecated
     * @param {string} metadata_id 
     * @returns 
     */
    async getTreeChildren(metadata_id, options = {}) {
        const sessionStorage = httpContext.get('sessionStorage');
        const memoryKey = `TreeMetadata_${sessionStorage.user.id}_${metadata_id}`;
        let item = await MemorySave.get(memoryKey);
        const metadata = await this.MetadataModel.getItem(metadata_id);
        // let item;
        if (!item && metadata) {
            const ext = await this.getClassesMetadata();
            const classFile = ext[metadata.class_id];
            const ext_class = require(classFile);
            const instance = new ext_class({ owner_id: metadata.class_id });
            item = await instance.item(metadata, options);

            await MemorySave.set(memoryKey, item);
        }
        return item;
    }

    /**
     * @param {object} metadata 
     * @param {Transaction} [transaction] 
     * @returns 
     */
    async setMetadata(metadata, transaction) {
        /** @type {{ owner_id: string}} */
        const { owner_id } = metadata;
        /** @type {{ class_id: string}} */
        const { class_id } = metadata;
        /** @type {string} */
        const class_name = metadata.class;
        /** @type {{ name: string}} */
        const { name } = metadata;
        /** @type {{ description: string}} */
        const { description } = metadata;

        const sanitizedName = this.sanitizedName(name || description);
        metadata.name = sanitizedName;
        metadata.description = description || name;

        await this.#checkOnDuplicates(class_id, owner_id, sanitizedName);

        return await this.MetadataModel.add(
            owner_id, // owner_id === '00000000-0000-0000-0000-000000000000' ? class_id : owner_id,
            class_id,
            class_name,
            sanitizedName,
            description,
            metadata,
            transaction
        );
    }

    /**
     * @param {string} id 
     * @param {object} metadata 
     * @param {Transaction | object} [options] 
     * @returns 
     */
    async updMetadata(id, manifest, options = {}) {
        const {
            name,
            description,
            class_id,
            owner_id: parent
        } = manifest;

        const sanitizedName = this.sanitizedName(name || description);
        manifest.name = sanitizedName;
        manifest.description = description || name;

        await this.#checkOnDuplicates(class_id, parent, sanitizedName, id);

        const result = await this.MetadataModel.upd(id, name, description, manifest, parent, options);
        if (!result) {
            throw ApiError.AccessRestricted('Нет прав для обновления записи');
        }

        return result[1][0];
    }

    /**
     * @param {string} id 
     * @param {object} [options] 
     * @returns 
     */
    async delMetadata(id, options) {
        const children = await this.MetadataModel.getChild(id, { transaction: options?.transaction });
        if (children && Array.isArray(children)) {
            const tmp = await Promise.all(
                children.map(child => this.delMetadata(child.id, options))
            );
        }
        return this.MetadataModel.del(id, options?.transaction);
    }

    /**
     * @param {string[]} id 
     * @param {any} options 
     * @returns 
     */
    async getItems(id, options) {
        const { markdel = 0, transaction, force = false } = options ?? {};
        const metadatas = await this.MetadataModel.get({ id }, { force, markdel, transaction });
        metadatas.forEach((metadata) => { metadata.manifest = parseManifest(metadata.manifest) });
        return metadatas;
    }

    /**
     * 
     * @param {string} id 
     * @param {{ markdel: 0 | 1 | [0, 1]; transaction?: Transaction, force?: boolean }} [options] 
     * @returns 
     */
    async getItem(id, options) {
        const { markdel = 0, transaction, force = false } = options ?? {};
        const metadata = await this.MetadataModel.getItem(id, { force, markdel, transaction });
        if (metadata) metadata.manifest = parseManifest(metadata.manifest);        
        return metadata;
    }

    /**
     * @param {string} class_id 
     * @param {string} parent 
     * @returns 
     */
    async getRanksByParent(class_id, parent) {
        const children = await this.MetadataModel.get({ class_id, parent });
        return children;
    }

    /**
     * 
     * @param {string} class_id 
     * @param {string} parent 
     * @param {any[]} ranks 
     * @returns 
     */
    async setRanks(class_id, parent, ranks) {
        const promiseUpdate = ranks.map((item, rank) => this.MetadataModel.updRank(item.id, rank));
        return Promise.all(promiseUpdate);
    }

    /**
     * @param {string} name 
     * @returns {string}
     */
    sanitizedName(name) {
        let sanitizedName = name;
        if (sanitizedName) {
            sanitizedName = sanitizedName.split(' ').map((word, index) => {
                if (!index) return word;

                return capitallize(word);
            }).join('').slice(0, 128); // TODO временное решение для ограничения количества символов в наименовании
        }

        return sanitizedName;
    }

    /**
     * @param {string} class_id 
     * @param {string} parent 
     * @param {string} name 
     * @param {string} [id] 
     * @returns {Promise<void>}
     */
    async #checkOnDuplicates(class_id, parent, name, id) {
        const item = await this.MetadataModel.getDuplicate(class_id, parent, name, id);

        if (item?.length > 0) {
            throw ApiError.AccessRestricted(`Объект с именем "${name}" уже существует`);
        }
    }

    /**
     * @param {Record<string, string>} ext 
     * @param {string} classId 
     * @param {string} parent 
     * @returns 
     */
    getClassInstance(ext, classId, parent) {
        const classFile = ext[classId];
        if (classFile) {
            const ext_class = require(classFile);
            return new ext_class({ owner_id: parent });
        }
    }

    /**
     * вытащим метаданные и если их нужно раскрыть вытащим вместе с деревом
     */
    async getItemOrTree(instance, metadata, options) {
        let item = await instance.item(metadata, options);
        /**
         * если стоит флаг о том что загрузка не нужна - значит нужно выдать все дерево
         */
        if (!item.needToLoading) {
            item = await instance.tree(metadata, options)
        }

        if (metadata.owner_id !== metadata.class_id) {
            item.crud = instance.props.crud;
        }

        return item;
    }
}

module.exports = MetadataService;
