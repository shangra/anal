const webpack = require('webpack');
const pathsCRA = require('react-scripts/config/paths');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
// eslint-disable-next-line import/no-unresolved
const { FederatedTypesPlugin: ModuleFederationTypesPlugin } = require('@module-federation/typescript');

const pkg = require('./package.json');

// Анализатор бандла - подключается только через npm script 'build:analyze'
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { removePlugins, pluginByName, getLoader, loaderByName } = require('@craco/craco');
const { processModuleExportComponentsConfig } = require('./scripts/helpers/moduleFederationConfigProcessor');
const path = require('path');

const UI_KIT_ROOT = path.resolve(__dirname, '../../ui-kit');
const UI_KIT_DEBUG = process.env.UI_KIT_DEBUG === 'true' && process.env.NODE_ENV === 'development';

if (UI_KIT_DEBUG) {
    console.log('UI_KIT_DEBUG', 'enabled');
}

const MODULE_FEDERATION_HOST_CONTAINER_NAME = 'BI_UI_COMPONENTS';
/**
 *  @type {import('./scripts/helpers/moduleFederationConfigProcessor/types').ModuleFederationComponentType[]}
 */
const MODULE_FEDERATION_EXPORT_COMPONENTS = [
    {
        dir: 'AdapterSpreadSheet',
    },
    {
        dir: 'SpreadSheetPlugins',
        recursive: true,
        includeCurrentDir: false,
    },
    {
        dir: 'SpreadSheetTables',
        recursive: true,
        includeCurrentDir: false,
    },
    {
        dir: 'TableAdapters',
        recursive: true,
        includeCurrentDir: false,
    },
];

// eslint-disable-next-line arrow-body-style
const ModuleFederationConfigFactory = (options) => {
    return {
        name: MODULE_FEDERATION_HOST_CONTAINER_NAME,
        exposes: processModuleExportComponentsConfig(MODULE_FEDERATION_EXPORT_COMPONENTS),
        remotes: {},
        filename: 'remoteEntry.js',
        shared: {
            react: {
                singleton: true,
                requiredVersion: pkg.dependencies.react,
            },
            'react-dom': {
                singleton: true,
                requiredVersion: pkg.dependencies['react-dom'],
            },
            'react-router-dom': {
                singleton: true,
                requiredVersion: pkg.dependencies['react-router-dom'],
            },
            'lite-react-statemanager': {
                singleton: true,
                requiredVersion: pkg.dependencies['lite-react-statemanager'],
            },
        },
    };
};

