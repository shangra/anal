const fs = require('fs');
const path = require('path');

function checkIfFileExists(filename, module, errorText) {
    if (!filename) {
        return;
    }

    const fileExists = fs.existsSync(path.resolve(module, filename));
    if (!fileExists) {
        throw new Error(errorText);
    }
}

module.exports = {
    checkIfFileExists,
};
