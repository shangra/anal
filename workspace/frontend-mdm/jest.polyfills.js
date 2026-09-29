/**
 * Polyfills для Jest-окружения
 * Добавляет crypto.randomUUID и structuredClone для старых версий Node.js
 */

// Polyfill для crypto.randomUUID
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomUUID) {
    const { webcrypto } = require('node:crypto');
    globalThis.crypto = webcrypto;
}

// Polyfill для structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
    globalThis.structuredClone = function structuredClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    };
}
