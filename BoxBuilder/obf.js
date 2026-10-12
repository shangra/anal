#!/usr/bin/env node
'use strict';

// Прокси к сервису обфускации (./obfuscation/index.js).
//
// На вход принимает абсолютный или относительный путь:
//  - каталог пакета, содержащий ext_modules/ → перебирает все модули внутри ext_modules;
//  - папку модулей (например ext_modules)    → каждый подкаталог — отдельный модуль;
//  - один модуль (каталог с package.json) или отдельный .js-файл.
//
// Для каждого модуля вызывает сервис обфускации:
//   node <корень сервиса>/index.js <абсолютный путь к модулю> [опции сервиса]

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { collectJsFiles, SKIP_DIRS } = require('./obfuscation/lib/scanner');
const { findExceptions, isDisabledModule } = require('./obfuscation/lib/exceptions');

const SERVICE = path.join(__dirname, 'obfuscation', 'index.js');

// Опции сервиса, принимающие значение отдельным токеном
// (чтобы его значение не перепутать с позиционным путём).
const VALUE_OPTS = new Set(['--out', '-o', '--config', '-c', '--target', '-t']);

function usage() {
  console.log(`Использование:
  node obf.js --dir=<путь> [опции сервиса]
  node obf.js <путь> [опции сервиса]

<путь> — абсолютный или относительный:
  - каталог пакета, содержащий ext_modules/ → обрабатываются все модули из ext_modules;
  - папка модулей (например ext_modules)    → каждый подкаталог — отдельный модуль;
  - один модуль (каталог с package.json) или отдельный .js-файл.

Опции сервиса (--dry-run, --out <dir>, --no-backup, -c/--config <file>, -t/--target <target>)
передаются в каждый вызов сервиса без изменений.`);
}

/** Разбор argv: выделяем --dir / позиционный путь, остальное — сквозные опции сервиса. */
function parseArgs(argv) {
  let dir;
  let target;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit(0);
    }
    if (arg === '--dir') {
      dir = argv[++i];
      continue;
    }
    if (arg.startsWith('--dir=')) {
      dir = arg.slice('--dir='.length);
      continue;
    }
    if (VALUE_OPTS.has(arg)) {
      rest.push(arg, argv[++i] ?? '');
      continue;
    }
    if (arg.startsWith('-')) {
      rest.push(arg);
      continue;
    }
    if (target === undefined) {
      target = arg;
      continue;
    }
    rest.push(arg);
  }
  return { dir, target, rest };
}

/** Подкаталоги-модули: без скрытых, node_modules и каталогов без .js-файлов. */
function listModuleDirs(parent) {
  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name))
    .map((e) => path.join(parent, e.name))
    .filter((dir) => collectJsFiles(dir).length > 0)
    .sort();
}

function main() {
  const { dir, target, rest } = parseArgs(process.argv.slice(2));
  const input = dir ?? target;
  if (!input) {
    usage();
    process.exit(1);
  }

  const root = path.resolve(input);
  if (!fs.existsSync(root)) {
    console.error(
      `Ошибка: не существует путь "${input}" (разрешён как "${root}", текущая папка: "${process.cwd()}")`
    );
    process.exit(1);
  }

  // Определяем список модулей для вызова сервиса
  let modules;
  const stat = fs.statSync(root);
  const extModules = path.join(root, 'ext_modules');
  if (stat.isDirectory() && fs.existsSync(extModules) && fs.statSync(extModules).isDirectory()) {
    modules = listModuleDirs(extModules);
    console.log(`Цель ${input} → модулей в ext_modules: ${modules.length}`);
  } else if (stat.isFile() || fs.existsSync(path.join(root, 'package.json'))) {
    modules = [root];
    console.log(`Цель ${input} → одиночный модуль`);
  } else {
    modules = listModuleDirs(root);
    console.log(`Цель ${input} → модулей в папке: ${modules.length}`);
  }

  if (modules.length === 0) {
    console.error(
      `Ошибка: модули не найдены в "${root}" (ожидался модуль с package.json, папка ext_modules/ или подкаталоги-модули)`
    );
    process.exit(1);
  }

  // Список исключений: exceptions.json в корне цели (или выше).
  // Модули из "disable" не обфусцируются.
  const exceptionsInfo = findExceptions(root);
  if (exceptionsInfo && exceptionsInfo.disable.size > 0) {
    const relFile = path.relative(process.cwd(), exceptionsInfo.file);
    const kept = [];
    for (const mod of modules) {
      const name = path.basename(mod);
      if (isDisabledModule(name, exceptionsInfo.disable)) {
        console.log(`· ${name} — пропущен (исключения: ${relFile})`);
        continue;
      }
      kept.push(mod);
    }
    modules = kept;
  }

  if (modules.length === 0) {
    console.log('Все модули исключены (exceptions.json) — обфускация не требуется.');
    process.exit(0);
  }

  if (rest.some((a) => a === '--out' || a === '-o') && modules.length > 1) {
    console.warn('Предупреждение: --out при нескольких модулях — деревья могут перекрываться.');
  }

  let failed = 0;
  modules.forEach((mod, i) => {
    const label = path.relative(process.cwd(), mod) || mod;
    console.log(`\n=== [${i + 1}/${modules.length}] ${label} ===`);
    const res = spawnSync(process.execPath, [SERVICE, mod, ...rest], { stdio: 'inherit' });
    if (res.status !== 0) {
      console.error(`✗ Модуль ${label} — ошибка (код ${res.status ?? res.error?.message ?? '?'})`);
      failed++;
    }
  });

  console.log('');
  console.log(`Итог прокси: ${modules.length - failed} ок, ${failed} ошибок.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
