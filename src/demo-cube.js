import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import {
  buildEtalonMetadata,
  CONNECTOR_PIVOT,
  CUBE_ID,
  CUBES_CLASS,
  INFOSERVICE_CLASS,
} from './demo-cube-meta.js';

const PAGE_ID = '9c8e1a20-7d4b-4f3a-9b2e-0000000000a0';
const OLAP_PARENT = '6f9de64d-75e3-4ef4-9cdb-a6f07c31db2d';
const OLAP_TEMPLATE = '4a46875c-5b6f-4aa2-8399-0d51e0588d7b';

const dumpsDir = join(dirname(fileURLToPath(import.meta.url)), 'demo-dumps');
const TABLE_DATA = JSON.parse(readFileSync(join(dumpsDir, 'tables.json'), 'utf8'));

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function isYes(value) {
  return /^(да|д|yes|y|1|true)$/i.test(String(value || '').trim());
}

export function envWantsDemoCube(env = process.env) {
  return isYes(env.CREATE_DEMO_CUBE);
}

export async function seedDemoCube(client, env) {
  const schema = env.DB_SCHEMA || 'pivot';
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)}`);
  await createDimHierarchy(client, schema, 'dim_auto_car_hierarchy');
  await createDimHierarchy(client, schema, 'dim_region_sales');
  await createDimCalc(client, schema);
  await createFactTable(client, schema, 'fact_car_sales');
  await createFactTable(client, schema, 'plan_car_sales');
  await fillRows(client, schema, 'dim_auto_car_hierarchy', TABLE_DATA.dim_auto_car_hierarchy, [
    'id',
    'parent_id',
    'name',
    'sort_order',
    'level',
  ]);
  await fillRows(client, schema, 'dim_region_sales', TABLE_DATA.dim_region_sales, [
    'id',
    'parent_id',
    'name',
    'sort_order',
    'level',
  ]);
  await fillRows(client, schema, 'dim_calculation_method', TABLE_DATA.dim_calculation_method, [
    'id',
    'name',
    'description',
  ]);
  await fillRows(client, schema, 'fact_car_sales', TABLE_DATA.fact_car_sales, factColumns());
  const planRows = TABLE_DATA.plan_car_sales?.length
    ? TABLE_DATA.plan_car_sales
    : TABLE_DATA.fact_car_sales.map((row) => ({
        ...row,
        quantity_sold: round2(row.quantity_sold * 0.92),
        revenue_amount: round2(row.revenue_amount * 0.92),
      }));
  await fillRows(client, schema, 'plan_car_sales', planRows, factColumns());

  const counts = {};
  for (const table of [
    'dim_auto_car_hierarchy',
    'dim_region_sales',
    'dim_calculation_method',
    'fact_car_sales',
    'plan_car_sales',
  ]) {
    counts[table] = await countRows(client, schema, table);
  }
  if (!counts.fact_car_sales) {
    throw new Error(`тестовый куб: в ${schema}.fact_car_sales нет строк`);
  }

  const now = new Date().toISOString();
  const sqlalias = (table) => `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)}`;
  const rows = buildEtalonMetadata(CONNECTOR_PIVOT).map((item) => {
    const settings = { ...item.settings };
    if (settings.table) {
      settings.sqlalias = sqlalias(settings.table);
    }
    return {
      id: item.id,
      markdel: 0,
      parent: item.parent,
      class_id: item.class_id,
      class: item.class,
      name: item.name,
      description: item.description,
      manifest: JSON.stringify({
        owner_id: item.parent,
        class_id: item.class_id,
        class: item.class,
        name: item.name,
        description: item.description,
        settings,
        events: {},
        ...(settings.id ? { id: settings.id } : {}),
      }),
      rank: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
  for (const row of rows) {
    await upsertMeta(client, schema, row);
    await copyMetadataRls(client, schema, row.parent, row.id);
  }
  try {
    await seedOlapPage(client, schema);
  } catch (error) {
    logger.warn(`страница аналитики не создана: ${error.message}`);
  }
  const rlsSchema = (await findTableSchema(client, 'Rls', schema)) || schema;
  const rlsCount = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${quoteIdent(rlsSchema)}."Rls"
     WHERE table_name = 'Metadata' AND table_id = $1`,
    [CUBE_ID],
  );
  logger.ok(
    `тестовый куб «ПродажиАвтомобилей» ${CUBE_ID} в ${schema}: fact=${counts.fact_car_sales}, plan=${counts.plan_car_sales}, auto=${counts.dim_auto_car_hierarchy}, region=${counts.dim_region_sales}, calc=${counts.dim_calculation_method}, meta=${rows.length}, rls=${rlsCount.rows[0]?.n || 0}`,
  );
  return {
    cubeId: CUBE_ID,
    schema,
    tables: Object.keys(counts),
  };
}

