import fs from 'node:fs/promises';
import path from 'node:path';
import { pathExists, readJson } from './fs-utils.js';
import { logger } from './logger.js';
import { ensureUiKitForModule } from './ensure-ui-kit.js';

const CORP_HOST_RE =
  /sberosc\.sigma\.sbrf\.ru|nexus-ci\.delta\.sbrf\.ru|[\w.-]*\.sbrf\.ru/gi;

const CORP_NPM_PREFIX_RE = /https?:\/\/[^/]*sberosc[^/]*\/repo\/npm\//gi;

/**
 * Публичный registry для внешнего рынка. Корпоративные зеркала не используем.
 */
export const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org/';

export async function hasValidNodeModules(absDir) {
  const nm = path.join(absDir, 'node_modules');
  if (!(await pathExists(nm))) {
    return false;
  }

  if (await pathExists(path.join(nm, '.package-lock.json'))) {
    return true;
  }

  const pkg = (await pathExists(path.join(absDir, 'package.json')))
    ? await readJson(path.join(absDir, 'package.json'))
    : null;
  const deps = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
  };

  const candidates = [];
  if (deps.express) candidates.push('express');
  if (deps.knex || deps.sequelize) candidates.push('knex', 'sequelize');
  if (deps.react) candidates.push('react');
  if (deps['@craco/craco']) candidates.push('@craco/craco');
  if (candidates.length === 0) {
    candidates.push('express', 'react');
  }

  for (const name of candidates) {
    const target = path.join(nm, ...name.split('/'));
    if (await pathExists(target)) {
      return true;
    }
  }

  // пустая или битая node_modules
  return false;
}

export async function ensurePublicNpmrc(absDir) {
  const npmrcPath = path.join(absDir, '.npmrc');
  let existing = '';
  if (await pathExists(npmrcPath)) {
    existing = await fs.readFile(npmrcPath, 'utf8');
    if (/sberosc|sbrf\.ru|nexus-ci\.delta/i.test(existing)) {
      logger.warn(`${path.basename(absDir)}: .npmrc ссылался на корпоративный registry — переписываю`);
      existing = '';
    } else if (existing.includes(`registry=${PUBLIC_NPM_REGISTRY}`)) {
      return npmrcPath;
    }
  }

  const lines = existing
    ? existing
        .split(/\r?\n/)
        .filter((line) => line.trim() && !/^\s*registry\s*=/i.test(line))
        .concat([`registry=${PUBLIC_NPM_REGISTRY}`])
    : [`registry=${PUBLIC_NPM_REGISTRY}`, 'audit=false', 'fund=false'];

  await fs.writeFile(npmrcPath, `${lines.join('\n').trim()}\n`, 'utf8');
  return npmrcPath;
}

/**
 * Переписывает package-lock resolved/URL с корпоративных зеркал на registry.npmjs.org.
 * Integrity оставляем — контент пакетов тот же.
 * Если lock выглядит безнадёжно — удаляем, чтобы npm install собрал новый с npmjs.
 */
export async function sanitizeModuleLockfile(absDir) {
  const lockPath = path.join(absDir, 'package-lock.json');
  if (!(await pathExists(lockPath))) {
    return { action: 'none' };
  }

  let raw = await fs.readFile(lockPath, 'utf8');
  if (!CORP_HOST_RE.test(raw) && !/sberosc/i.test(raw)) {
    CORP_HOST_RE.lastIndex = 0;
    return { action: 'clean' };
  }
  CORP_HOST_RE.lastIndex = 0;

  const backupPath = `${lockPath}.corp.bak`;
  if (!(await pathExists(backupPath))) {
    await fs.copyFile(lockPath, backupPath);
  }

  let next = raw
    .replace(CORP_NPM_PREFIX_RE, PUBLIC_NPM_REGISTRY)
    .replace(/https?:\/\/[^"'\s]*sbrf\.ru[^"'\s]*/gi, (url) => {
      // запасной путь: вытащить имя пакета из хвоста /name/-/name-ver.tgz
      const m = url.match(/\/((?:@[^/]+\/)?[^/]+)\/-\/[^/]+$/);
      if (m) {
        return `${PUBLIC_NPM_REGISTRY}${m[1]}/-/${path.basename(url)}`;
      }
      return url;
    });

  // если после замены всё ещё корпоративные хосты — lock не спасти
  if (/sberosc|nexus-ci\.delta\.sbrf|sigma\.sbrf/i.test(next)) {
    await fs.unlink(lockPath);
    logger.warn(
      `${path.basename(absDir)}: package-lock с корпоративными URL удалён (бэкап: package-lock.json.corp.bak)`,
    );
    return { action: 'removed' };
  }

  if (next !== raw) {
    await fs.writeFile(lockPath, next, 'utf8');
    logger.info(`${path.basename(absDir)}: package-lock переведён на ${PUBLIC_NPM_REGISTRY}`);
    return { action: 'rewritten' };
  }

  return { action: 'clean' };
}

/**
 * file: зависимости (ui-kit tgz и т.п.) должны лежать в поставке продукта.
 */
export async function assertLocalFileDeps(absDir) {
  const pkgPath = path.join(absDir, 'package.json');
  if (!(await pathExists(pkgPath))) {
    return [];
  }
  const pkg = await readJson(pkgPath);
  const all = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  };

  const missing = [];
  for (const [name, spec] of Object.entries(all)) {
    if (typeof spec !== 'string' || !spec.startsWith('file:')) {
      continue;
    }
    const rel = spec.slice('file:'.length);
    const target = path.resolve(absDir, rel);
    if (!(await pathExists(target))) {
      missing.push({ name, spec, path: target });
    }
  }
  return missing;
}

export async function prepareModuleForPublicInstall(mod) {
  await ensurePublicNpmrc(mod.absDir);
  await sanitizeModuleLockfile(mod.absDir);
  await ensureUiKitForModule(mod);

  const missing = await assertLocalFileDeps(mod.absDir);
  if (missing.length > 0) {
    const lines = missing
      .map((item) => `  - ${item.name} (${item.spec}) → нет файла ${item.path}`)
      .join('\n');
    throw new Error(
      `${mod.id}: в поставке нет локальных пакетов (file:).\n${lines}\n` +
        'Для внешнего рынка эти tgz должны лежать в модуле (обычно vendors/).',
    );
  }

  const valid = await hasValidNodeModules(mod.absDir);
  return { needsInstall: !valid };
}
