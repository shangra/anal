import path from 'node:path';
import { pathExists, readJson } from './fs-utils.js';
import { ensureUiKitForModule } from './ensure-ui-kit.js';

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

  return false;
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