function factColumns() {
  return [
    'id',
    'dim_auto_id',
    'report_date',
    'dim_region_id',
    'dim_calc_method_id',
    'quantity_sold',
    'revenue_amount',
    'avg_price',
  ];
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function createDimHierarchy(client, schema, table) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${q} (
      id integer PRIMARY KEY,
      parent_id integer,
      name text NOT NULL,
      sort_order integer,
      level integer
    )
  `);
}

async function createDimCalc(client, schema) {
  const q = `${quoteIdent(schema)}.${quoteIdent('dim_calculation_method')}`;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${q} (
      id integer PRIMARY KEY,
      name text NOT NULL,
      description text
    )
  `);
}

async function createFactTable(client, schema, table) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${q} (
      id integer PRIMARY KEY,
      dim_auto_id integer NOT NULL,
      report_date date NOT NULL,
      dim_region_id integer NOT NULL,
      dim_calc_method_id integer NOT NULL,
      quantity_sold numeric(18,2) NOT NULL,
      revenue_amount numeric(18,2) NOT NULL,
      avg_price numeric(18,2) NOT NULL
    )
  `);
}

async function fillRows(client, schema, table, rows, columns) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  await client.query(`DELETE FROM ${q}`);
  if (!rows.length) return;
  const placeholders = [];
  const params = [];
  let i = 0;
  for (const row of rows) {
    const slice = [];
    for (const col of columns) {
      params.push(row[col] ?? null);
      i += 1;
      slice.push(`$${i}`);
    }
    placeholders.push(`(${slice.join(',')})`);
  }
  const cols = columns.map(quoteIdent).join(', ');
  await client.query(`INSERT INTO ${q} (${cols}) VALUES ${placeholders.join(',')}`, params);
}

async function countRows(client, schema, table) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  const res = await client.query(`SELECT COUNT(*)::int AS n FROM ${q}`);
  return res.rows[0]?.n || 0;
}

async function upsertMeta(client, schema, row) {
  await client.query(
    `INSERT INTO ${quoteIdent(schema)}."Metadata"
      (id, markdel, parent, class_id, class, name, description, manifest, rank, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       parent = EXCLUDED.parent,
       class_id = EXCLUDED.class_id,
       class = EXCLUDED.class,
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       manifest = EXCLUDED.manifest,
       markdel = 0,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [
      row.id,
      row.markdel,
      row.parent,
      row.class_id,
      row.class,
      row.name,
      row.description,
      row.manifest,
      row.rank,
      row.createdAt,
      row.updatedAt,
    ],
  );
}

