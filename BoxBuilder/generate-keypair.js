#!/usr/bin/env node
'use strict';

// Утилита генерации пары RSA-ключей для системы лицензирования:
// private.pem — для CLI generate-key.js, public.pem — зашивается в verify-license.js.

const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = typeof args.out === 'string' ? args.out : __dirname;
  const privatePath = path.resolve(outDir, typeof args.private === 'string' ? args.private : 'private.pem');
  const publicPath = path.resolve(outDir, typeof args.public === 'string' ? args.public : 'public.pem');
  const bits = Number.parseInt(args.bits, 10) || 2048;

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: bits,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // 0o600: закрытый ключ должен быть доступен только владельцу
  fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicPath, publicKey);

  console.error('Закрытый ключ: %s', privatePath);
  console.error('Открытый ключ: %s', publicPath);
  console.error('RSA %d бит. Публичный ключ вставьте в константу PUBLIC_KEY в verify-license.js', bits);
}

main();
