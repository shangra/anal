import path from 'node:path';
import readline from 'node:readline/promises';
import { loadEnvFile, upsertEnvKey } from './env-file.js';
import { spawnCommand } from './exec.js';
import { pathExists } from './fs-utils.js';
import { logger } from './logger.js';

/**
 * Применяем схему без core:collect — в поставке нет core/command/build,
 * а индексы ext_modules/*.js уже собраны. core/ext_modules не трогаем.
 */
const DB_COMMAND = 'npm run db:renew';

export async function runMigrationsDb(box, modules, { dryRun = false } = {}) {
  const mod =
    modules.find((item) => item.id === 'migrations') ||
    modules.find((item) => item.kind === 'oneshot');

  if (!mod) {
    throw new Error('В box.config.json нет модуля migrations.');
  }
  if (!mod.exists) {
    throw new Error(`${mod.id}: каталог не найден: ${mod.absDir}`);
  }
  if (!mod.hasPackageJson) {
    throw new Error(`${mod.id}: нет package.json в ${mod.absDir}`);
  }

  logger.pkg(mod.id, dryRun ? `dry-run ${DB_COMMAND}` : DB_COMMAND);
  if (dryRun) {
    return { ok: true };
  }

  const fromFile = await loadEnvFile(path.join(mod.absDir, mod.envFile || '.env'));
  const env = {
    ...box.env,
    ...fromFile,
    NODE_ENV: 'development',
  };

  const host = env.DB_HOST || '(не задан)';
  const port = env.DB_PORT || '?';
  const database = env.DB_DATABASE || '?';
  const schema = env.DB_SCHEMA || '?';
  logger.info(`подключение к БД: ${host}:${port}/${database} schema=${schema}`);

  if (!env.DB_HOST || !env.DB_USER || !env.DB_DATABASE) {
    throw new Error(
      `${mod.id}: в ${mod.envFile || '.env'} нет DB_HOST/DB_USER/DB_DATABASE.\n` +
        'Заполните корневой .env (DB_HOST, DB_USER, DB_PASS, DB_DATABASE) и снова npm run db / npm start.',
    );
  }

  const result = await spawnCommand(DB_COMMAND, {
    cwd: mod.absDir,
    env,
    onLine: (line) => logger.pkg(mod.id, line),
  }).done;
  if (result.code !== 0) {
    throw new Error(`${mod.id}: ${DB_COMMAND} завершился с кодом ${result.code}`);
  }
  logger.ok(`${mod.id}: схема базы применена`);
  await askAndWritePivotLicense(modules);
  return { ok: true };
}

async function askAndWritePivotLicense(modules) {
  const pivot = modules.find((item) => item.id === 'pivot');
  if (!pivot?.exists) {
    logger.warn('модуль pivot не найден, LICENSE_KEY не записан');
    return;
  }
  const envPath = path.join(pivot.absDir, pivot.envFile || '.env');
  if (!(await pathExists(envPath))) {
    throw new Error(`Нет ${envPath}. Заполните корневой .env и выполните npm run db.`);
  }

  const key = await promptLicenseKey();
  if (!key) {
    logger.warn('ключ не введён, LICENSE_KEY не изменён');
    return;
  }

  await upsertEnvKey(envPath, 'LICENSE_KEY', key);
  logger.ok(`pivot: LICENSE_KEY записан`);
}

async function promptLicenseKey() {
  if (!process.stdin.isTTY) {
    logger.warn('нет интерактивной консоли, LICENSE_KEY не запрошен');
    return '';
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const value = await rl.question('введите лицензионный ключ: ');
    return value.trim();
  } finally {
    rl.close();
  }
}
