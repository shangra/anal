require('dotenv').config();
require('dotenv').config({ path: '.env', override: true });

const webpack = require('webpack');
const pathsCRA = require('react-scripts/config/paths');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
// eslint-disable-next-line import/no-unresolved
const { FederatedTypesPlugin: ModuleFederationTypesPlugin } = require('@module-federation/typescript');
const path = require('path');

const pkg = require('./package.json');

// Анализатор бандла - подключается только через npm script 'build:analyze'
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { removePlugins, pluginByName } = require('@craco/craco');
const { processModuleExportComponentsConfig } = require('./scripts/helpers/moduleFederationConfigProcessor');

const MODULE_FEDERATION_HOST_CONTAINER_NAME = process.env.MODULE_FEDERATION_CONTAINER_NAME ?? 'ADMINPANEL_UI_COMPONENTS';


// В коробке flow-frontend обычно нет — без stub падает весь host (shared/react init).
const FLOW_REMOTE_URL = process.env.REACT_APP_FLOW_REMOTE_URL || '';
const USE_FLOW_REMOTE = Boolean(FLOW_REMOTE_URL) && FLOW_REMOTE_URL !== 'off';
const FLOW_REMOTE_STUB =
    'promise new Promise((resolve)=>{resolve({get:()=>Promise.resolve(()=>({__esModule:true,default:function FlowdemoRemoteStub(){return null;}})),init:()=>undefined})})';

/**
 *  @type {import('./scripts/helpers/moduleFederationConfigProcessor/types').ModuleFederationComponentType[]}
 */
const MODULE_FEDERATION_EXPORT_COMPONENTS = [
    {
        dir: 'MetadataHier',
    },
    {
        dir: 'MetadataWindow',
    },
    {
        dir: 'Inspector',
    },
    {
        dir: 'InspectorWindow',
    },
    {
        dir: 'AccessMatrixDrawer',
    },
    {
        dir: 'FlowdemoWindow',
    },
];

// eslint-disable-next-line arrow-body-style
const ModuleFederationConfigFactory = (options) => {
    return {
        name: MODULE_FEDERATION_HOST_CONTAINER_NAME,
        exposes: processModuleExportComponentsConfig(MODULE_FEDERATION_EXPORT_COMPONENTS),
        remotes: {
            flowdemoRemote: USE_FLOW_REMOTE
                ? `flowdemoRemote@${FLOW_REMOTE_URL}`
                : FLOW_REMOTE_STUB,
        },
        filename: 'remoteEntry.js',
        // shared ограничен react/react-dom. ui-kit, lite-react-statemanager и
        // helpers/axios НЕ шарим — их нет в зависимостях remote, и общий scope
        // только создаст ложную связанность.
        shared: {
            react: {
                singleton: true,
                requiredVersion: pkg.dependencies.react,
                eager: false,
            },
            'react-dom': {
                singleton: true,
                requiredVersion: pkg.dependencies['react-dom'],
                eager: false,
            },
        },
    };
};

