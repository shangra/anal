const fs = require('fs');
const { getTreeAST } = require('./getTreeAST');

const CONSTANTS_VARIABLES_TYPES = [
    'RegExpLiteral',
    'NullLiteral',
    'StringLiteral',
    'BooleanLiteral',
    'NumericLiteral',
    'BigIntLiteral',
    'DecimalLiteral',
    'Identifier',
    'CallExpression',
];

const UTILITIES_VARIABLES_TYPES = ['ArrowFunctionExpression', 'FunctionExpression', 'Identifier', 'FunctionDeclaration'];

// Извлекает из файлов правильно экспортированные переменные
const getVariablesWithNeedType = (ast, filename, options) => {
    if (!options.parseUtilities && !options.parseConstants) {
        throw new Error('Неправильно настроены опции парсера');
    }

    const needVariablesNames = [];

    // Вычисляем переменные для экспорта
    ast.program.body.forEach((bodyNode) => {
        // Отсеиваем export default конструкции
        if (bodyNode.type === 'ExportDefaultDeclaration') {
            // TODO: сделать console,warn
            console.error(
                `\nWARNING! \nExport default will be ignored in file ${filename}.\nRewrite it to export const and restart app\n`,
            );
            return;
        }

        if (bodyNode.type === 'ExportNamedDeclaration') {
            const declarationBlock = bodyNode?.declaration;
            const declarations = bodyNode?.declaration?.declarations;

            const variableType = declarations?.[0]?.init?.type || declarationBlock.type;

            if (declarations || declarationBlock) {
                // Case export const a = { b: ... };
                if (declarationBlock) {
                    if (
                        declarationBlock.type === 'VariableDeclaration' &&
                        declarationBlock?.declarations?.at(0)?.init?.type === 'ObjectExpression'
                    ) {
                        declarationBlock?.declarations.forEach(
                            (declaration) =>
                                declaration?.id?.name &&
                                needVariablesNames.push(declarationBlock?.declarations?.[0]?.id?.name),
                        );
                    }
                }

                // Case export const {a} = <someFunction() | object>;
                if (declarations?.[0].id?.type === 'ObjectPattern') {
                    declarations[0].id.properties.forEach((property) => needVariablesNames.push(property.key.name));
                    return;
                }

                // Case export const [a] = <someFunction() | object>;
                if (declarations?.[0].id?.type === 'ArrayPattern') {
                    declarations[0].id.elements.forEach((variable) => needVariablesNames.push(variable.name));
                    return;
                }

                if (options.parseConstants) {
                    // Case export const a = <value>;
                    // Case export const a = <otherVariable>;
                    // Case export const a = <someFunction()>;
                    if (CONSTANTS_VARIABLES_TYPES.includes(variableType)) {
                        needVariablesNames.push(declarations?.[0].id.name || declarationBlock.id?.name);
                        return;
                    }
                }

                if (options.parseUtilities) {
                    // Case export const a = <ArrowFunction>;
                    // Case export const a = <FunctionExpression>;
                    // Case export const a = <SomeDeclaredFunction>;
                    if (UTILITIES_VARIABLES_TYPES.includes(variableType)) {
                        needVariablesNames.push(declarations?.[0].id.name || declarationBlock.id?.name);
                    }
                }
            }
        }
    });

    return needVariablesNames;
};

const processExportedVariables = (filesList, options, outputFile) => {
    const variablesFilenameMap = {};

    filesList.forEach(({ filename, path, module }) => {
        const ast = getTreeAST(path, filename);
        variablesFilenameMap[`./${module}/${filename}`] = getVariablesWithNeedType(ast, path, options);
    });

    // Генерация объекта для проверки коллизий имен
    const variablesFilenamesMap = {};
    Object.entries(variablesFilenameMap).forEach(([filename, variables]) => {
        variables instanceof Array
            ? variables.forEach((variable) => {
                  variablesFilenamesMap[variable]
                      ? variablesFilenamesMap[variable].push(filename)
                      : (variablesFilenamesMap[variable] = [filename]);
              })
            : (variablesFilenamesMap[variables] = filename);
    });

    // Проверка на коллизии имен
    Object.entries(variablesFilenamesMap).forEach(([variable, filenames]) => {
        if (filenames.length > 1) {
            console.error(
                `Для переменной "${variable}" нарушено правило уникальности. Коллизия имен найдена в файлах:\n${filenames.join(
                    '\n',
                )}\nКаждая экспортируемая переменная должна иметь уникальное имя`,
            );
            process.exit(1);
        }
    });

    // Если найдены export переменные
    if (Object.values(variablesFilenameMap).some((variablesArr) => variablesArr.length !== 0)) {
        const importSection = Object.entries(variablesFilenameMap)
            .map(([filePath, variables]) => `import { ${variables.join(', ')} } from '${filePath}';`)
            .join('\n');

        const exportSection = Object.values(variablesFilenameMap)
            .map((variables) => `export { ${variables.map((variable) => `${variable}`).join(', ')} };`)
            .join('\n');

        const fileGeneratedContent = [importSection, '', exportSection, ''].join('\n');
        fs.writeFileSync(outputFile, fileGeneratedContent);
    } else {
        fs.writeFileSync(outputFile, '// Экспортируемых переменных не найдено\n');
    }
};

module.exports = {
    processExportedVariables,
};
