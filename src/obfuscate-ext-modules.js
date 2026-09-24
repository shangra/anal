import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathExists } from './fs-utils.js';
import { logger } from './logger.js';

export const OBF_MARK = '/*sreda-obf*/';
export const BAK_DIR_NAME = 'ext_modules.bak';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'coverage',
  'dist',
  'dist-temp',
  'dist-release',
  '__snapshots__',
  BAK_DIR_NAME,
]);

const RESERVED = new Set([
  'arguments',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'global',
  'globalThis',
  'process',
  'Buffer',
  'console',
  'eval',
  'undefined',
  'Infinity',
  'NaN',
  'this',
  'super',
  'import',
  'meta',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'BigInt',
  'Date',
  'RegExp',
  'Error',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'JSON',
  'Math',
  'Reflect',
  'Proxy',
  'Function',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'queueMicrotask',
  'URL',
  'URLSearchParams',
  'TextEncoder',
  'TextDecoder',
  'Intl',
  'Atomics',
  'SharedArrayBuffer',
  'DataView',
  'ArrayBuffer',
  'Uint8Array',
  'Int8Array',
  'Uint16Array',
  'Int16Array',
  'Uint32Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
]);

const PARSE_PLUGINS = [
  ['typescript', { disallowAmbiguousJSXLike: false }],
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'exportDefaultFrom',
  'throwExpressions',
  'logicalAssignment',
  'numericSeparator',
  'objectRestSpread',
  'optionalCatchBinding',
  'optionalChaining',
  'nullishCoalescingOperator',
  'dynamicImport',
  'topLevelAwait',
  'importMeta',
  'importAttributes',
  'decorators-legacy',
];

function loadBabel(fromDir) {
  const require = createRequire(path.join(fromDir, 'package.json'));
  const parser = require('@babel/parser');
  const generateMod = require('@babel/generator');
  const traverseMod = require('@babel/traverse');
  return {
    parse: parser.parse,
    generate: generateMod.default || generateMod,
    traverse: traverseMod.default || traverseMod,
  };
}

function looksDangerous(source) {
  return /\bwith\s*\(/.test(source);
}

function shouldSkipRename(source) {
  return /\beval\s*\(|\bnew\s+Function\b|#\s*[A-Za-z_]/.test(source);
}

function isClassBinding(binding) {
  const p = binding.path;
  if (!p) {
    return false;
  }
  if (p.isClassDeclaration() || p.isClassExpression()) {
    return true;
  }
  if (p.isVariableDeclarator() && p.get('init').isClass()) {
    return true;
  }
  return false;
}

function nextName(used, n) {
  let i = n;
  let name;
  do {
    name = `_0x${i.toString(16)}`;
    i += 1;
  } while (used.has(name) || RESERVED.has(name));
  used.add(name);
  return { name, next: i };
}

function renameScope(scope, used, counter) {
  let n = counter;
  const names = Object.keys(scope.bindings);
  for (const name of names) {
    if (RESERVED.has(name) || name.startsWith('_0x')) {
      continue;
    }
    const binding = scope.bindings[name];
    if (!binding || isClassBinding(binding)) {
      continue;
    }
    if (
      binding.kind === 'const' ||
      binding.kind === 'let' ||
      binding.kind === 'var' ||
      binding.kind === 'hoisted' ||
      binding.kind === 'param' ||
      binding.kind === 'local' ||
      binding.kind === 'module'
    ) {
      const next = nextName(used, n);
      n = next.next;
      try {
        scope.rename(name, next.name);
      } catch {
        used.delete(next.name);
      }
    }
  }
  return n;
}

function parseSource(source, babel) {
  return babel.parse(source, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: true,
    plugins: PARSE_PLUGINS,
  });
}

export function obfuscateSource(source, babel) {
  const ast = parseSource(source, babel);

  if (!looksDangerous(source) && !shouldSkipRename(source)) {
    const used = new Set();
    let counter = 16;
    const seen = new WeakSet();
    const scopes = [];
    babel.traverse(ast, {
      Scopable(p) {
        if (seen.has(p.scope)) {
          return;
        }
        seen.add(p.scope);
        scopes.push(p.scope);
      },
    });
    for (const scope of scopes) {
      counter = renameScope(scope, used, counter);
    }
  }

  const out = babel.generate(ast, {
    compact: true,
    comments: false,
    minified: false,
    retainLines: false,
    jsescOption: { minimal: true },
  });

  return `${OBF_MARK}\n${out.code}\n`;
}

async function walkJsFiles(dir, acc = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      await walkJsFiles(full, acc);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith('.js') && !entry.name.endsWith('.cjs') && !entry.name.endsWith('.mjs')) {
      continue;
    }
    acc.push(full);
  }
  return acc;
}