module.exports = {
    webpack: {
        configure: (webpackConfig, { env, paths }) => {
            // eslint-disable-next-line global-require
            require('./scripts/dotenv');
            require('./scripts/buildSourceForTemplates');

            webpackConfig.devtool = env === 'development' ? 'eval-source-map' : 'source-map';

            // Подключаем анализатор бандла для графического отображения составляющих бандла
            if (process.argv.includes('--analyze-only')) {
                webpackConfig.plugins.push(new BundleAnalyzerPlugin());
            }

            removePlugins(webpackConfig.resolve, pluginByName('ModuleScopePlugin'));

            // для корректной работы module federation нужен auto чтобы запрашивать зависимости
            // подгружаемого скрипта с того же источника (хост + порт), откуда происходит загрузка исходного скрипта
            webpackConfig.output.publicPath = 'auto';

            // runtimeChunk: false обязательно для корректной работы module federation —
            // иначе shared-зависимости резолвятся из отдельного чанка, который remote
            // не видит, и падает «Shared module is not available for eager consumption».
            webpackConfig.optimization = {
                ...(webpackConfig.optimization || {}),
                runtimeChunk: false,
            };

            const htmlWebpackPlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === 'HtmlWebpackPlugin');
            htmlWebpackPlugin.userOptions = {
                ...htmlWebpackPlugin.userOptions,
                publicPath: pathsCRA.publicUrlOrPath,
                excludeChunks: [MODULE_FEDERATION_HOST_CONTAINER_NAME],
            };

            // Возможно включение расширенного логирования сборки, но логи будут падать в консоль host app от компонентов remote app
            // Если установить log или warnings - все варнинги при сборке от eslint будут лететь в консоль host app
            if (process.argv.includes('--debug')) {
                webpackConfig.infrastructureLogging = {
                    level: 'log',
                };
            }

            // Отключение логирования варнингов и ошибок Eslint
            removePlugins(webpackConfig, pluginByName('ESLintWebpackPlugin'));

            return {
                ...webpackConfig,
                resolve: {
                    ...webpackConfig.resolve,
                    fallback: {
                        path: require.resolve('path-browserify'),
                        crypto: require.resolve('crypto-browserify'),
                        stream: require.resolve('stream-browserify'),
                    },
                    alias: {
                        helpers: path.resolve(__dirname, 'src/helpers'),
                        components: path.resolve(__dirname, 'src/components'),
                        ui: path.resolve(__dirname, 'src/components/ui'),
                    },
                },
                plugins: [
                    ...webpackConfig.plugins,
                    new NodePolyfillPlugin(),
                    new webpack.ProvidePlugin({
                        process: 'process',
                    }),
                    new webpack.ProvidePlugin({
                        Buffer: ['buffer', 'Buffer'],
                    }),
                    new ModuleFederationTypesPlugin({
                        typescriptFolderName: '@mf-types',
                        federationConfig: ModuleFederationConfigFactory(),
                        typeFetchOptions: {
                            /** The maximum time to wait for downloading remote types in milliseconds. */
                            downloadRemoteTypesTimeout: 2000,
                            /** The maximum number of retry attempts. */
                            maxRetryAttempts: 2,
                            /** The default number of milliseconds between retries. */
                            retryDelay: 1000,
                            /** Should retry if no types are found in destination. This could be due to another instance still compiling. */
                            shouldRetryOnTypesNotFound: false,
                            /** Should retry type fetching operations. */
                            shouldRetry: true,
                        },
                        typeServeOptions: {
                            /** The port to serve type files on, this is separate from the webpack dev server port. */
                            port: Number(process.env.MF_TYPES_PORT) || 31000,
                            /** The host to serve type files on. Example: 'localhost' */
                            host: 'localhost',
                        },
                    }),
                    new ModuleFederationPlugin(ModuleFederationConfigFactory()),
                ],
            };
        },
    },
    jest: {
        configure: (c) => {
            // Все пакеты из экосистемы bpmn-js, которые надо пропустить через babel-jest
            const esModules = [
                'lite-react-statemanager',
                'axios',
                'bpmn-js',
                '@bpmn-io',
                'diagram-js',
                'diagram-js-ui',
                'diagram-js-direct-editing',
                'vfile',
                'dmn-js-shared',
                'react-markdown',
                'vfile-message',
                'min-dash',
                'min-dom',
                'tiny-svg',
                'ids',
                'moddle',
                'moddle-xml',
                'object-refs',
                'bpmn-js/lib/features/context-pad/ContextPadProvider',
                'path-intersection',
            ].join('|');

            // Разрешаем трансформ для всех файлов, включая .ts, .tsx, .js, .jsx, .mjs
            c.transform = {
                '^.+\\.(m|t|j)sx?$': 'babel-jest',
            };

            // Не игнорируем перечисленные пакеты внутри node_modules (включая их подпапки)
            c.transformIgnorePatterns = [`/node_modules/(?!(?:${esModules})(?:/|$))`];

            // Моки для стилей и ассетов, которые импортирует diagram-js/bpmn-js
            c.moduleNameMapper = {
                ...(c.moduleNameMapper || {}),
                '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
                '\\.(svg|png|jpg|jpeg|gif|webp)$': '<rootDir>/__mocks__/fileMock.js',
            };

            // На всякий случай явно jsdom
            c.testEnvironment = 'jsdom';

            // Настройки coverage репорта
            c.collectCoverageFrom = [
                'src/**/*.{js,jsx,ts,tsx}',
                '!src/**/*.d.ts',

                // Исключаем файлы непосредственно в папке src
                '!src/*.{js,jsx,ts,tsx}',

                // Исключаем все type-related файлы
                '!src/**/*.d.ts',
                '!src/**/*.types.ts',
                '!src/**/*.type.ts',
                '!src/**/types.ts',
                '!src/**/types/**/*.ts',
                '!src/**/typings/**/*.ts',
                '!src/**/@types/**/*.ts',
                '!src/**/interfaces.ts',
                '!src/**/interface.ts',
                '!src/**/I*.ts', // файлы начинающиеся с I (IUser...)
                '!src/**/*.interface.ts',

                // Исключаем ненужные компоненты из coverage
                '!src/components/MetadataGuideList/**/*',
                '!src/components/ui/**/*',
                '!src/components/UIKit/**/*',
                '!src/components/UiKitIcons/**/*',
                '!src/components/Utils/**/*',
            ];

            // Позволим Jest резолвить .mjs и другие расширения
            c.moduleFileExtensions = Array.from(
                new Set([...(c.moduleFileExtensions || []), 'mjs', 'js', 'jsx', 'ts', 'tsx', 'json']),
            );

            return c;
        },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
        const protocol = devServerConfig.https ? 'https' : 'http';
        return {
            ...devServerConfig,
            // Чтобы убрать deprecated warnings
            onBeforeSetupMiddleware: undefined,
            onAfterSetupMiddleware: undefined,
            headers: {
                ...devServerConfig.headers,
                'set-cookie':
                    'SID=s%DEVELOPED_REACT_PROJECT_FOR_SBER--.NotSecure; Path=/; Expires=Fri, 01 Oct 2050 12:23:45 GMT; HttpOnly',
            },
            proxy: {
                '/api': {
                    target: `${protocol}://${process.env.ESB_HOST || 'localhost:3001'}`,
                    pathRewrite: { '^/api': '' },
                    changeOrigin: true,
                    headers: {
                        referer: `${protocol}://${process.env.REFERER || `localhost:${process.env.PORT}`}/`
                    }
                },
            },
        };
    },
};
