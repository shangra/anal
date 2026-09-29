const fs = require('fs');
const { parse } = require('@babel/parser');
const { getFileExtension } = require('./getFileExtension');
const { removeTypeDefinitions } = require('./removeTypeDefinitions');

const getTreeAST = (pathToFile, filename) => {
    const fileContent = fs.readFileSync(pathToFile).toString('utf8');

    let javascriptCode = fileContent;
    // Если это TypeScript код - вырезаем объявления типов
    if (getFileExtension(filename) === 'ts') {
        javascriptCode = removeTypeDefinitions(filename, fileContent);
    }

    // Генерация AST-дерева
    return parse(javascriptCode, {
        // parse in strict mode and allow module declarations
        sourceType: 'module',
    });
};

module.exports = { getTreeAST };