async function mapPool(items, limit, fn) {
  const size = Math.max(1, limit);
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

export async function ensureExtModulesBackup(pivotRoot) {
  const extRoot = path.join(pivotRoot, 'ext_modules');
  const bakRoot = path.join(pivotRoot, BAK_DIR_NAME);

  if (await pathExists(bakRoot)) {
    logger.info(`исходники уже сохранены: ${bakRoot}`);
    if (!(await pathExists(extRoot))) {
      logger.info('ext_modules нет — копирую из ext_modules.bak');
      await fs.cp(bakRoot, extRoot, { recursive: true });
    }
    return { extRoot, bakRoot, created: false };
  }

  if (!(await pathExists(extRoot))) {
    throw new Error(`Нет ${extRoot} и нет ${bakRoot}`);
  }

  logger.info(`сохраняю исходники: переименовываю ext_modules → ${BAK_DIR_NAME}`);
  await fs.rename(extRoot, bakRoot);
  logger.info('копирую полное дерево обратно в ext_modules (JSON, d.ts, структура как были)');
  await fs.cp(bakRoot, extRoot, { recursive: true });
  return { extRoot, bakRoot, created: true };
}

async function restoreExtModulesFromBackup(extRoot, bakRoot) {
  await fs.rm(extRoot, { recursive: true, force: true });
  await fs.cp(bakRoot, extRoot, { recursive: true });
}

export async function obfuscateExtModules(extRoot, {
  babelFrom,
  dryRun = false,
  force = false,
} = {}) {
  if (!(await pathExists(extRoot))) {
    throw new Error(`Нет каталога ext_modules: ${extRoot}`);
  }

  const pivotRoot = babelFrom || path.resolve(extRoot, '..');
  const babel = loadBabel(pivotRoot);
  const files = await walkJsFiles(extRoot);
  const stats = {
    total: files.length,
    obfuscated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  await mapPool(files, 8, async (file) => {
    const original = await fs.readFile(file, 'utf8');
    if (!force && original.startsWith(OBF_MARK)) {
      stats.skipped += 1;
      return;
    }
    try {
      const next = obfuscateSource(original.replace(/^\uFEFF/, ''), babel);
      if (!dryRun) {
        await fs.writeFile(file, next, 'utf8');
      }
      stats.obfuscated += 1;
    } catch (error) {
      stats.failed += 1;
      stats.errors.push({
        file,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return stats;
}

export async function obfuscatePivotExtModules(boxOrRoot, options = {}) {
  const pivotRoot = typeof boxOrRoot === 'string'
    ? boxOrRoot
    : path.join(boxOrRoot.root, 'sreda-pivot');
  const { extRoot, bakRoot, created } = await ensureExtModulesBackup(pivotRoot);

  if (options.force && !options.dryRun) {
    logger.info('пересобираю ext_modules из ext_modules.bak');
    await restoreExtModulesFromBackup(extRoot, bakRoot);
  }

  logger.info(`обфускация JS по файлам: ${extRoot}`);
  const stats = await obfuscateExtModules(extRoot, {
    babelFrom: pivotRoot,
    ...options,
  });
  stats.bakRoot = bakRoot;
  stats.bakCreated = created;
  logger.ok(
    `обфусцировано ${stats.obfuscated}, пропуск ${stats.skipped}, ошибок ${stats.failed} из ${stats.total}`,
  );
  logger.info(`исходники: ${bakRoot}`);
  for (const item of stats.errors.slice(0, 20)) {
    logger.warn(`${path.relative(extRoot, item.file)}: ${item.message.split('\n')[0]}`);
  }
  if (stats.errors.length > 20) {
    logger.warn(`ещё ошибок: ${stats.errors.length - 20}`);
  }
  return stats;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const positional = args.filter((item) => !item.startsWith('-'));
  const target = path.resolve(
    positional[0] || path.join(process.cwd(), 'workspace', 'sreda-pivot'),
  );
  const pivotRoot = path.basename(target) === 'ext_modules' ? path.resolve(target, '..') : target;
  obfuscatePivotExtModules(pivotRoot, { dryRun, force })
    .then((stats) => {
      if (stats.failed > 0 && stats.obfuscated === 0) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
