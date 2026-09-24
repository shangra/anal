import { logger } from './logger.js';

const CONNECTOR_ID = '5af041e3-6657-4064-a89a-390135440967';
const CONNECTOR_CLASS = 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970';
const CUBES_CLASS = '4d0cb622-60fc-40db-97d6-be103b26051e';
const INFOSERVICE_CLASS = 'b44b4843-f919-4362-b95c-4c354b2505bd';
const IS_FIELDS_CLASS = '1fa330a3-4b65-42e4-b12f-1fabd0c08945';
const CUBE_LAYERS_CLASS = '75960867-7c8d-486a-ad15-94d387cda86e';
const MEASURES_CLASS = 'b8e2b31f-f36d-4b77-b13d-f391bd96c60a';
const DIMENSIONS_CLASS = '00234649-8eaa-4a3d-9adb-280b01fa8437';
const OWNER_LIST_CLASS = '4bc0bfd0-6fb5-4f85-8668-117a42604ddc';
const AGG_CLASS = '0e71dd74-a34b-4a8a-a5f0-e730901e0e82';

const CUBE_ID = '9c8e1a20-7d4b-4f3a-9b2e-000000000001';
const FACT_IS = '9c8e1a20-7d4b-4f3a-9b2e-000000000010';
const PLAN_IS = '9c8e1a20-7d4b-4f3a-9b2e-000000000011';
const LAYER_FACT = '9c8e1a20-7d4b-4f3a-9b2e-000000000020';
const LAYER_PLAN = '9c8e1a20-7d4b-4f3a-9b2e-000000000021';
const MEAS_REV = '9c8e1a20-7d4b-4f3a-9b2e-000000000030';
const MEAS_UNITS = '9c8e1a20-7d4b-4f3a-9b2e-000000000031';
const DIM_REGION = '9c8e1a20-7d4b-4f3a-9b2e-000000000040';
const DIM_BRAND = '9c8e1a20-7d4b-4f3a-9b2e-000000000041';
const DIM_PERIOD = '9c8e1a20-7d4b-4f3a-9b2e-000000000042';

const FACT_TABLE = 'demo_car_sales';
const PLAN_TABLE = 'demo_car_plan';

const PAGE_ID = '9c8e1a20-7d4b-4f3a-9b2e-0000000000a0';
const OLAP_PARENT = '6f9de64d-75e3-4ef4-9cdb-a6f07c31db2d';
const OLAP_TEMPLATE = '4a46875c-5b6f-4aa2-8399-0d51e0588d7b';

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
  await createFactTable(client, schema, FACT_TABLE);
  await createFactTable(client, schema, PLAN_TABLE);
  await fillFact(client, schema, FACT_TABLE, 1);
  await fillFact(client, schema, PLAN_TABLE, 0.92);
  const factCount = await countRows(client, schema, FACT_TABLE);
  const planCount = await countRows(client, schema, PLAN_TABLE);
  if (!factCount || !planCount) {
    throw new Error(
      `тестовый куб: в ${schema}.${FACT_TABLE}/${PLAN_TABLE} нет строк (факт=${factCount}, план=${planCount})`,
    );
  }

  const now = new Date().toISOString();
  const rows = buildMetadata(schema, now);
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
    `тестовый куб «ПродажиАвтомобилей» в схеме ${schema}: ${FACT_TABLE}=${factCount}, ${PLAN_TABLE}=${planCount}, rls=${rlsCount.rows[0]?.n || 0}`,
  );
  return { cubeId: CUBE_ID, schema, tables: [FACT_TABLE, PLAN_TABLE] };
}

