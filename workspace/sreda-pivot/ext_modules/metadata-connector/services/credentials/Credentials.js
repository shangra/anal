const fs = require('fs/promises');
const { join } = require('path');

class Credentials {
    constructor() {
        this.credPath = process.env.CRED_PATH || '';
    }

    /**
     * прочесть сертификат
     *
     * @param {string} name
     * @returns {Promise<string>}
     */
    async readFile(name) {
        let value = undefined;
        try {
            value = await fs.readFile(join(this.credPath, name), 'utf8');
        } catch {
            value = undefined;
        }

        return value;
    }
}

module.exports = Credentials;
