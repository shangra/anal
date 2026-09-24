import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline/promises';
import { loadEnvFile, upsertEnvKey } from './env-file.js';
import { spawnCommand } from './exec.js';
import { pathExists } from './fs-utils.js';
import { logger } from './logger.js';
import { envWantsDemoCube, seedDemoCube } from './demo-cube.js';

/**
 * Не db:renew: там undo:all. Для новой схемы заказчика — создать schema,
 * накатить миграции, сиды и дампы. core:collect в поставке нет.
 */
const DB_COMMAND = 'npm run db:migrate:up && npm run db:seed:up && npm run db:dumps:restore';
const DUMPS_COMMAND = 'npm run db:dumps:restore';

const CONNECTOR_ID = '5af041e3-6657-4064-a89a-390135440967';
const CONNECTOR_CLASS_ID = 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970';
const PIVOT_SCHEMAS_GUIDE_ID = '0b0595bb-d11e-49f7-8b76-15e2b6cd43a5';

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

  const state = dryRun ? null : await inspectPlatformDb(mod.absDir, env);
  const ready = Boolean(state && isPlatformReady(state));

  if (skipIfReady && !dryRun && ready) {
    logger.info(
      `${mod.id}: схема "${schema}" уже наполнена (${state.metaCount} миграций) — пропуск. Повторно: npm run db`,
    );
    await ensurePlatformData(mod.absDir, env);
    return { ok: true, skipped: true };
  }

  let command = DB_COMMAND;
  let runCommand = true;
  if (ready && !skipIfReady) {
    logger.info(`${mod.id}: схема "${schema}" уже есть — миграции не трогаю, дальше ключ и тестовый куб`);
    runCommand = false;
  } else if (skipIfReady && state?.metaCount > 0 && !ready) {
    logger.info(
      `${mod.id}: схема "${schema}" есть, но нет коннектора/дампов — донакатываю данные`,
    );
    command = DUMPS_COMMAND;
  } else {
    logger.info(`${mod.id}: новая схема "${schema}" — создаю и накатываю миграции, сиды и дампы`);
  }

  if (runCommand) {
    logger.pkg(mod.id, dryRun ? `dry-run ${command}` : command);
    if (dryRun) {
      return { ok: true };
    }

    const result = await spawnCommand(command, {
      cwd: mod.absDir,
      env,
      onLine: (line) => logger.pkg(mod.id, line),
    }).done;
    if (result.code !== 0) {
      throw new Error(
        `${mod.id}: не удалось создать схему "${schema}" (${command}, код ${result.code}).\n` +
          'У пользователя БД должны быть права CREATE на базу (CREATE SCHEMA).',
      );
    }
  } else if (dryRun) {
    return { ok: true };
  }

  await ensurePlatformData(mod.absDir, env);
  logger.ok(`${mod.id}: схема "${schema}" создана и наполнена`);
  if (!skipLicense) {
    const answers = await askDbSetup(modules);
    if (answers.demoCube) {
      await withPg(mod.absDir, env, (client) => seedDemoCube(client, env));
    } else {
      logger.info('тестовый куб не создан (пустая аналитика, только метаданные платформы)');
    }
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

function isPlatformReady(state) {
  return Boolean(
    state &&
      state.metaCount > 0 &&
      state.hasConnector &&
      state.hasPivotSchemasGuide &&
      state.hasPivotSchemasTable,
  );
}

async function withPg(modAbsDir, env, fn) {
  const requireFromMod = createRequire(path.join(modAbsDir, 'package.json'));
  const pg = requireFromMod('pg');
  const ssl = pgSsl(env);
  const client = new pg.Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_DATABASE,
    ssl: ssl || undefined,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.end();
    } catch {
      // already closed
    }
  }
}

async function inspectPlatformDb(modAbsDir, env) {
  const schema = env.DB_SCHEMA || 'pivot';
  try {
    return await withPg(modAbsDir, env, async (client) => {
      const found = await client.query(
        `SELECT COUNT(*)::int AS n
         FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'SequelizeMeta'`,
        [schema],
      );
      if (!found.rows[0]?.n) {
        return {
          metaCount: 0,
          hasConnector: false,
          hasPivotSchemasGuide: false,
          hasPivotSchemasTable: false,
        };
      }
      const meta = await client.query(
        `SELECT COUNT(*)::int AS n FROM ${quoteIdent(schema)}."SequelizeMeta"`,
      );
      const metadataExists = await client.query(
        `SELECT COUNT(*)::int AS n
         FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'Metadata'`,
        [schema],
      );
      let hasConnector = false;
      let hasPivotSchemasGuide = false;
      if (metadataExists.rows[0]?.n) {
        const rows = await client.query(
          `SELECT id::text AS id FROM ${quoteIdent(schema)}."Metadata"
           WHERE id IN ($1, $2)`,
          [CONNECTOR_ID, PIVOT_SCHEMAS_GUIDE_ID],
        );
        const ids = new Set(rows.rows.map((row) => row.id));
        hasConnector = ids.has(CONNECTOR_ID);
        hasPivotSchemasGuide = ids.has(PIVOT_SCHEMAS_GUIDE_ID);
      }
      const tables = await client.query(
        `SELECT table_schema
         FROM information_schema.tables
         WHERE table_name = 'PivotSchemas'
           AND table_schema IN ($1, 'public')`,
        [schema],
      );
      return {
        metaCount: meta.rows[0]?.n || 0,
        hasConnector,
        hasPivotSchemasGuide,
        hasPivotSchemasTable: tables.rows.length > 0,
      };
    });
  } catch (error) {
    logger.warn(`${modAbsDir}: проверка схемы: ${error.message}`);
    return {
      metaCount: 0,
      hasConnector: false,
      hasPivotSchemasGuide: false,
      hasPivotSchemasTable: false,
    };
  }
}

