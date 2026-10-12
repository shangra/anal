'use strict';

// Проверка лицензионных ключей, выпущенных generate-key.js.
// Расшифровка выполняется открытым ключом, поэтому подделать лицензию
// без закрытого ключа невозможно.

const { publicDecrypt } = require('crypto');

// Открытый ключ, соответствующий закрытому ключу, которым подписываются лицензии.
// Чтобы выпускать лицензии своим ключом, сгенерируйте пару через generate-keypair.js
// и замените содержимое этой константы на свой public.pem.
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtqNcUgBxXCdNBhpl/BtB
LHXZ3tOdNTKsa1P4pYz4S8V9sGWMDl4nk1TucY2aLxQ1vnfbBywY8SzCmhDTahGo
mIczYEo8MYE0U086kcyoHbI0Db1lV4xTT+o/YEY99doT+seYTL5NPqaE443XjF8C
009yYYXBMXpGmc0pzZgxg7BUJZoZDOllE3b1HGLZuAH8vgqFTDbSU7wFAv6aDL04
PIiijbALLfnNxvhTiI76b0uOifHkXHEDy3jzdZyJ7moBVTB6uGB7s3XC/sFgaKO1
NM29mcHmERPDXlF0jEXdsbJ3qY1FPmgzLNM2qvDFpsUBz4CEDhSS553F19NabBJE
9QIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Сопоставляет версию с маской из лицензии: сегменты через точку.
 * Звёздочка в конце маски поглощает все оставшиеся сегменты версии,
 * поэтому "*" — любая версия, "1.5.*" — версии 1.5, 1.5.0, 1.5.3 и т.д.,
 * но не "1.6.0". Точная маска ("1.5.3") принимает только точное совпадение.
 */
function matchVersionMask(mask, version) {
    const maskParts = mask.split('.');
    const versionParts = version.split('.');
    for (let i = 0; i < maskParts.length; i++) {
        if (maskParts[i] === '*') {
            if (i === maskParts.length - 1) return true;
            if (i >= versionParts.length) return false;
            continue;
        }
        if (i >= versionParts.length || versionParts[i] !== maskParts[i]) {
            return false;
        }
    }
    return versionParts.length === maskParts.length;
}

/**
 * Проверяет лицензионный ключ и возвращает данные лицензии.
 *
 * @param {string} licenseKey лицензионный ключ в base64 (вывод generate-key.js)
 * @param {{product?: string, version?: string}} [options] ожидаемые продукт/версия.
 *        Версия в лицензии может быть маской ("1.5.*", "*") и проверяется
 *        по сегментам против ожидаемой версии
 * @returns {{users: number, product?: string, version?: string,
 *            issuedAt: Date, expiresAt?: Date}} данные лицензии;
 *            version может быть маской, а не конкретной версией
 * @throws {Error} если ключ невалиден, подделан или просрочен
 */
function verifyLicense(licenseKey, options) {
    if (typeof licenseKey !== 'string' || licenseKey.trim() === '') {
        throw new Error('Лицензионный ключ не передан');
    }

    let payload;
    try {
        const encrypted = Buffer.from(licenseKey.trim(), 'base64');
        const decrypted = publicDecrypt({ key: PUBLIC_KEY }, encrypted);
        payload = JSON.parse(decrypted.toString('utf8'));
    } catch {
        throw new Error('Невалидный лицензионный ключ');
    }

    if (
        payload === null ||
        typeof payload !== 'object' ||
        !Number.isInteger(payload.users) ||
        payload.users < 1
    ) {
        throw new Error('Невалидный лицензионный ключ: не найдено количество пользователей');
    }

    if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
        throw new Error('Срок действия лицензии истёк');
    }

    const expected = options || {};
    if (expected.product !== undefined && payload.product !== expected.product) {
        throw new Error('Лицензия выдана для другого продукта: ' + (payload.product || '(не указан)'));
    }
    if (
        expected.version !== undefined &&
        !(typeof payload.version === 'string' && matchVersionMask(payload.version, expected.version))
    ) {
        throw new Error('Лицензия выдана для другой версии: ' + (payload.version || '(не указана)'));
    }

    return {
        users: payload.users,
        product: payload.product,
        version: payload.version,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : undefined,
    };
}

module.exports = verifyLicense;
module.exports.verifyLicense = verifyLicense;
