const crypto = require('node:crypto');
const path = require('path');

const secretKey = (otnPath, salt) => {
    const pathPackage = path.join(process.env.PWD, otnPath);
    console.log('pathPackage', pathPackage);
    const hash = Buffer.from(`${pathPackage}:${salt.toString('hex')}`);
    return crypto.createHash('md5').update(hash).digest('hex');
};

const encrypt = (algorithm, path, text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey(path, iv), iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(text)), cipher.final()]);
    return {
        algorithm,
        iv: iv.toString('hex'),
        content: encrypted.toString('hex'),
    };
};

const decrypt = (algorithm, path, hash) => {
    const decipher = crypto.createDecipheriv(algorithm, secretKey(path, hash.iv), Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrpyted.toString();
};

module.exports = { encrypt, decrypt };
