const babel = require('@babel/core');

// Удаление определений типов TypeScript из кода
function removeTypeDefinitions(filename, code) {
    // Конфигурация Babel с пресетом для удаления типов
    const babelConfig = {
        presets: ['@babel/preset-typescript'],
        filename,
    };

    // Трансформируем код с помощью Babel
    return babel.transformSync(code, babelConfig)?.code || '';
}

module.exports = {
    removeTypeDefinitions,
};
