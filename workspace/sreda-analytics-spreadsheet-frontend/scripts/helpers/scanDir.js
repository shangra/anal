const fs = require('fs');

function checkPackageJsonExists(path) {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
        try {
            fs.statSync(`${path}/package.json`);
            return true;
        } catch (e) {
            //
        }
    }
    return false;
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    let dirList = [];

    files.forEach((fileOrDir) => {
        if (checkPackageJsonExists(`${dir}/${fileOrDir}`)) {
            dirList.push(`${dir}/${fileOrDir}`);
        }
    });

    for (const innerDir of dirList) {
        const dirs = scanDir(`${innerDir}`);
        if (dirs.length > 0) {
            dirList = [...dirList, ...dirs];
        }
    }

    return dirList;
}

module.exports = {
    scanDir,
};