module.exports = {
    webpack: {
        alias: {
            // В dev-режиме — указываем на исходники ui-kit
            // В prod — оставляем резолюцию на tgz-пакет
            ...(UI_KIT_DEBUG && {
                // CSS берём из dist — они генерируются только при сборке
                'ui-kit/style.css': path.resolve(UI_KIT_ROOT, 'dist/style.css'),
                'ui-kit/theme.css': path.resolve(UI_KIT_ROOT, 'dist/theme.css'),
                // JS-исходники берём напрямую из src
                'ui-kit': path.resolve(UI_KIT_ROOT, 'src'),
            }),
        },
        configure: (webpackConfig, { env, paths }) => {
            // eslint-disable-next-line global-require
            require('./scripts/dotenv');

            // Подключаем анализатор бандла для графического отображения составляющих бандла
            if (process.argv.includes('--analyze-only')) {
                webpackConfig.plugins.push(new BundleAnalyzerPlugin());
            }

            removePlugins(webpackConfig.resolve, pluginByName('ModuleScopePlugin'));

            const babelLoader = getLoader(webpackConfig, loaderByName('babel-loader')).match.loader;
            babelLoader.options.presets.push(['@babel/preset-typescript', { allowDeclareFields: true }]);

            if (UI_KIT_DEBUG) {
                webpackConfig.module.rules.forEach((rule) => {
                    if (rule.oneOf) {
                        rule.oneOf.forEach((loader) => {
                            if (loader.loader?.includes('babel-loader') && loader.include) {
                                loader.include = [loader.include, path.resolve(UI_KIT_ROOT, 'src')].flat();
                            }
                        });
                    }
                });
            }

            // для корректной работы module federation нужен auto чтобы запрашивать зависимости
            // подгружаемого скрипта с того же источника (хост + порт), откуда происходит загрузка исходного скрипта
            webpackConfig.output.publicPath = 'auto';

            // Настройка имён выходных файлов с contenthash
            if (env === 'production') {
                // JS-файлы
                webpackConfig.output.filename = 'static/js/[name].[contenthash:8].js';
                webpackConfig.output.chunkFilename = 'static/js/[name].[contenthash:8].chunk.js';
            } else {
                // В режиме разработки имена без хеша для быстрой сборки и HMR
                webpackConfig.output.filename = 'static/js/[name].js';
                webpackConfig.output.chunkFilename = 'static/js/[name].chunk.js';
            }

            // Настройка CSS (MiniCssExtractPlugin)
            const miniCssPlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === 'MiniCssExtractPlugin');
            if (miniCssPlugin) {
                if (env === 'production') {
                    miniCssPlugin.options.filename = 'static/css/[name].[contenthash:8].css';
                    miniCssPlugin.options.chunkFilename = 'static/css/[name].[contenthash:8].chunk.css';
                } else {
                    miniCssPlugin.options.filename = 'static/css/[name].css';
                    miniCssPlugin.options.chunkFilename = 'static/css/[name].chunk.css';
                }
            }

            webpackConfig.devtool = env === 'development' ? 'eval-source-map' : false;

            webpackConfig.output.devtoolModuleFilenameTemplate = (info) =>
                `file:///${info.absoluteResourcePath.replace(/\\/g, '/')}`;

            webpackConfig.output.devtoolFallbackModuleFilenameTemplate = (info) =>
                `file:///${info.absoluteResourcePath.replace(/\\/g, '/')}?${info.hash}`;

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

            const miniCss = webpackConfig.plugins.find((plugin) => plugin.constructor.name === 'MiniCssExtractPlugin');

            // TODO: Этого быть не должно. Разобраться.
            if (miniCss) {
                miniCss.options.ignoreOrder = true;
            }

            return {
                ...webpackConfig,
                resolve: {
                    ...webpackConfig.resolve,
                    alias: {
                        ...webpackConfig.resolve.alias,
                        // В dev-режиме — указываем на исходники ui-kit
                        // В prod — оставляем резолюцию на tgz-пакет
                        ...(UI_KIT_DEBUG && {
                            // CSS берём из dist — они генерируются только при сборке
                            'ui-kit/style.css': path.resolve(UI_KIT_ROOT, 'dist/style.css'),
                            'ui-kit/theme.css': path.resolve(UI_KIT_ROOT, 'dist/theme.css'),
                            // JS-исходники берём напрямую из src
                            'ui-kit': path.resolve(UI_KIT_ROOT, 'src'),
                        }),
                    },
                    fallback: {
                        path: require.resolve('path-browserify'),
                        crypto: require.resolve('crypto-browserify'),
                        stream: require.resolve('stream-browserify'),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
        const protocol = devServerConfig.https ? 'https' : 'http';
        return {
            ...devServerConfig,
            // Чтобы убрать deprecated warnings
            onBeforeSetupMiddleware: undefined,
            onAfterSetupMiddleware: undefined,
            // Порт и хост явно — удобно при работе с несколькими remotes
            port: process.env.PORT || 3503,
            host: '0.0.0.0', // доступен по локальному IP, нужно для отладки с других устройств
            // Клиентский overlay: показывает ошибки и предупреждения прямо в браузере
            client: {
                overlay: {
                    errors: true,
                    warnings: false, // warnings в overlay обычно шумят
                },
                // Логирование в консоль браузера
                logging: 'info',
                // Прогресс сборки в браузере
                progress: true,
            },
            // HMR — явное включение (CRA включает по умолчанию, но лучше зафиксировать)
            hot: true,
            liveReload: false, // при hot: true liveReload избыточен
            headers: {
                ...devServerConfig.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
                // 'set-cookie':
                //     'SID=s%DEVELOPED_REACT_PROJECT_FOR_SBER--.NotSecure; Path=/; Expires=Fri, 01 Oct 2050 12:23:45 GMT; HttpOnly',
            },
            // Watchman / polling — если файловая система не поддерживает inotify (WSL, Docker, сетевые диски)
            watchFiles: {
                options: {
                    usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
                    interval: 1000,
                },
            },
            proxy: {
                '/api': {
                    target: `${protocol}://${process.env.ESB_HOST || 'localhost:3001'}`,
                    pathRewrite: { '^/api': '' },
                    logLevel: 'debug',
                    changeOrigin: true,
                    // Если бэкенд на самоподписном сертификате
                    secure: false,
                    headers: {
                        referer: `${protocol}://${process.env.REFERER || `localhost:${process.env.PORT}`}/`,
                    },
                },
            },
        };
    },
};