async function createFactTable(client, schema, table) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${q} (
      id uuid PRIMARY KEY,
      region varchar(64) NOT NULL,
      brand varchar(64) NOT NULL,
      sale_period date NOT NULL,
      revenue_amount numeric(18,2) NOT NULL,
      units_sold integer NOT NULL
    )
  `);
}

async function countRows(client, schema, table) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  const res = await client.query(`SELECT COUNT(*)::int AS n FROM ${q}`);
  return res.rows[0]?.n || 0;
}

function tableSqlalias(schema, table) {
  return `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)}`;
}

async function fillFact(client, schema, table, factor) {
  const q = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  await client.query(`DELETE FROM ${q}`);
  const regions = ['Москва', 'Санкт-Петербург', 'Казань'];
  const brands = ['Lada', 'Kia', 'Toyota'];
  const periods = ['2026-01-01', '2026-02-01', '2026-03-01'];
  const values = [];
  const params = [];
  let n = 0;
  let i = 0;
  for (const region of regions) {
    for (const brand of brands) {
      for (const period of periods) {
        n += 1;
        const suffix = String(100000000000 + n).padStart(12, '0');
        const id =
          table === FACT_TABLE
            ? `9c8e1a20-7d4b-4f3a-9b2e-${suffix}`
            : `9c8e1a20-7d4b-4f3a-9b2f-${suffix}`;
        const units = 8 + n;
        const revenue = Math.round((120000 + n * 17500) * factor);
        params.push(id, region, brand, period, revenue, units);
        values.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`);
        i += 6;
      }
    }
  }
  await client.query(
    `INSERT INTO ${q} (id, region, brand, sale_period, revenue_amount, units_sold) VALUES ${values.join(', ')}`,
    params,
  );
}

function buildMetadata(schema, now) {
  const factFields = fieldSet(FACT_IS, '1');
  const planFields = fieldSet(PLAN_IS, '2');
  return [
    meta(
      FACT_IS,
      INFOSERVICE_CLASS,
      INFOSERVICE_CLASS,
      'Infoservice',
      'ФактПродажАвто',
      {
        table: FACT_TABLE,
        sqlalias: tableSqlalias(schema, FACT_TABLE),
        connector: { link: CONNECTOR_CLASS, value: CONNECTOR_ID },
        onoff: false,
      },
      `Факт в ${schema}.${FACT_TABLE}`,
    ),
    meta(
      PLAN_IS,
      INFOSERVICE_CLASS,
      INFOSERVICE_CLASS,
      'Infoservice',
      'ПланПродажАвто',
      {
        table: PLAN_TABLE,
        sqlalias: tableSqlalias(schema, PLAN_TABLE),
        connector: { link: CONNECTOR_CLASS, value: CONNECTOR_ID },
        onoff: false,
      },
      `План в ${schema}.${PLAN_TABLE}`,
    ),
    ...factFields.rows,
    ...planFields.rows,
    meta(CUBE_ID, CUBES_CLASS, CUBES_CLASS, 'Cubes', 'ПродажиАвтомобилей', {}, 'Демо-куб коробки'),
    meta(LAYER_FACT, CUBE_ID, CUBE_LAYERS_CLASS, 'Infoservices', 'Факт', {
      ref: { link: INFOSERVICE_CLASS, value: FACT_IS },
    }),
    meta(LAYER_PLAN, CUBE_ID, CUBE_LAYERS_CLASS, 'Infoservices', 'План', {
      ref: { link: INFOSERVICE_CLASS, value: PLAN_IS },
    }),
    meta(MEAS_REV, CUBE_ID, MEASURES_CLASS, 'Measures', 'Выручка', {
      nameField: 'revenue_amount',
      type: 'float',
      format: 'money',
      aggrFunc: 'SUM',
      onoff: false,
    }),
    meta(MEAS_UNITS, CUBE_ID, MEASURES_CLASS, 'Measures', 'Количество', {
      nameField: 'units_sold',
      type: 'integer',
      format: 'number',
      aggrFunc: 'SUM',
      onoff: false,
    }),
    meta(DIM_REGION, CUBE_ID, DIMENSIONS_CLASS, 'Dimensions', 'Регион', {
      nameField: 'region',
      type: 'string',
      onoff: false,
    }),
    meta(DIM_BRAND, CUBE_ID, DIMENSIONS_CLASS, 'Dimensions', 'Марка', {
      nameField: 'brand',
      type: 'string',
      onoff: false,
    }),
    meta(DIM_PERIOD, CUBE_ID, DIMENSIONS_CLASS, 'Dimensions', 'Период', {
      nameField: 'sale_period',
      type: 'date',
      dimensionType: 'dateDimension',
      onoff: false,
    }),
    agg(MEAS_REV),
    agg(MEAS_UNITS),
    ...owners(MEAS_REV, 'Выручка', factFields.ids.revenue_amount, planFields.ids.revenue_amount),
    ...owners(MEAS_UNITS, 'Количество', factFields.ids.units_sold, planFields.ids.units_sold),
    ...owners(DIM_REGION, 'Регион', factFields.ids.region, planFields.ids.region),
    ...owners(DIM_BRAND, 'Марка', factFields.ids.brand, planFields.ids.brand),
    ...owners(DIM_PERIOD, 'Период', factFields.ids.sale_period, planFields.ids.sale_period),
  ].map((row) => ({ ...row, createdAt: now, updatedAt: now }));
}

