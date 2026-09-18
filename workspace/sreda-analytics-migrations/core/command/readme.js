const fs = require('fs');
const path = require('path');

const MODULES_PATH = './ext_modules';

function checkFileExists(path, filename) {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
        try {
            fs.statSync(`${path}/${filename}`);
            return true;
        } catch (e) {
            //
        }
    }
    return false;
}

function scanDir(dir) {
    let modulesWithReadme = [];
    const files = fs.readdirSync(path.resolve(dir));

    files.forEach((fileOrDir) => {
        const pathToFileDir = `${dir}/${fileOrDir}`;
        if (checkFileExists(pathToFileDir, 'README.md')) {
            modulesWithReadme.push(pathToFileDir);
        }
    });

    for (const innerDir of modulesWithReadme) {
        const dirs = scanDir(`${innerDir}`);
        if (dirs.length > 0) {
            modulesWithReadme = [...modulesWithReadme, ...dirs];
        }
    }

    return modulesWithReadme;
}

const generateOrderedModuleLinkToReadme = (index, modulePath) => {
    return `${index + 1}. **[${modulePath
        .split('/')
        .at(-1)}](${modulePath}/README.md)**`;
};

const buildRootReadmeFile = () => {
    const dirList = scanDir(MODULES_PATH);

    if (!fs.existsSync('README.md')) {
        console.log(
            'Файл README.md проекта не найден. Стейдж генерации README будет пропущен'
        );
        return;
    }

    console.log('\nГенерация README проекта...\n');

    const rootReadmeFile = fs.readFileSync('README.md').toString('utf8');

    const readmeModulesSection = `id="modules"`;

    if (rootReadmeFile.indexOf(readmeModulesSection) === -1) {
        console.error(
            'Секции для описания модулей `## Модули <a id="modules" name="modules"></a>` в файле README.md не найдено.\n' +
                'Стейдж генерации описания описания модулей будет пропущен'
        );

        return;
    }

    let searchLineIndex = -1;
    const lines = rootReadmeFile.split('\n');
    lines.some((readmeLine, lineIndex) =>
        readmeLine.indexOf(readmeModulesSection) !== -1
            ? (searchLineIndex = lineIndex)
            : ''
    );

    // Очистка информации о модулях в README.md
    const newReadmeContent = lines.slice(0, searchLineIndex + 1).join('\n');

    let modulesInfo = [''];

    dirList.map((moduleDir, index) => {
        const modulePackageJsonFile = path.resolve(moduleDir, 'package.json');

        try {
            fs.statSync(modulePackageJsonFile);

            try {
                const moduleDescriptionSection = JSON.parse(
                    fs.readFileSync(modulePackageJsonFile).toString('utf8')
                );
                if (moduleDescriptionSection.description) {
                    modulesInfo.push(
                        `${generateOrderedModuleLinkToReadme(
                            index,
                            moduleDir
                        )} - ${moduleDescriptionSection.description}`
                    );
                } else {
                    modulesInfo.push(
                        generateOrderedModuleLinkToReadme(index, moduleDir)
                    );
                }
            } catch (e) {
                modulesInfo.push(
                    `${generateOrderedModuleLinkToReadme(
                        index,
                        moduleDir
                    )} - <ошибка извлечения информации о модуле>`
                );
                console.error(
                    `Файл package.json модуля ${moduleDir} невалиден. Ошибка: ${e.message}\n`
                );
            }
        } catch (e) {
            modulesInfo.push(
                `${generateOrderedModuleLinkToReadme(
                    index,
                    moduleDir
                )} - <ошибка извлечения информации о модуле>`
            );
            console.error(
                `Файл package.json модуля ${moduleDir} не найден. Информация о пакете не может быть извлечена\n`
            );
        }
    });

    // Запись в README.md описания проекта и обновленного описания модулей
    fs.writeFileSync(
        'README.md',
        [newReadmeContent, modulesInfo.join('\n'), ''].join('\n')
    );

    console.log('Файл README.md с описанием проекта успешно сгенерирован!\n');
};

buildRootReadmeFile();
