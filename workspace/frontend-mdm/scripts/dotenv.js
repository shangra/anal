const fs = require('fs');
const dotenv = require('dotenv');
const { decrypt } = require('./cryptoEnv');

class DotEnv {
    static config = () => {
        let result = {};
        const envFile = `${process.env.PWD}/.cryptoenv`;
        try {
            if (fs.statSync(envFile)) {
                const json = fs.readFileSync(envFile);
                const content = JSON.parse(json);
                const env = decrypt(content.algorithm, '.', content);
                const config = dotenv.parse(env);
                result = { ...config };
                process.env = { ...process.env, ...config };
            }
        } catch (e) {
            // Нет файла .cryptoenv
            result = dotenv.config();
        }

        return result;
    };

    static showEnv = () => {
        console.log('process.env', process.env);
    };
}

module.exports = DotEnv;
