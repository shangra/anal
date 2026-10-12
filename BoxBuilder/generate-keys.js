#!/usr/bin/env node
'use strict';

// CLI выпуска лицензионных ключей.
// Лицензия — JSON-payload, зашифрованный закрытым ключом RSA (crypto.privateEncrypt).
// Расшифровать её можно только открытым ключом, зашитым в verify-license.js.
// Параметры, не переданные флагами, запрашиваются у пользователя интерактивно.

const fs = require('fs');
const path = require('path');
const { privateEncrypt } = require('crypto');
const readline = require('node:readline/promises');

const USAGE = `Использование:
  node generate-key.js --key <private.pem> --users <N> [опции]

Не указанные флагами параметры запрашиваются интерактивно
(Enter — значение по умолчанию или пропуск).

Обязательные:
  --key <путь>       PEM-файл закрытого RSA-ключа
  --users <N>        количество пользователей (целое >= 1)

Опции:
  --days <N>         срок действия в днях от текущего момента
  --expires <дата>   дата окончания действия, формат YYYY-MM-DD (день включительно)
  --product <имя>    название программного продукта
  --version <версия> версия продукта; допускается маска со звёздочкой, например 1.5.*
  --help             показать эту справку

Пример:
  node generate-key.js --key ./private.pem --users 10 --days 365 --product "MyApp" --version 1.2.0

Созданный ключ дополнительно сохраняется в файл .LICENSE_KEY текущего каталога.`;

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

function die(message) {
  console.error('Ошибка: %s', message);
  process.exit(1);
}

function parseUsers(raw) {
  const users = Number(raw);
  if (!Number.isInteger(users) || users < 1) {
    return { error: 'количество пользователей должно быть целым числом >= 1' };
  }
  return { value: users };
}

function termFromDays(raw) {
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    return { error: 'срок должен быть целым числом дней >= 1' };
  }
  return { value: Math.floor(Date.now() / 1000) + Number(raw) * 24 * 60 * 60 };
}

function termFromDate(raw) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return { error: 'ожидается дата в формате YYYY-MM-DD' };
  const endOfDay = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  if (Number.isNaN(endOfDay.getTime()) || endOfDay.getTime() <= Date.now()) {
    return { error: 'некорректная дата или дата уже в прошлом' };
  }
  // дата окончания трактуется как последний день действия (до конца суток)
  return { value: Math.floor(endOfDay.getTime() / 1000) };
}

