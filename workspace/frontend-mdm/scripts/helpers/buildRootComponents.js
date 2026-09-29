const fs = require('fs');

const buildRootComponents = (rootComponentsPackageJSONs, outputFile) => {
    const importList = rootComponentsPackageJSONs.map((component) => {
        let result = ``;

        if (component.lazy) {
            result = `const ${component.alias} = lazy(() => import('./${component.packagePath}'));`;
        } else if (component.export === 'default') {
                result = `import ${component.codeName} from "./${component.packagePath}";`;
            } else {
                result = `import { ${component.codeName} } from "./${component.packagePath}";`;
            }

        return result;
    });

    const generatedComponents = rootComponentsPackageJSONs.map((component) => `<${component.codeName} />`);

    const contentParts = [
        `import React from 'react'`,
        importList.join('\n'),
        '',
        `export class RootComponents extends React.Component {\n` +
            '    render() {\n' +
            '        return (\n' +
            '            <>\n' +
            `                ${generatedComponents.join('\n\t\t\t\t')}\n` +
            '            </>\n' +
            '        );\n' +
            '    }\n' +
            '}\n',
    ];

    const generatedFileContent = contentParts.join('\n');
    fs.writeFileSync(outputFile, generatedFileContent);
};

module.exports = {
    buildRootComponents,
};
