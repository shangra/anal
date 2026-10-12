#!/usr/bin/env node
'use strict';

// Очистка папки сервисов от временных/служебных файлов.
//
// На вход принимает путь к папке с сервисами (например ../Box.Analytic)
// и рекурсивно удаляет по всему дереву:
//   - файлы .env
//   - файлы package-lock.json
//   - файлы .LICENSE.KEY
//   - директории node_modules (целиком, вместе с содержимым)

const fs = require('fs');
const path = require('path');

// Файлы, подлежащие удалению (точные имена)
const FILE_NAMES = new Set(['.env', 'package-lock.json', '.LICENSE.KEY']);
// Директории, подлежащие рекурсивному удалению
const DIR_NAMES = new Set(['node_modules']);

function usage() {
  console.log(`Использование:
  node clearbox.js <путь> [--dry-run]

<путь> — папка с сервисами (например ../Box.Analytic).
Скрипт рекурсивно удаляет: .env, package-lock.json, .LICENSE.KEY, node_modules/.

Опции:
  --dry-run, -n   только показать, что будет удалено, ничего не удалять`);
}

function parseArgs(argv) {
  const args = [];
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '-n') {
      dryRun = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit(0);
    }
    args.push(arg);
  }
  return { target: args[0], dryRun };
}

/** Рекурсивный обход: удаляет файлы из FILE_NAMES и директории из DIR_NAMES. */
function cleanDir(dir, dryRun, stats) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (DIR_NAMES.has(entry.name)) {
        console.log(`${dryRun ? '[dry-run] ' : ''}удаление каталога: ${full}`);
        stats.dirs++;
        if (!dryRun) fs.rmSync(full, { recursive: true, force: true });
        continue; // внутрь удаляемого каталога не заходим
      }
      cleanDir(full, dryRun, stats);
    } else if (entry.isFile() && FILE_NAMES.has(entry.name)) {
      console.log(`${dryRun ? '[dry-run] ' : ''}удаление файла:    ${full}`);
      stats.files++;
      if (!dryRun) fs.rmSync(full, { force: true });
    }
  }
}

function main() {
  const { target, dryRun } = parseArgs(process.argv.slice(2));
  if (!target) {
    usage();
    process.exit(1);
  }

  const root = path.resolve(target);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Ошибка: "${target}" не существует или не является каталогом (разрешён как "${root}")`);
    process.exit(1);
  }

  const stats = { files: 0, dirs: 0 };
  console.log(`Очистка ${root}${dryRun ? ' [dry-run]' : ''}\n`);
  cleanDir(root, dryRun, stats);

  console.log('');
  console.log(`Итог: удалено файлов — ${stats.files}, каталогов — ${stats.dirs}${dryRun ? ' (dry-run, ничего не удалено)' : ''}.`);
}

main();
