const ApiError = require('../../../core/exceptions/ApiError');
const { dateBeetwen, getDatesFromPeriod } = require('../utils/period');
const { hash, stableStringify } = require('../utils/hash');
// const crypto = require('crypto');
const httpContext = require('../../../core/services/http-context');

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

class Application {
    General = {
        Period: {
            dateBeetwen: dateBeetwen,
            getDatesFromPeriod: getDatesFromPeriod,
        },
        User: () => {
            //По хорошему, тут нужно обратиться к модулю Auth и получить от туда информацию по пользователю
            const sessionStorage = httpContext.get('sessionStorage');
            return sessionStorage?.user ?? {};
        },
        Hash: hash,
        StableStringify: stableStringify,
    };

    ChartAccounts = {
        // GetById: async (chartAccountsId, id) => {
        //     const ChartAccountsClass = require('../../metadata-chart-accounts/services/metadata/ChartAccounts.class');
        //     const ChartAccounts = new ChartAccountsClass();
        //     return ChartAccounts.read(chartAccountsId, {
        //         where: { id },
        //         withHierarchy: false,
        //         withOutRefs: true,
        //         withTabularParts: false,
        //         withOutCount: true,
        //     });
        // },

        // GetByValues: async (chartAccountsId, where, options = {}) => {
        //     const ChartAccountsClass = require('../../metadata-chart-accounts/services/metadata/ChartAccounts.class');
        //     const ChartAccounts = new ChartAccountsClass();
        //     const { parent } = options;

        //     const whereOptions = structuredClone(where);
        //     if (parent) whereOptions.parent = parent;

        //     const result = await ChartAccounts.read(chartAccountsId, {
        //         where: whereOptions,
        //         withHierarchy: false,
        //         withOutRefs: true,
        //         withTabularParts: false,
        //         withOutCount: true,
        //         limit: 1,
        //     });

        //     return result?.rows?.[0] ?? null;
        // },
    };

    RegistryInformation = {
        //Срез
        Cross: async (params) => {
            const __DELClass = wrapper(
                '../../metadata-registry-information/services/__DEL.service'
            );
            const __DEL = new __DELClass();
            const result = await __DEL.cross(params);
            return result;
        },

        Get: async (params) => {
            const __DELClass = wrapper(
                '../../metadata-registry-information/services/__DEL.service'
            );
            const __DEL = new __DELClass();
            const result = await __DEL.get(params);
            return result;
        },

        // GetByValues: async (id, where, options) => {
        //     // const RegistryInformation = await Metadata.getInstance({
        //     //     link: '5e9ef230-6c6a-4544-9d0d-73d23007551e',
        //     //     value: id
        //     // }, {});
        //     const RegistryInformationClass = require('../../metadata-registry-information/services/metadata/RegistryInformation.class');
        //     const RegistryInformation = new RegistryInformationClass();

        //     const result = await RegistryInformation.read(id, where, options);

        //     return result.rows;
        // },
    };

    RegistryAccumulative = {
        Get: async (regId, where, options) => {
            const RegistryAccumulative = await Metadata.getInstance(
                {
                    link: '5a9615da-8313-4dba-871c-d8ced7d0f46d',
                    value: regId,
                },
                {}
            );

            const result = await RegistryAccumulative.read(regId, where, options);

            return result;
        },

        GetRemains: async (regId, options, remainsOption) => {
            // const RegistryAccumulative = await Metadata.getParentInstance(regId);
            const RegistryAccumulative = await Metadata.getInstance(
                {
                    link: '5a9615da-8313-4dba-871c-d8ced7d0f46d',
                    value: regId,
                },
                {}
            );

            const result = await RegistryAccumulative.read(regId, {
                ...options,
                remains: remainsOption,
            });

            return result;
        },
    };

    Guide = {
        GetById: async (guideId, id) => {
            const GuideClass = require('../../metadata-guide/services/metadata/Guide.class');
            const Guide = new GuideClass();

            const result = await Guide.read(guideId, {
                where: { id: id },
                withHierarchy: false,
                withOutRefs: true,
                withTabularParts: true,
                withOutCount: true,
                limit: 1,
            });

            return result.rows?.[0] ?? null;
        },

        GetByValues: async (guideId, where, options = {}) => {
            const GuideClass = require('../../metadata-guide/services/metadata/Guide.class');
            const Guide = new GuideClass();
            const { parent } = options;

            const whereOptions = structuredClone(where);
            if (parent) whereOptions.parent = parent;

            const result = await Guide.read(guideId, {
                where: whereOptions,
                withHierarchy: false,
                withOutRefs: true,
                withTabularParts: false,
                withOutCount: true,
                limit: 1,
            });

            return result.rows?.[0] ?? null;
        },

        // Нужно чтобы возвращался указатель и с указателем работать
        List: async (guideId, where, options = {}) => {
            const GuideClass = require('../../metadata-guide/services/metadata/Guide.class');
            const Guide = new GuideClass();

            const whereOptions = structuredClone(where);

            const result = await Guide.read(guideId, {
                where: whereOptions,

                withHierarchy: options.withHierarchy ?? false,
                withOutRefs: options.withOutRefs ?? true,
                withTabularParts: options.withTabularParts ?? false,
                withOutCount: options.withOutCount ?? true,
            });

            return result.rows ?? null;
        },
    };

    Documents = {
        GetById: async (docId, id) => {
            const Documents = await Metadata.getParentInstance(docId);

            const result = await Documents.read(docId, {
                where: { id: id },
                withHierarchy: false,
                withOutRefs: true,
                withTabularParts: true,
                withOutCount: true,
                limit: 1,
            });

            return result.rows?.[0] ?? null;
        },

        GetByValues: async (documentId, where, options = {}) => {
            const Documents = await Metadata.getInstance(
                {
                    link: '5e9ef230-6c6a-4544-9d0d-73d23007551e',
                    value: documentId,
                },
                {}
            );

            const result = await Documents.read(documentId, {
                where: where,
                withOutRefs: true,
                withTabularParts: false,
                withOutCount: true,
                limit: 1,
            });

            return result.rows?.[0] ?? null;
        },

        // Нужно чтобы возвращался указатель и с указателем работать
        List: async (documentId, where, options = {}) => {
            const Documents = await Metadata.getInstance(
                {
                    link: '5e9ef230-6c6a-4544-9d0d-73d23007551e',
                    value: documentId,
                },
                {}
            );

            const result = await Documents.read(documentId, {
                where: where,
                order: options.order ?? undefined,
                group: options.group ?? undefined,
                withOutRefs: options.withOutRefs ?? true,
                withTabularParts: options.withTabularParts ?? false,
                withOutCount: options.withOutCount ?? true,
            });

            return result.rows ?? null;
        },
    };

    Metadata = {
        GetByValues: async (where) => {
            const meta = await Metadata.getMetadataByOptions({
                where,
                limit: 1,
            });

            return meta?.[0] || null;
        },
    };
}

module.exports = Application;