async function ensurePlatformData(modAbsDir, env) {
  const schema = env.DB_SCHEMA || 'pivot';
  await withPg(modAbsDir, env, async (client) => {
    await upsertSredaPivotConnector(client, env, schema);
    await createPivotSchemasTable(client, schema);
  });
  logger.ok(`${path.basename(modAbsDir)}: коннектор SREDA_pivot и таблица PivotSchemas готовы`);
}

async function upsertSredaPivotConnector(client, env, schema) {
  const now = new Date().toISOString();
  const manifest = JSON.stringify({
    owner_id: CONNECTOR_CLASS_ID,
    class_id: CONNECTOR_CLASS_ID,
    class: 'Connector',
    name: 'SREDA_pivot',
    description: 'Для внутренних нужд сервиса pivot',
    settings: {
      id: CONNECTOR_ID,
      dialect: 'postgres',
      host: env.DB_HOST || '',
      port: Number(env.DB_PORT) || 5432,
      database: env.DB_DATABASE || '',
      schema,
      user: env.DB_USER || '',
      searchPath: schema,
      pool: '',
      cluster: '',
      connection_string: '',
      gss: false,
    },
    events: {},
  });
  await client.query(
    `INSERT INTO ${quoteIdent(schema)}."Metadata"
      (id, markdel, parent, class_id, class, name, description, manifest, rank, "createdAt", "updatedAt")
     VALUES ($1, 0, $2, $2, 'Connector', 'SREDA_pivot',
             'Для внутренних нужд сервиса pivot', $3, 0, $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       parent = EXCLUDED.parent,
       class_id = EXCLUDED.class_id,
       class = EXCLUDED.class,
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       manifest = EXCLUDED.manifest,
       markdel = 0,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [CONNECTOR_ID, CONNECTOR_CLASS_ID, manifest, now],
  );
}

async function createPivotSchemasTable(client, schema) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${quoteIdent(schema)}."PivotSchemas" (
      id uuid PRIMARY KEY,
      name varchar(255),
      code integer,
      markdel boolean DEFAULT false,
      "createdAt" timestamptz,
      "updatedAt" timestamptz,
      "createdUser" uuid,
      "updatedUser" uuid,
      schema_owner text,
      standart_schema boolean,
      schema text,
      snapshot text
    )
  `);
}

async function askDbSetup(modules) {
  const pivot = modules.find((item) => item.id === 'pivot');
  if (!pivot?.exists) {
    logger.warn('модуль pivot не найден, LICENSE_KEY не записан');
  } else {
    const envPath = path.join(pivot.absDir, pivot.envFile || '.env');
    if (!(await pathExists(envPath))) {
      throw new Error(`Нет ${envPath}. Заполните корневой .env и выполните npm start.`);
    }
    const fromFile = await loadEnvFile(envPath);
    let key = '';
    if (process.stdin.isTTY) {
      key = await promptText('введите лицензионный ключ: ');
    } else {
      logger.warn('нет интерактивной консоли, LICENSE_KEY не запрошен');
    }
    if (key) {
      await upsertEnvKey(envPath, 'LICENSE_KEY', key);
      logger.ok('pivot: LICENSE_KEY записан');
    } else if (!fromFile.LICENSE_KEY) {
      logger.warn('ключ не введён, LICENSE_KEY не изменён');
    }
  }

  let demoCube = envWantsDemoCube(process.env);
  if (process.stdin.isTTY) {
    const answer = await promptText('создать тестовый куб? (да/нет): ');
    demoCube = /^(да|д|yes|y|1)$/i.test(answer.trim());
  } else if (demoCube) {
    logger.info('CREATE_DEMO_CUBE=да — создаю тестовый куб без консоли');
  }
  return { demoCube };
}

async function promptText(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return String(await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
