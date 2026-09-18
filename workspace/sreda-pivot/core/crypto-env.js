const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

const { decrypt } = require('./services/crypto');

const suffixes = [
    '',
    `.${process.env.NODE_ENV}`,
    '.local',
    `.${process.env.NODE_ENV}.local`,
];

for (const prefix of ['', 'crypto']) {
    for (const suffix of suffixes) {
        const file = path.join(process.cwd(), `.${prefix}env${suffix}`);
        if (fs.statSync(file, { throwIfNoEntry: false })) {
            let content = fs.readFileSync(file).toString();
            if (prefix === 'crypto') {
                const obj = JSON.parse(content);
                content = decrypt(obj.algorithm, '.', obj);
            }
            const config = dotenv.parse(content);
            process.env = { ...process.env, ...config };
        }
    }
}

module.exports = {};
