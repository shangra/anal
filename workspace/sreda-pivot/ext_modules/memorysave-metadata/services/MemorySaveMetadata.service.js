const Extensions = require('../../../core/class/Extensions.class');
const httpContext = require('../../../core/services/http-context');
const MemorySave = require('../../../core/services/memory-save');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const InfoservicesClass = require('../../metadata-infoservice/services/metadata/Infoservice.class');
const GlobalService = require('../../../core/services/Global.service');
const { hash } = require('../../utils/services');
const { ref_extract } = require('../../metadata-cmp/util');

const Metadata = new MetadataClass();

class MemorySaveMetadataService extends Extensions {
    PREFIX = 'read';

    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;

        innerResult.buttons ||= [];
        innerResult.buttons.push({
            name: 'MetaCached',
            component: 'MetaCached',
            props: {
                type: 'cached',
                id: id,
                icon: 'bi bi-fire',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/cachedmetadata/${id}`,
                title: 'Очистить кеш объекта',
            },
        });

        return innerResult;
    }

    async withRefsFormAfter(innerResult, functionInput) {
        const { id } = functionInput;

        innerResult.buttons ||= [];
        innerResult.buttons.push({
            name: 'MetaCached',
            component: 'MetaCached',
            props: {
                type: 'cached',
                id: id,
                icon: 'bi bi-fire',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/cachedmetadata/${id}/withRefs`,
                title: 'Очистить кеш объекта',
            },
        });

        return innerResult;
    }

    /**
     * @todo Перегрузить в cached-ext-helpers
     * @returns {Promise<string>}
     */
    async getUserRoles() {
        return null;
    }

    async isCacheEnabled() {
        return true && !sreda.env.DISABLE_DATA_CACHE && !sreda.env.DISABLE_OVERRITE_CACHE;
    }

    async read(innerResult, functionParams, originalMethod) {
        const { id, inputOptions } = functionParams;

        const key = this.generateReadKey(inputOptions, [id]);

        return this.getData(originalMethod, key, [id, inputOptions]);
    }

    /**
     * @param {string} key
     */
    async getCache(key) {
        const isEnabled = await this.isCacheEnabled();
        if (!isEnabled && null == httpContext.get('explain')) {
            // ...и не активен профилировщик;
            return null;
        }

        return MemorySave.get(key);
    }

    async memorySaveMetadata(id) {
        await MemorySave.del(new RegExp(id));

        return { result: true };
    }

    async clearCacheMetadataByBodyWithRefs({ id, body }, options = {}) {
        const { force = false } = options;

        const userid = await this.getUserRoles();

        const links = await this.getChildIds(id, { force });

        [
            this.generateReadKey({ id, body, type: 'PivotTable' }, [id]),
            this.generateReadKey({ id, body, type: 'report' }, [id]),
            ...links,
        ].forEach((link) => MemorySave.del(new RegExp(link)));

        return { result: true };
    }

    async memorySaveMetadataWithRefs(id, options = {}) {
        const { force = false } = options;

        const ids = await this.getChildIds(id, { force });
        const links = [id, ...ids];

        for (const link of links) {
            const result = await MemorySave.del(new RegExp(link));
            console.log(`result for deleting cache for link ${link} - ${result}`);
        }
        return { result: true };
    }

    async getChildIds(id, options) {
        const { force = false } = options;

        const meta = await Metadata.getParentInstance(id, { force });
        const info = await meta.tableInfo(meta, id, { force });

        const Infoservices = new Set();
        const Refs = new Set();
        for (const Infoservice of Object.values(info.Infoservices)) {
            const { value: iref } = ref_extract(Infoservice?.ref);
            if (!iref) continue;

            Infoservices.add(iref);

            const meta = new InfoservicesClass({ id: iref });
            const info = await meta.tableInfo(meta, iref, { force });

            for (const Field of Object.values(info.AllFields ?? {})) {
                const { value: fref } = ref_extract(Field?.ref);
                if (!fref) continue;
                Refs.add(fref);
            }
        }

        return [...Infoservices, ...Refs];
    }

    async getDataDecorate(innerResult, functionParams, originalMethod) {
        const { connector, from, options, id } = functionParams;

        const volNames = (from.volatileOptions || []).map((i) => i.name).sort();
        const withNames = (from.withOptions || []).map((i) => i.name).sort();

        const settings = options.settings;

        const aggFuncs = Object.entries(settings.aggFuncs || {}).map(
            ([key, value]) => `${key}_____${value.name}`
        );

        const hashData = {
            id,

            withNames,
            volNames,

            attributes: [...settings.index, ...settings.columns, ...aggFuncs],
            aggfunc: options?.settings?.aggfunc || {},

            index: options?.settings?.index || [],
            columns: options?.settings?.columns || [],

            where: settings?.where || options.where || {},
            maskWhere: settings?.maskWhere || options.maskWhere || {},
            systemWhere: settings?.systemWhere || options.systemWhere || {},
            metaAccessWhere: settings?.metaAccessWhere || options.metaAccessWhere || {},

            totals: settings.totals || {},

            order: options.withOutOrder ? options.order : [],

            limit: options.limit,
            offset: options.offset,

            isReport: settings.isReport,
        };

        return this.getData(originalMethod, `${this.PREFIX}:${id}_${hash(hashData)}`, [
            connector,
            from,
            id,
            options,
        ]);
    }

    async countDataDecorate(innerResult, functionParams, originalMethod) {
        const { connector, from, options, id } = functionParams;

        const key = this.generateReadKey(from, [id]);

        return this.getData(originalMethod, key, [connector, from, options, id]);
    }

    /**
     * @private
     *
     * получить данные либо записать их но если размер объекта превышает определенный лимит не записывать данные
     *
     * @param {Function} originalMethod
     * @param {string} key
     * @param {any[]} params
     */
    async getData(originalMethod, key, params) {
        const applicationCache = await this.getCache(key);
        if (applicationCache) {
            console.log(`MemorySaveMetadataService: Get cache key ${key}`);

            return applicationCache;
        }

        return originalMethod.apply(this, params).then(async (i) => {
            const isEnabled = await this.isCacheEnabled();
            if (isEnabled) {
                console.log(`MemorySaveMetadataService: Set cache key ${key}`);

                await MemorySave.set(key, i);
            }

            return i;
        });
    }

    /**
     * @param {object} diffPart
     * @param {string[]} staticPart
     * @returns {string}
     */
    generateReadKey(diffPart, staticPart) {
        const keyBuilder = GlobalService.md5(JSON.stringify(diffPart || {}));
        const key = [...staticPart, keyBuilder].join('_');
        return `${this.PREFIX}:${key}`;
    }
}

module.exports = MemorySaveMetadataService;
