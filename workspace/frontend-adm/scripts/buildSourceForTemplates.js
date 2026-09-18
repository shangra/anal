const fs = require('fs');
const path = require('path');
const { processExportedVariables } = require('./helpers/buildConstantsAndUtilities');
const { scanDir } = require('./helpers/scanDir');
const { checkIfFileExists } = require('./helpers/checkIfFileExists');
const { buildReactComponents } = require('./helpers/buildReactComponents');
const { buildRootComponents } = require('./helpers/buildRootComponents');
const { buildRoutes } = require('./helpers/buildRoutes');

const COMPONENTS_PATH = './src/components';

console.log('Сборка запущена\n');

const dirList = scanDir(COMPONENTS_PATH);

/// ////--------Сканирование директорий компонентов--------//// ///

const componentList = [];
const filesWithConstantsList = [];
const filesWithUtilitiesList = [];
const rootComponentsPackageJSONs = [];
const routesList = [];

dirList.forEach((componentDir) => {
    const packageJson = JSON.parse(fs.readFileSync(`${componentDir}/package.json`).toString('utf8'));

    const packageRelativePath = componentDir.replace(`${COMPONENTS_PATH}/`, '');

    // Сохранение файлов с константами и валидация файлов
    const fileWithConstants = packageJson.filenameWithConstantsForTemplate;
    if (fileWithConstants) {
        checkIfFileExists(
            fileWithConstants,
            componentDir,
            `Файла ${fileWithConstants} для экспорта констант из модуля ${componentDir} не существует`,
        );

        filesWithConstantsList.push({
            filename: fileWithConstants,
            path: path.resolve(componentDir, fileWithConstants),
            module: packageRelativePath,
        });
    }

    // Сохранение файлов с утилитами и валидация файлов
    const fileWithUtilities = packageJson.filenameWithUtilitiesForTemplate;
    if (fileWithUtilities) {
        checkIfFileExists(
            fileWithUtilities,
            componentDir,
            `Файла ${fileWithUtilities} для экспорта утилит из модуля ${componentDir} не существует`,
        );
        filesWithUtilitiesList.push({
            filename: fileWithUtilities,
            path: path.resolve(componentDir, fileWithUtilities),
            module: packageRelativePath,
        });
    }

    // Сохранение файлов с компонентами, генерация их названий и проверка компонентов на isRootComponent
    if (packageJson.codeName) {
        packageJson.packagePath = packageRelativePath;

        const count = packageJson.packagePath.split('/');
        if (count.length >= 2) {
            // Вложенные компоненты
            packageJson.alias = packageJson.packagePath.replaceAll('/', '__');
        } else {
            packageJson.alias = packageJson.codeName;
        }

        if (packageJson.main) {
            componentList.push(packageJson);
        }

        // Проверка компонентов на isRootComponent
        if (packageJson.rootComponent) {
            rootComponentsPackageJSONs.push(packageJson);
        }
    }

    if (packageJson.routes) {
        routesList.push(packageJson);
    }
});

/// ////--------Сборка компонентов--------//// ///

console.log('Сборка компонентов...');
buildReactComponents(componentList, `${COMPONENTS_PATH}/index.js`);
console.log('Done');

/// ////--------Сборка констант--------//// ///

console.log('Сборка констант...');
processExportedVariables(filesWithConstantsList, { parseConstants: true }, `${COMPONENTS_PATH}/constants.js`);
console.log('Done');

/// ////--------Сборка утилит--------//// ///

console.log('Сборка утилит...');
processExportedVariables(filesWithUtilitiesList, { parseUtilities: true }, `${COMPONENTS_PATH}/utilities.js`);
console.log('Done');

/// ////--------Сборка Root Components--------//// ///

console.log('Сборка Root Components...');
buildRootComponents(rootComponentsPackageJSONs, `${COMPONENTS_PATH}/rootComponents.js`);
console.log('Done');

/// ////--------Сборка Routes --------//// ///

console.log('Сборка Routes...');
buildRoutes(routesList, `${COMPONENTS_PATH}/routes.js`);
console.log('Done');

console.log('\nСборка завершена\n');
