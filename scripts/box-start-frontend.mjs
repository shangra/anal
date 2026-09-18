/**
 * Кроссплатформенный старт фронтов коробки.
 * Без .cmd/.ps1 (на части Windows их блокирует политика) — только node + craco.js.
 * Usage: node scripts/box-start-frontend.mjs  (cwd = модуль)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));

async function rmDir(rel) {
  await fs.rm(path.join(ROOT, rel), { recursive: true, force: true });
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveCracoJs() {
  const pkgJson = require.resolve('@craco/craco/package.json');
  const dir = path.dirname(pkgJson);
  for (const rel of ['dist/bin/craco.js', 'bin/craco.js']) {
    const candidate = path.join(dir, rel);
    if (await exists(candidate)) return candidate;
  }
  const fallback = path.join(ROOT, 'node_modules', '@craco', 'craco', 'dist', 'bin', 'craco.js');
  if (await exists(fallback)) return fallback;
  throw new Error('Не найден @craco/craco. Сначала npm install в модуле.');
}

async function main() {
  await rmDir('build');
  await rmDir('@mf-types');
  await rmDir('bi_ui_build/@mf-types');

  const env = {
    ...process.env,
    ESLINT_NO_DEV_ERRORS: 'true',
    DISABLE_ESLINT_PLUGIN: 'true',
    TSC_COMPILE_ON_ERROR: 'true',
    BROWSER: process.env.BROWSER || 'none',
    HOST: process.env.HOST || '127.0.0.1',
    DANGEROUSLY_DISABLE_HOST_CHECK: process.env.DANGEROUSLY_DISABLE_HOST_CHECK || 'true',
  };

  const cracoJs = await resolveCracoJs();
  const child = spawn(process.execPath, [cracoJs, 'start'], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