function fieldSet(owner, series) {
  const defs = [
    ['region', 'Регион', 'string'],
    ['brand', 'Марка', 'string'],
    ['sale_period', 'Период', 'date'],
    ['revenue_amount', 'Выручка', 'float'],
    ['units_sold', 'Количество', 'integer'],
  ];
  const ids = {};
  const rows = defs.map(([nameField, name, type], index) => {
    const id = `9c8e1a20-7d4b-4f3a-9b2e-00000000${series}0${String(index + 1).padStart(2, '0')}`;
    ids[nameField] = id;
    return meta(id, owner, IS_FIELDS_CLASS, 'Fields', name, {
      nameField,
      type,
      showfield: true,
      onoff: false,
    });
  });
  return { ids, rows };
}

const OWNER_SEQ = {
  [MEAS_REV]: ['9c8e1a20-7d4b-4f3a-9b2e-000000000070', '9c8e1a20-7d4b-4f3a-9b2e-000000000071'],
  [MEAS_UNITS]: ['9c8e1a20-7d4b-4f3a-9b2e-000000000072', '9c8e1a20-7d4b-4f3a-9b2e-000000000073'],
  [DIM_REGION]: ['9c8e1a20-7d4b-4f3a-9b2e-000000000074', '9c8e1a20-7d4b-4f3a-9b2e-000000000075'],
  [DIM_BRAND]: ['9c8e1a20-7d4b-4f3a-9b2e-000000000076', '9c8e1a20-7d4b-4f3a-9b2e-000000000077'],
  [DIM_PERIOD]: ['9c8e1a20-7d4b-4f3a-9b2e-000000000078', '9c8e1a20-7d4b-4f3a-9b2e-000000000079'],
};

function owners(parent, name, factFieldId, planFieldId) {
  const [factId, planId] = OWNER_SEQ[parent];
  return [
    meta(factId, parent, OWNER_LIST_CLASS, 'InfoserviseList', `${name} / Факт`, {
      infoservice: { link: CUBE_LAYERS_CLASS, value: LAYER_FACT },
      field: { link: IS_FIELDS_CLASS, value: factFieldId },
    }),
    meta(planId, parent, OWNER_LIST_CLASS, 'InfoserviseList', `${name} / План`, {
      infoservice: { link: CUBE_LAYERS_CLASS, value: LAYER_PLAN },
      field: { link: IS_FIELDS_CLASS, value: planFieldId },
    }),
  ];
}

function agg(parent) {
  const id =
    parent === MEAS_REV
      ? '9c8e1a20-7d4b-4f3a-9b2e-000000000090'
      : '9c8e1a20-7d4b-4f3a-9b2e-000000000091';
  return meta(id, parent, AGG_CLASS, 'MeasuresAggregations', 'SUM', {
    aggrFunc: 'SUM',
    onoff: false,
    onoffFilter: false,
  });
}

function meta(id, parent, classId, className, name, settings, description = name) {
  return {
    id,
    markdel: 0,
    parent,
    class_id: classId,
    class: className,
    name,
    description,
    manifest: JSON.stringify({
      owner_id: parent,
      class_id: classId,
      class: className,
      name,
      description,
      settings,
      events: {},
    }),
    rank: 0,
  };
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
  const paramId = '9c8e1a20-7d4b-4f3a-9b2e-0000000000a1';
  await upsertPageParam(client, params, paramId, PAGE_ID, cubeParam.rows[0].id, CUBE_ID, now);
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
