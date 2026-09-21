import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline/promises';
import { loadEnvFile, upsertEnvKey } from './env-file.js';
import { spawnCommand } from './exec.js';
import { pathExists } from './fs-utils.js';
import { logger } from './logger.js';

/**
 * Не db:renew: там undo:all. Для новой схемы заказчика — создать schema,
 * накатить миграции, сиды и дампы. core:collect в поставке нет.
 */
const DB_COMMAND = 'npm run db:migrate:up && npm run db:seed:up && npm run db:dumps:restore';

export async function runMigrationsDb(
  box,
  modules,
  { dryRun = false, skipIfReady = false, skipLicense = false } = {},
) {
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
        'Заполните корневой .env (DB_HOST, DB_USER, DB_PASS, DB_DATABASE, DB_SCHEMA) и снова npm start.',
    );
  }

  if (skipIfReady && !dryRun) {
    const metaCount = await countSequelizeMeta(mod.absDir, env);
    if (metaCount > 0) {
      logger.info(
        `${mod.id}: схема "${schema}" уже содержит ${metaCount} миграций — пропуск. Повторно: npm run db`,
      );
      return { ok: true, skipped: true };
    }
    logger.info(`${mod.id}: новая схема "${schema}" — создаю и накатываю миграции`);
  }

  logger.pkg(mod.id, dryRun ? `dry-run ${DB_COMMAND}` : DB_COMMAND);
  if (dryRun) {
    return { ok: true };
  }

  const result = await spawnCommand(DB_COMMAND, {
    cwd: mod.absDir,
    env,
    onLine: (line) => logger.pkg(mod.id, line),
  }).done;
  if (result.code !== 0) {
    throw new Error(
      `${mod.id}: не удалось создать схему "${schema}" (${DB_COMMAND}, код ${result.code}).\n` +
        'У пользователя БД должны быть права CREATE на базу (CREATE SCHEMA).',
    );
  }
  logger.ok(`${mod.id}: схема "${schema}" создана и наполнена`);
  if (!skipLicense) {
    await askAndWritePivotLicense(modules);
  }
  return { ok: true };
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function pgSsl(env) {
  const flag = String(env.DB_SSL || env.PGSSLMODE || '').toLowerCase();
  const host = String(env.DB_HOST || '');
  const local = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (flag === 'disable' || flag === 'false' || flag === '0' || flag === 'off') {
    return false;
  }
  const rejectUnauthorized =
    env.DB_SSL_REJECT_UNAUTHORIZED === 'true' || env.REJECT_UNAUTH === 'true';
  if (flag === 'true' || flag === '1' || flag === 'require' || flag === 'prefer') {
    return { require: true, rejectUnauthorized };
  }
  if (!local) {
    return { require: true, rejectUnauthorized };
  }
  return false;
}

async function countSequelizeMeta(modAbsDir, env) {
  const requireFromMod = createRequire(path.join(modAbsDir, 'package.json'));
  const pg = requireFromMod('pg');
  const schema = env.DB_SCHEMA || 'pivot';
  const ssl = pgSsl(env);
  const client = new pg.Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_DATABASE,
    ssl: ssl || undefined,
  });
  try {
    await client.connect();
    const found = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'SequelizeMeta'`,
      [schema],
    );
    if (!found.rows[0]?.n) {
      return 0;
    }
    const rows = await client.query(
      `SELECT COUNT(*)::int AS n FROM ${quoteIdent(schema)}."SequelizeMeta"`,
    );
    return rows.rows[0]?.n || 0;
  } catch (error) {
    logger.warn(`${modAbsDir}: проверка схемы: ${error.message}`);
    return 0;
  } finally {
    try {
      await client.end();
    } catch {
      // already closed
    }
  }
}

async function askAndWritePivotLicense(modules) {
  const pivot = modules.find((item) => item.id === 'pivot');
  if (!pivot?.exists) {
    logger.warn('модуль pivot не найден, LICENSE_KEY не записан');
    return;
  }
  const envPath = path.join(pivot.absDir, pivot.envFile || '.env');
  if (!(await pathExists(envPath))) {
    throw new Error(`Нет ${envPath}. Заполните корневой .env и выполните npm start.`);
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
