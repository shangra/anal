const { scanDir } = require('../scanDir');

const COMPONENTS_PATH = 'src/components';

/**
 * Returns processed config for Module Federation components build.
 * @param {import('./types').ModuleFederationComponentType[]} config - Необработанный конфиг Module Federation
 */
function processModuleExportComponentsConfig(config) {
    /**
     * @type {object}
     */
    const moduleFederationConfig = {};

    config.forEach((configItem) => {
        const currentScanDir = `${COMPONENTS_PATH}/${configItem.dir}`;
        let dirList = configItem.includeCurrentDir === false ? [] : [currentScanDir];
        if (configItem.recursive) {
            dirList = [...dirList, ...scanDir(currentScanDir)];
        }

        dirList
            .filter((dirPath) => (configItem.excludePattern ? !dirPath.match(configItem.excludePattern) : true))
            .forEach((componentDir) => {
                moduleFederationConfig[`./${componentDir.split('/').at(-1)}`] = `./${componentDir}`;
            });
    });

    return moduleFederationConfig;
}

module.exports = {
    processModuleExportComponentsConfig,
};
