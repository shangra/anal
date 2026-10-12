'use strict';

// Смоук-тесты системы лицензирования: валидный ключ, подделка, просрочка, чужой продукт.
// Запуск: node smoke-test.js

const { execFileSync } = require('child_process');
const { privateEncrypt } = require('crypto');
const fs = require('fs');
const path = require('path');

const node = process.execPath;
const dir = __dirname;
const verify = require('./verify-license');

let failures = 0;

function expectError(fn, name) {
  try {
    fn();
    console.error('FAIL %s: ожидалась ошибка, но проверка прошла', name);
    failures++;
  } catch (err) {
    console.log('ok   %s -> %s', name, err.message);
  }
}

// 1. Валидный ключ выпускается CLI и проходит проверку; ключ дублируется в .LICENSE_KEY
const license = execFileSync(
  node,
  [
    path.join(dir, 'generate-key.js'),
    '--key', path.join(dir, 'private.pem'),
    '--users', '25',
    '--days', '30',
    '--product', 'MyApp',
    '--version', '1.*',
  ],
  { stdio: ['ignore', 'pipe', 'ignore'], cwd: dir },
).toString().trim();

const saved = fs.readFileSync(path.join(dir, '.LICENSE_KEY'), 'utf8').trim();
if (saved === license) {
  console.log('ok   ключ сохранён в .LICENSE_KEY');
} else {
  console.error('FAIL содержимое .LICENSE_KEY не совпадает с выданным ключом');
  failures++;
}

const info = verify(license, { product: 'MyApp', version: '1.0.0' });
if (info.users === 25 && info.product === 'MyApp' && info.expiresAt > new Date()) {
  console.log('ok   валидный ключ: %d пользователей, %s %s, до %s',
    info.users, info.product, info.version, info.expiresAt.toLocaleString());
} else {
  console.error('FAIL валидный ключ: неожиданные данные %j', info);
  failures++;
}

// 2. Мусор вместо ключа
expectError(() => verify('not-a-real-key'), 'мусор вместо ключа отклонён');

// 3. Изменённый валидный ключ (испорчена подпись)
const tampered = license.slice(0, 100) + (license[100] === 'A' ? 'B' : 'A') + license.slice(101);
expectError(() => verify(tampered), 'изменённый ключ отклонён');

// 4. Просроченная лицензия (payload собран вручную с exp в прошлом)
const privateKey = fs.readFileSync(path.join(dir, 'private.pem'), 'utf8');
const expiredPayload = JSON.stringify({
  users: 5,
  iat: Math.floor(Date.now() / 1000) - 7200,
  exp: Math.floor(Date.now() / 1000) - 3600,
});
const expired = privateEncrypt(privateKey, Buffer.from(expiredPayload, 'utf8')).toString('base64');
expectError(() => verify(expired), 'просроченный ключ отклонён');

// 5. Несовпадающий продукт/версия
expectError(() => verify(license, { product: 'OtherApp' }), 'чужой продукт отклонён');
expectError(() => verify(license, { version: '2.0.0' }), 'чужая версия отклонена');

// 6. Маска версии в лицензии: "1.5.*" принимает любую версию ветки 1.5
const maskLicense = execFileSync(
  node,
  [
    path.join(dir, 'generate-key.js'),
    '--key', path.join(dir, 'private.pem'),
    '--users', '5',
    '--version', '1.5.*',
  ],
  { stdio: ['ignore', 'pipe', 'ignore'] },
).toString().trim();

const masked = verify(maskLicense, { version: '1.5.3' });
if (masked.users === 5) {
  console.log('ok   маска 1.5.* принимает версию 1.5.3');
} else {
  console.error('FAIL маска 1.5.* не приняла версию 1.5.3');
  failures++;
}
if (
  verify(maskLicense, { version: '1.5' }).users === 5 &&
  verify(maskLicense, { version: '1.5.3.1' }).users === 5
) {
  console.log('ok   маска 1.5.* принимает версии 1.5 и 1.5.3.1');
} else {
  console.error('FAIL маска 1.5.* не приняла версии 1.5 / 1.5.3.1');
  failures++;
}
expectError(() => verify(maskLicense, { version: '1.6.0' }), 'маска 1.5.* отклоняет 1.6.0');

// 7. Маска "*" принимает любую версию
const anyLicense = execFileSync(
  node,
  [
    path.join(dir, 'generate-key.js'),
    '--key', path.join(dir, 'private.pem'),
    '--users', '5',
    '--version', '*',
  ],
  { stdio: ['ignore', 'pipe', 'ignore'] },
).toString().trim();

const any = verify(anyLicense, { version: '9.9.9' });
if (any.users === 5) {
  console.log('ok   маска * принимает версию 9.9.9');
} else {
  console.error('FAIL маска * не приняла версию 9.9.9');
  failures++;
}

// 8. CLI отклоняет некорректный ввод
function cliFails(extraArgs) {
  try {
    execFileSync(node, [path.join(dir, 'generate-key.js'), ...extraArgs], { stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}
if (cliFails(['--key', path.join(dir, 'private.pem'), '--users', 'abc'])) {
  console.log('ok   CLI отклоняет --users abc');
} else {
  console.error('FAIL CLI принял --users abc');
  failures++;
}
if (cliFails(['--key', path.join(dir, 'private.pem'), '--users', '5', '--expires', '2001-01-01'])) {
  console.log('ok   CLI отклоняет дату окончания в прошлом');
} else {
  console.error('FAIL CLI принял дату в прошлом');
  failures++;
}
// вне терминала недостающие обязательные параметры не о чем спрашивать — чистый отказ
if (cliFails(['--users', '5'])) {
  console.log('ok   CLI без обязательного --key вне TTY завершается с ошибкой');
} else {
  console.error('FAIL CLI вне TTY не отказал без обязательного --key');
  failures++;
}
// опциональные параметры вне терминала подставляются по умолчанию (бессрочная лицензия)
const partial = execFileSync(
  node,
  [path.join(dir, 'generate-key.js'), '--key', path.join(dir, 'private.pem'), '--users', '5'],
  { stdio: ['ignore', 'pipe', 'ignore'] },
).toString().trim();
const partialInfo = verify(partial);
if (partialInfo.users === 5 && partialInfo.expiresAt === undefined) {
  console.log('ok   CLI вне TTY без опциональных флагов: бессрочная лицензия на 5 пользователей');
} else {
  console.error('FAIL неполный набор флагов вне TTY: %j', partialInfo);
  failures++;
}

if (failures > 0) {
  console.error('\nПровалено проверок: %d', failures);
  process.exit(1);
}
console.log('\nВсе проверки пройдены');
