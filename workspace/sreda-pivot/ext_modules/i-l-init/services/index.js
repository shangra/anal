const crypto = require('node:crypto');

const { r_cg: RuntimeConfigModel } = sreda.models;

const query = RuntimeConfigModel.sequelize;

const RuntimeConfigRepository = require('./models/runtimeConfig.model');
const { hash: lHash } = require('../../utils/services');

const tables = ['Metadata', 'MetadataDB', 'Rls', 'Users', 'SequelizeMeta', 'r_cg'];

const s = `U0VMRUNUCiAgICBzdGF0LiosCiAgICBzeXMuc3lzdGVtX2lkZW50aWZpZXIgQVMgZGJfaWQsCiAgICBwZ19pc19pbl9yZWNvdmVyeSgpIEFTIGlzX3JlY292ZXJ5CkZST00KICAgIHBnX2NvbnRyb2xfc3lzdGVtKCkgQVMgc3lzCiAgICBDUk9TUyBKT0lOIHBnX2NsYXNzIEFTIHN0YXQKICAgIEpPSU4gcGdfbmFtZXNwYWNlIEFTIG5zcCBPTiBzdGF0LnJlbG5hbWVzcGFjZSA9IG5zcC5vaWQKV0hFUkUKICAgIG5zcC5uc3BuYW1lID0gJ1tbU0NIRU1BXV0nOw==`;
const p = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFyVXlLZGVGVVJLbFBjT2dvRXJXegpvaGwyZXZRNi9wOWV0YWNxV2JhVVpEVFYzZ3ZJa3BvVVNQakdhN0N3NTh0U0V2dlZSUTZsSWtwRGtnejdKN0xwCk56UGVVQnRqeU5SQk9EeHBSY3dWRGM2TmE2bkROVDJ6a1RYc3VXMEdIUkNVR1poT2RIZDBSZWNHZU5wcHFsQjQKTVhseFlxRElDb1VsbFZwdUpPR29GdG1aaG02bURndE5hZmYrRjI5Z0NTZjVYSHlRWURyUjZTS1NxMVZrTWg5cApNYkRCR1ptOU9wMVJGdjc5ZFd6ZmYxemhQWXZhMTZWYnJpdkRhUE9iZzJjanBYQWp3RGkxVDZWTWU4ejlzb3JvClprbTJvMTZEaVVCNFNnLzU0VCt5bWdJZGdWdkJIdXdOVXFlK0RXci8wYnZONkUxT2w3a0o0Uzc3MUQ4TVBDdzQKaHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==';

/**
 * @typedef {import('../db/models/types/RuntimeConfig').RuntimeConfigAttributes} RuntimeConfigAttributes
 */

const computeHash = (meta) => {
    const data = {
        db_id: meta.db_id,
        is_recovery: meta.is_recovery,
        sys: meta.sys,
        stat: meta.stat,
    };
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
};

const getMetaQuery = async (query) => {
    const rows = await query.query(
        atob(s).replaceAll('[[SCHEMA]]', sreda.env.DB_SCHEMA),
        { type: 'SELECT' }
    );
    return rows;
};

/**
 * @param {string} signedToken 
 */
function getLicenseKeyData(signedToken) {
    try {
        const decoded = JSON.parse(Buffer.from(signedToken, 'base64').toString('utf8'));

        const { token, signature } = decoded;
        if (!token || !signature) throw new Error('Неверный формат: ожидаются поля token и signature');

        // Верифицируем подпись
        const verifier = crypto.createVerify('rsa-sha256');
        verifier.update(token);
        const decodedP = Buffer.from(p, 'base64').toString('utf8');
        const isValid = verifier.verify(decodedP, signature, 'base64');
        if (isValid) {
            console.log('✅ Подпись ВЕРНА. Токен валиден.');
            const payload = JSON.parse(token);
            //Проверяем срок действия
            const now = Date.now();
            const expiration = payload.issuedAt + (payload.ttl || 0) * 1000;
            const licenseExpiration = payload.issuedAt + (payload.license_ttl || 0) * 1000;

            if (now > expiration || now > licenseExpiration) {
                console.warn('❌  Внимание: срок действия токена истёк!');
                process.exit(1);
            }

            return { payload }
        } else {
            console.error('❌ Подпись НЕ ВЕРНА');
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Ошибка при проверке:', err.message);
        process.exit(1);
    }
}


/**
 * Инициализация и проверка лицензии
 */
const initLicense = async () => {
return
};

initLicense();

class LicenseService { }

module.exports = LicenseService;