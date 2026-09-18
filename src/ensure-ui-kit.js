import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { pathExists, readJson } from './fs-utils.js';
import { logger } from './logger.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const boxRoot = path.resolve(here, '..');
const compatDir = path.join(boxRoot, 'vendors', 'ui-kit-compat');

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      out += d.toString();
    });
    child.on('exit', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(out || `${command} exited ${code}`));
    });
  });
}

/**
 * Если в модуле file: ui-kit tgz отсутствует — сначала копируем боевой tgz
 * из spreadsheet (vendors/ui-kit/*.tgz), иначе пакуем compat.
 * Если tgz уже есть — не трогаем.
 */
export async function ensureUiKitForModule(mod) {
  const pkgPath = path.join(mod.absDir, 'package.json');
  if (!(await pathExists(pkgPath))) return { action: 'none' };

  const pkg = await readJson(pkgPath);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const spec = deps['ui-kit'];
  if (typeof spec !== 'string' || !spec.startsWith('file:')) {
    return { action: 'none' };
  }

  const rel = spec.slice('file:'.length);
  const target = path.resolve(mod.absDir, rel);
  if (await pathExists(target)) {
    return { action: 'kept', path: target };
  }

  await fs.mkdir(path.dirname(target), { recursive: true });

  // Предпочитаем боевой ui-kit из spreadsheet frontend
  const realCandidates = [
    path.join(mod.absDir, '..', 'sreda-analytics-spreadsheet-frontend', 'vendors', 'ui-kit', 'ui-kit-1.6.16-spr-3.tgz'),
    path.join(boxRoot, 'workspace', 'sreda-analytics-spreadsheet-frontend', 'vendors', 'ui-kit', 'ui-kit-1.6.16-spr-3.tgz'),
  ];
  for (const candidate of realCandidates) {
    if (await pathExists(candidate)) {
      await fs.copyFile(candidate, target);
      await relaxUiKitLockIntegrity(mod.absDir);
      logger.info(`${mod.id}: скопирован боевой ui-kit → ${rel}`);
      return { action: 'copied', path: target, from: candidate };
    }
  }

  if (!(await pathExists(path.join(compatDir, 'package.json')))) {
    await run('node', [path.join(boxRoot, 'scripts', 'build-ui-kit-compat.mjs')], boxRoot);
  }

  const packOut = await run('npm', ['pack', '--pack-destination', path.dirname(target)], compatDir);
  const packedName = packOut
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .pop();
  if (!packedName) {
    throw new Error(`${mod.id}: npm pack ui-kit-compat не вернул имя файла`);
  }
  const packedPath = path.join(path.dirname(target), packedName);
  if (path.resolve(packedPath) !== path.resolve(target)) {
    await fs.rename(packedPath, target);
  }
  await relaxUiKitLockIntegrity(mod.absDir);
  logger.info(`${mod.id}: подложен ui-kit compat → ${rel} (замените боевым tgz при наличии)`);
  return { action: 'compat', path: target };
}

/** Старый package-lock хранит integrity от боевого tgz — с compat он ломает npm i. */
async function relaxUiKitLockIntegrity(absDir) {
  const lockPath = path.join(absDir, 'package-lock.json');
  if (!(await pathExists(lockPath))) return;
  const lock = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  let changed = false;
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.name === 'ui-kit' || (typeof node.resolved === 'string' && node.resolved.includes('ui-kit'))) {
      if (node.integrity) {
        delete node.integrity;
        changed = true;
      }
    }
  };
  visit(lock.packages?.['node_modules/ui-kit']);
  visit(lock.dependencies?.['ui-kit']);
  if (lock.packages) {
    for (const [key, node] of Object.entries(lock.packages)) {
      if (key.includes('ui-kit')) visit(node);
    }
  }
  if (changed) {
    await fs.writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  }
}
