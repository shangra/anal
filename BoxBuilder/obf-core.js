#!/usr/bin/env node
'use strict';

// Прокси к сервису обфускации ядра (./obfuscation/core.js) — по аналогии с obf.js.
//
// На вход принимает абсолютный или относительный путь:
//  - отдельный .js-файл (например server.js) → одиночная обработка;
//  - каталог с server.js в корне → пакет: ядро core/ + точка входа;
//  - каталог без server.js → перебор подкаталогов первого уровня (внутри
//    <цель>/packages, если такой каталог есть, иначе внутри самой цели):
//    обфусцируется ТОЛЬКО папка, в которой есть server.js.
//
// Опции сервиса (--dry-run, --out, --no-backup, -c, -t) передаются
// в сервис без изменений.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SERVICE = path.join(__dirname, 'obfuscation', 'core.js');

// Опции сервиса, принимающие значение отдельным токеном
// (чтобы его значение не перепутать с позиционным путём).
const VALUE_OPTS = new Set(['--out', '-o', '--config', '-c', '--target', '-t']);

function usage() {
  console.log(`Использование:
  node obf-core.js --dir=<путь> [опции сервиса]
  node obf-core.js <путь> [опции сервиса]

<путь> — абсолютный или относительный:
  - отдельный .js-файл (например server.js)           → одиночная обработка;
  - каталог с server.js в корне                       → пакет: ядро core/ + точка входа;
  - каталог без server.js                             → перебор подкаталогов первого уровня
    (внутри <цель>/packages, если есть, иначе внутри самой цели): обфусцируется
    ТОЛЬКО папка, в которой есть server.js.

Опции сервиса (--dry-run, --out <dir>, --no-backup, -c/--config <file>, -t/--target <target>)
передаются в сервис без изменений.`);
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

  const stat = fs.statSync(root);
  let label;
  if (stat.isFile()) {
    label = 'одиночный .js-файл';
  } else if (fs.existsSync(path.join(root, 'server.js'))) {
    label = 'пакет (core/ и/или server.js)';
  } else {
    const packagesDir = path.join(root, 'packages');
    const scanDir =
      fs.existsSync(packagesDir) && fs.statSync(packagesDir).isDirectory() ? 'packages' : 'подкаталоги';
    label = `поиск папок с server.js (${scanDir})`;
  }

  console.log(`Цель ${input} → ${label}`);
  const res = spawnSync(process.execPath, [SERVICE, root, ...rest], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

main();
