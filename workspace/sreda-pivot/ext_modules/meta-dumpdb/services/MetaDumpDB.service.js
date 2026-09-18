const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();
const DumpDBService = require('../../dump-cms/services/DumpDB.service');
const { isEmptyObject } = require('../../utils/services');

class metaDumpDBService extends Extensions {
    async formAfterWithRefs(innerResult, functionInput) {
        const { id } = functionInput;

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }

        innerResult.buttons.push(this.getButton(id, true));

        return innerResult;
    }

    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }

        innerResult.buttons.push(this.getButton(id));

        return innerResult;
    }

    /**
     * @param {string} id
     * @param {boolean} withRef
     * @returns
     */
    getButton(id, withRef = false) {
        return {
            name: 'MetaDumpDB',
            component: 'MetaDumpDB',
            props: {
                type: 'dump',
                id: id,
                withRef,
                icon: 'bi bi-box-arrow-up',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metadumpdb/dumpdb/${id}`,
                title: 'Выгрузить объект метаданных',
            },
        };
    }

    async getMetaList(metaTree) {
        let result = [metaTree.id];
        if (metaTree.children) {
            for (const child of metaTree.children) {
                const allChildIds = await this.getMetaList(child);
                result = [...result, ...allChildIds];
            }
        }
        return result;
    }

    async getMetadataWithRefs(parent, map = {}) {
        if (!parent) return {};

        map[parent] = true;

        const options = {};
        if (sreda.env.CUBES_FORCE_DUMP) {
            options.force = true;
        }

        const children = await Metadata.getMetadataByOptions({ where: { parent } }, options);

        const refIds = [];
        const additionalIds = {};

        children.forEach((child) => {
            map[child.id] = true;

            refIds.push(child.id);

            const manifest = child.manifest ? JSON.parse(child.manifest) : {};
            const key =
                manifest.settings.ref?.value || manifest.settings.ref?.key || manifest.settings.ref;

            if (key == '0' || map[key]) return;

            if (child.class === 'Infoservices' && key && key !== parent) {
                console.log(`Нашли иерархию в поле name:${child.name} id:${key}`);

                refIds.push(key);

                additionalIds[child.class_id] ||= [];
                additionalIds[child.class_id].push(key);
            }

            if (child.class === 'Fields' && key && key !== parent) {
                console.log(`Нашли реф в поле name:${child.name} id:${key}`);

                refIds.push(key);
            }
        });

        await Promise.all(refIds.map(async (id) => this.getMetadataWithRefs(id, map)));

        let additional = [];
        if (!isEmptyObject(additionalIds)) {
            additional = await this.getAdditionalRefs(additionalIds);
        }

        [parent, ...additional].forEach((ref) => (map[ref] = true));

        return map;
    }

    async getAdditionalRefs(mapping) {
        return [];
    }

    /**
     *
     * @param {string} id
     */
    async dumpWithRefs(id) {
        const mapping = await this.getMetadataWithRefs(id);
        const allIDs = Object.keys(mapping);
        const Params = {
            table: 'Metadata',
            where: { id: allIDs },
            withRls: true,
        };
        const result = await DumpDBService.Dump(Params);

        return result;
    }

    /**
     * @param {string} id
     * @returns
     */
    async dumpdb(id) {
        const mData = await Metadata.getMetadata(id, {});
        const allIDs = await this.getMetaList(mData);
        const Params = {
            table: 'Metadata',
            where: { id: allIDs },
        };
        const result = await DumpDBService.Dump(Params);

        return result;
    }
}

module.exports = metaDumpDBService;
