const fs = require('fs');

const BEFORE_LAZY_WRAP_POSTFIX = 'BeforeLazyWrap';

const buildReactComponents = (componentList, outputFile) => {
    const lazyWrapper =
        'const lazyWrapper = (LoadingComponent) => forwardRef((lazyLoadingComponentProps, ref) => {\n' +
        '\treturn (\n' +
        '\t\t<ErrorBoundaryCMP fallback={<div>Something went wrong</div>}>\n' +
        '\t\t\t<Suspense fallback={<div>Loading...</div>}>\n' +
        '\t\t\t\t<LoadingComponent {...lazyLoadingComponentProps} ref={ref} />\n' +
        '\t\t\t</Suspense>\n' +
        '\t\t</ErrorBoundaryCMP>\n' +
        '\t);\n' +
        '});\n';

    const importList = componentList.map((component) => {
        let result = ``;
        const componentName = component.alias ? `${component.codeName} as ${component.alias}` : `${component.codeName}`;
        if (component.lazy) {
            result =
                `const ${component.alias + BEFORE_LAZY_WRAP_POSTFIX} = lazy(() => import('./${component.packagePath}'));` +
                '\n' +
                `const ${component.alias} = lazyWrapper(${component.alias + BEFORE_LAZY_WRAP_POSTFIX});`;
        } else if (component.export === 'default') {
            result = `import ${component.alias} from './${component.packagePath}';`;
        } else {
            result = `import { ${componentName} } from './${component.packagePath}';`;
        }
        return result;
    });

    const functionGetComponent = [
        `export function GetComponent(componentName) {\n` + `\tlet result = '';\n`,
        `\tif (componentName === 'Components.{{componentAlias}}') { result = {{componentName}}; }`,
        '\n\treturn result;\n' + `}\n`,
    ];
    const ifElseList = componentList.map((component) => {
        let ifElse = functionGetComponent[1];
        const componentName = component.alias ? component.alias : component.codeName;
        const componentAlias = component.alias ? component.alias.replaceAll('__', '.') : component.codeName;
        ifElse = ifElse.replaceAll('{{componentName}}', componentName);
        ifElse = ifElse.replaceAll('{{componentAlias}}', componentAlias);
        return ifElse;
    });

    const exportList = componentList.map((component) =>
        component.alias ? `export { ${component.alias} };` : `export { ${component.codeName} };`,
    );

    const importString = importList.join('\n');
    const ifElseString = ifElseList.join('\n');
    const exportString = exportList.join('\n');

    const contentParts = [
        "import { lazy, Suspense, forwardRef } from 'react';\n",
        "import { ErrorBoundary as ErrorBoundaryCMP } from './ErrorBoundary';",
        '/* eslint-disable */',
        lazyWrapper,
        importString,
        '',
        functionGetComponent[0],
        ifElseString,
        functionGetComponent[2],
        '',
        exportString,
        '/* eslint-enable */',
    ];

    const generatedFileContent = contentParts.join('\n');
    fs.writeFileSync(outputFile, generatedFileContent);
};

module.exports = {
    buildReactComponents,
};