// пустой ответ означает бессрочную лицензию
function parseTerm(raw) {
  if (raw === '') return { value: null };
  if (/^\d+$/.test(raw)) return termFromDays(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return termFromDate(raw);
  return { error: 'укажите число дней, дату YYYY-MM-DD или пусто для бессрочной лицензии' };
}

function keyFileValidator(raw) {
  let pem;
  try {
    pem = fs.readFileSync(raw, 'utf8');
  } catch {
    return { error: 'файл не найден или не читается' };
  }
  if (!pem.includes('PRIVATE KEY')) return { error: 'файл не похож на PEM закрытого ключа' };
  return { value: raw };
}

// Задаёт вопрос до получения корректного ответа.
// def — значение, возвращаемое при пустом вводе (Enter); если def не задан,
// пустой ввод отдается на усмотрение валидатора (например, «пропустить поле»).
async function askValid(rl, question, validate, def) {
  for (;;) {
    const prompt = def !== undefined ? `${question} [${def}]: ` : `${question}: `;
    const answer = (await rl.question(prompt)).trim();
    if (answer === '' && def !== undefined) return def;
    const parsed = validate(answer);
    if (parsed.error) {
      console.error('  Ошибка: %s', parsed.error);
      continue;
    }
    return parsed.value;
  }
}

async function runQuestionnaire(args) {
  // вопросы дублируются в stderr, чтобы stdout оставался только с ключом лицензии
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const result = { keyPath: null, users: null, exp: null, product: '', version: '' };
  console.error('Заполните недостающие параметры (Enter — значение по умолчанию или пропуск).');
  try {
    if (typeof args.key !== 'string') {
      result.keyPath = await askValid(rl, 'Путь к PEM-файлу закрытого ключа', keyFileValidator, 'private.pem');
    }
    if (args.users === undefined) {
      result.users = await askValid(rl, 'Введите количество пользователей', parseUsers);
    }
    if (args.days === undefined && args.expires === undefined) {
      result.exp = await askValid(rl, 'Срок действия: число дней или дата YYYY-MM-DD (пусто — бессрочно)', parseTerm);
    }
    if (args.product === undefined) {
      result.product = await askValid(rl, 'Название продукта (пусто — не указывать)', (raw) => ({ value: raw }));
    }
    if (args.version === undefined) {
      result.version = await askValid(rl, 'Версия продукта или маска, например 1.5.* (пусто — не указывать)', (raw) => ({ value: raw }));
    }
  } finally {
    rl.close();
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    return;
  }

  const missing = [];
  const missingRequired = [];
  if (typeof args.key !== 'string') { missing.push('--key'); missingRequired.push('--key'); }
  if (args.users === undefined) { missing.push('--users'); missingRequired.push('--users'); }
  if (args.days === undefined && args.expires === undefined) missing.push('--days/--expires');
  if (args.product === undefined) missing.push('--product');
  if (args.version === undefined) missing.push('--version');

  const prompted = { keyPath: null, users: null, exp: null, product: '', version: '' };
  if (missing.length > 0) {
    if (!process.stdin.isTTY) {
      // вне терминала спрашивать не у кого: без обязательных параметров — отказ,
      // опциональные берутся по умолчанию (бессрочно, без продукта)
      if (missingRequired.length > 0) {
        die('не указаны обязательные параметры: ' + missingRequired.join(', ') +
            '. Передайте их флагами или запустите CLI в терминале для интерактивного ввода');
      }
    } else {
      const answers = await runQuestionnaire(args);
      Object.assign(prompted, answers);
    }
  }

  const keyPath = typeof args.key === 'string' ? args.key : prompted.keyPath;
  const usersParsed = parseUsers(args.users !== undefined ? String(args.users) : String(prompted.users));
  if (usersParsed.error) die('--users: ' + usersParsed.error);

  let exp;
  if (args.days !== undefined && args.expires !== undefined) {
    die('укажите только один вариант срока: --days или --expires');
  }
  if (args.days !== undefined) {
    const parsed = termFromDays(String(args.days));
    if (parsed.error) die('--days: ' + parsed.error);
    exp = parsed.value;
  } else if (args.expires !== undefined) {
    const parsed = termFromDate(String(args.expires));
    if (parsed.error) die('--expires: ' + parsed.error);
    exp = parsed.value;
  } else {
    exp = prompted.exp; // null — бессрочно
  }

  const product = typeof args.product === 'string' ? args.product : prompted.product;
  const version = typeof args.version === 'string' ? args.version : prompted.version;

  let privateKey;
  try {
    privateKey = fs.readFileSync(keyPath, 'utf8');
  } catch {
    die('не удалось прочитать файл закрытого ключа: ' + keyPath);
  }
  if (!privateKey.includes('PRIVATE KEY')) die('файл --key не похож на PEM закрытого ключа');

  const payload = {
    users: usersParsed.value,
    iat: Math.floor(Date.now() / 1000),
  };
  if (exp) payload.exp = exp;
  if (product) payload.product = product;
  if (version) payload.version = version;

  const license = privateEncrypt(privateKey, Buffer.from(JSON.stringify(payload), 'utf8')).toString('base64');

  // сводка — в stderr, сам ключ — в stdout (чтобы можно было передать по конвейеру)
  console.error('Лицензия создана:');
  console.error('  пользователей: %d', usersParsed.value);
  if (payload.product) console.error('  продукт: %s%s', payload.product, payload.version ? ' ' + payload.version : '');
  console.error('  выпущена: %s', new Date(payload.iat * 1000).toLocaleString());
  if (payload.exp) console.error('  действует до: %s', new Date(payload.exp * 1000).toLocaleString());
  else console.error('  срок действия: бессрочно');
  console.log(license);

  // 0o600: ключ лицензии — чувствительные данные
  const licensePath = path.resolve(process.cwd(), '.LICENSE.KEY');
  try {
    fs.writeFileSync(licensePath, license + '\n', { mode: 0o600 });
  } catch {
    die('не удалось сохранить ключ в файл ' + licensePath);
  }
  console.error('Ключ сохранён в файл: %s', licensePath);
}

main().catch((err) => {
  console.error('Ошибка: %s', err.message);
  process.exit(1);
});