async function findTableSchema(client, table, preferred) {
  const res = await client.query(
    `SELECT table_schema
     FROM information_schema.tables
     WHERE table_name = $1
       AND table_schema NOT IN ('pg_catalog', 'information_schema')
     ORDER BY CASE WHEN table_schema = $2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [table, preferred],
  );
  return res.rows[0]?.table_schema || null;
}

const ROOT_META = '00000000-0000-0000-0000-000000000000';
const DEFAULT_METADATA_RLS = [
  ['users', 'read', 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4'],
  ['users', 'view', 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4'],
  ['users', 'write', 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4'],
  ['roles', 'read', 'bb38d4d1-baa0-41cd-ab48-248e484d4c47'],
  ['roles', 'view', 'bb38d4d1-baa0-41cd-ab48-248e484d4c47'],
  ['roles', 'read', '3af59785-f991-4000-b7e0-f415f86d83f2'],
  ['roles', 'view', '3af59785-f991-4000-b7e0-f415f86d83f2'],
  ['roles', 'write', '3af59785-f991-4000-b7e0-f415f86d83f2'],
  ['rules', 'view', '12e32c9d-6e4f-4d57-ae22-5cddaabf343c'],
];

async function copyMetadataRls(client, schema, parentId, childId) {
  const rlsSchema = (await findTableSchema(client, 'Rls', schema)) || schema;
  const rls = `${quoteIdent(rlsSchema)}."Rls"`;
  const sources = [parentId, CUBES_CLASS, INFOSERVICE_CLASS, ROOT_META];
  for (const sourceId of sources) {
    if (!sourceId || sourceId === childId) continue;
    await client.query(
      `INSERT INTO ${rls} (table_name, table_id, owner, type, owner_id, "createdAt", "updatedAt")
       SELECT table_name, $1, owner, type, owner_id, NOW(), NOW()
       FROM ${rls}
       WHERE table_name = 'Metadata' AND table_id = $2
       ON CONFLICT DO NOTHING`,
      [childId, sourceId],
    );
  }
  const existing = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${rls} WHERE table_name = 'Metadata' AND table_id = $1`,
    [childId],
  );
  if (existing.rows[0]?.n > 0) {
    return;
  }
  for (const [owner, type, ownerId] of DEFAULT_METADATA_RLS) {
    await client.query(
      `INSERT INTO ${rls} (table_name, table_id, owner, type, owner_id, "createdAt", "updatedAt")
       VALUES ('Metadata', $1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [childId, owner, type, ownerId],
    );
  }
}

async function seedOlapPage(client, schema) {
  const pagesSchema = await findTableSchema(client, 'Pages', schema);
  const paramsSchema = await findTableSchema(client, 'PageParams', pagesSchema || schema);
  const tparamsSchema = await findTableSchema(client, 'TemplateParams', pagesSchema || schema);
  if (!pagesSchema) {
    logger.warn('таблица Pages не найдена — куб в дереве аналитики не повесил');
    return;
  }
  const pages = `${quoteIdent(pagesSchema)}."Pages"`;
  const params = `${quoteIdent(paramsSchema || pagesSchema)}."PageParams"`;
  const tparams = `${quoteIdent(tparamsSchema || pagesSchema)}."TemplateParams"`;
  const parent = await client.query(`SELECT id, uri FROM ${pages} WHERE id = $1 AND markdel = 0`, [
    OLAP_PARENT,
  ]);
  if (!parent.rows[0]) {
    logger.warn('страница-родитель OLAP не найдена — куб в дереве аналитики не повесил');
    return;
  }
  const parentUri = String(parent.rows[0].uri || '').replace(/\/$/, '');
  const uri = `${parentUri}/prodazhiautomobilej`;
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO ${pages}
       (id, markdel, rank, name, description, uri, urifind, parent, active, link, content_type, template, "createdAt", "updatedAt")
     VALUES ($1, 0, 0, $2, $3, $4, $4, $5, 1, $8, 'application/json', $6, $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       uri = EXCLUDED.uri,
       urifind = EXCLUDED.urifind,
       parent = EXCLUDED.parent,
       active = 1,
       markdel = 0,
       template = EXCLUDED.template,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [PAGE_ID, 'prodazhiautomobilej', 'ПродажиАвтомобилей', uri, OLAP_PARENT, OLAP_TEMPLATE, now, '00000000-0000-0000-0000-000000000000'],
  );
  const cubeParam = await client.query(
    `SELECT id FROM ${tparams} WHERE template_id = $1 AND name = 'cubeId' AND markdel = 0 LIMIT 1`,
    [OLAP_TEMPLATE],
  );
  if (!cubeParam.rows[0]) {
    logger.warn('у шаблона OLAP нет параметра cubeId — страница без привязки к кубу');
    return;
  }
  await upsertPageParam(client, params, '9c8e1a20-7d4b-4f3a-9b2e-0000000000a1', PAGE_ID, cubeParam.rows[0].id, CUBE_ID, now);
  const serverParam = await client.query(
    `SELECT id FROM ${tparams} WHERE template_id = $1 AND name = 'server' AND markdel = 0 LIMIT 1`,
    [OLAP_TEMPLATE],
  );
  if (serverParam.rows[0]) {
    await upsertPageParam(
      client,
      params,
      '9c8e1a20-7d4b-4f3a-9b2e-0000000000a2',
      PAGE_ID,
      serverParam.rows[0].id,
      'pivot',
      now,
    );
  }
  logger.ok(`страница аналитики ${uri}`);
}

async function upsertPageParam(client, table, id, pageId, templateParamId, value, now) {
  const existing = await client.query(
    `SELECT id FROM ${table} WHERE page_id = $1 AND template_param_id = $2 LIMIT 1`,
    [pageId, templateParamId],
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE ${table} SET value = $1, markdel = 0, "updatedAt" = $2 WHERE id = $3`,
      [value, now, existing.rows[0].id],
    );
    return;
  }
  await client.query(
    `INSERT INTO ${table} (id, markdel, page_id, template_param_id, value, "createdAt", "updatedAt")
     VALUES ($1, 0, $2, $3, $4, $5, $5)`,
    [id, pageId, templateParamId, value, now],
  );
}
