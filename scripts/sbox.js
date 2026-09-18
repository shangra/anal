#!/usr/bin/env node
/**
 * Упаковка каталога в сжатый .sbox и распаковка обратно.
 *
 * Бинарник:
 *   node scripts/sbox.js pack   workspace/frontend-adm frontend-adm.sbox
 *   node scripts/sbox.js unpack frontend-adm.sbox workspace/frontend-adm
 *
 * Текст для вставки в чат (DeepSeek и т.п.):
 *   node scripts/sbox.js to-b64 frontend-adm.sbox frontend-adm.sbox.txt
 *   node scripts/sbox.js unpack frontend-adm.sbox.txt workspace/frontend-adm
 *
 * to-b64 режет текст на части ~50 KB, чтобы влезало в одно сообщение.
 * Один файл без нарезки:  node scripts/sbox.js to-b64 in.sbox out.txt --split 0
 */
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const MAGIC = Buffer.from('SBOX');
const VERSION = 1;
const CODEC_BROTLI = 2;
const TYPE_FILE = 0;
const TYPE_DIR = 1;
const B64_WRAP = 76;
const DEFAULT_SPLIT = 50_000;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.idea',
  '.vscode',
  'build',
  'dist',
  'coverage',
  '.cache',
  '.parcel-cache',
  '.turbo',
  '.next',
  'out',
  'logs',
  '__pycache__',
]);

const SKIP_FILES = new Set(['.ds_store', 'thumbs.db', '.eslintcache']);

function usage(code = 0) {
  process.stdout.write(`usage:
  node scripts/sbox.js pack    <srcDir> <out.sbox> [--all]
  node scripts/sbox.js unpack  <in.sbox|in.txt> <dstDir>
  node scripts/sbox.js to-b64  <in.sbox> <out.txt> [--split N]
  node scripts/sbox.js from-b64 <in.txt> <out.sbox>
  node scripts/sbox.js ingest  <dump.txt> [inboxDir]
  node scripts/sbox.js status  [inboxDir]
`);
  process.exit(code);
}

function toPosix(rel) {
  return rel.split(path.sep).join('/');
}

function shouldSkip(name, includeAll) {
  if (includeAll) {
    return false;
  }
  const lower = name.toLowerCase();
  if (SKIP_DIRS.has(name) || SKIP_FILES.has(lower)) {
    return true;
  }
  if (lower.endsWith('.log') || lower.endsWith('.map') || lower.endsWith('.sbox')) {
    return true;
  }
  return false;
}

async function walk(root, includeAll) {
  const entries = [];

  async function visit(abs, rel) {
    const list = await fsp.readdir(abs, { withFileTypes: true });
    let fileCount = 0;
    for (const item of list) {
      if (shouldSkip(item.name, includeAll)) {
        continue;
      }
      const childAbs = path.join(abs, item.name);
      const childRel = rel ? `${rel}/${item.name}` : item.name;
      if (item.isDirectory()) {
        const nested = await visit(childAbs, childRel);
        if (nested === 0) {
          entries.push({ type: TYPE_DIR, rel: childRel, data: Buffer.alloc(0) });
        }
        fileCount += Math.max(nested, 1);
      } else if (item.isFile()) {
        const data = await fsp.readFile(childAbs);
        entries.push({ type: TYPE_FILE, rel: childRel, data });
        fileCount += 1;
      }
    }
    return fileCount;
  }

  await visit(root, '');
  entries.sort((a, b) => a.rel.localeCompare(b.rel, 'en'));
  return entries;
}

function encodePayload(entries) {
  const chunks = [];
  const count = Buffer.alloc(4);
  count.writeUInt32LE(entries.length);
  chunks.push(count);

  for (const entry of entries) {
    const name = Buffer.from(entry.rel, 'utf8');
    if (name.length > 0xffff) {
      throw new Error(`слишком длинный путь: ${entry.rel}`);
    }
    if (entry.data.length > 0xffffffff) {
      throw new Error(`слишком большой файл: ${entry.rel}`);
    }
    const head = Buffer.alloc(2 + name.length + 1 + 4);
    head.writeUInt16LE(name.length, 0);
    name.copy(head, 2);
    head.writeUInt8(entry.type, 2 + name.length);
    head.writeUInt32LE(entry.data.length, 2 + name.length + 1);
    chunks.push(head, entry.data);
  }

  return Buffer.concat(chunks);
}

function decodePayload(payload) {
  if (payload.length < 4) {
    throw new Error('битый архив: нет заголовка');
  }
  const count = payload.readUInt32LE(0);
  const entries = [];
  let offset = 4;
  for (let i = 0; i < count; i += 1) {
    if (offset + 2 > payload.length) {
      throw new Error('битый архив: оборван список файлов');
    }
    const nameLen = payload.readUInt16LE(offset);
    offset += 2;
    const rel = payload.subarray(offset, offset + nameLen).toString('utf8');
    offset += nameLen;
    const type = payload.readUInt8(offset);
    offset += 1;
    const size = payload.readUInt32LE(offset);
    offset += 4;
    const data = payload.subarray(offset, offset + size);
    offset += size;
    entries.push({ type, rel, data });
  }
  return entries;
}

function wrapArchive(payload) {
  const compressed = zlib.brotliCompressSync(payload, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: payload.length,
    },
  });
  const header = Buffer.alloc(10);
  MAGIC.copy(header, 0);
  header.writeUInt8(VERSION, 4);
  header.writeUInt8(CODEC_BROTLI, 5);
  header.writeUInt32LE(payload.length, 6);
  return { packed: Buffer.concat([header, compressed]), rawBytes: payload.length };
}

function unwrapArchive(blob) {
  if (blob.length < 10 || blob.subarray(0, 4).toString() !== 'SBOX') {
    throw new Error('это не .sbox архив');
  }
  const version = blob.readUInt8(4);
  if (version !== VERSION) {
    throw new Error(`неизвестная версия архива: ${version}`);
  }
  const codec = blob.readUInt8(5);
  if (codec !== CODEC_BROTLI) {
    throw new Error(`неизвестный кодек: ${codec}`);
  }
  const compressed = blob.subarray(10);
  return zlib.brotliDecompressSync(compressed);
}

function assertSafeRel(rel) {
  const normalized = toPosix(rel);
  if (!normalized || normalized.startsWith('/') || normalized.includes('\\')) {
    throw new Error(`небезопасный путь: ${rel}`);
  }
  const parts = normalized.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`небезопасный путь: ${rel}`);
  }
  return normalized;
}

function formatBytes(n) {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function wrapBase64(b64, width = B64_WRAP) {
  const lines = [];
  for (let i = 0; i < b64.length; i += width) {
    lines.push(b64.slice(i, i + width));
  }
  return lines.join('\n');
}

function parseSplit(args) {
  const index = args.indexOf('--split');
  if (index === -1) {
    return DEFAULT_SPLIT;
  }
  const raw = args[index + 1];
  if (raw === undefined || raw.startsWith('--')) {
    throw new Error('укажите размер после --split, например --split 50000');
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`некорректный --split: ${raw}`);
  }
  return Math.floor(value);
}

function looksLikeBase64Text(buf) {
  if (buf.length >= 4 && buf.subarray(0, 4).equals(MAGIC)) {
    return false;
  }
  const sample = buf.subarray(0, Math.min(buf.length, 800)).toString('utf8');
  return sample.includes('SBOX-B64') || /^[A-Za-z0-9+/=\s#:-]+$/.test(sample);
}

function stripBase64Text(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('SBOX-B64');
    })
    .join('')
    .replace(/\s+/g, '');
}

const B64_HEADER_RE =
  /^SBOX-B64[ \t]+sha256=([a-f0-9]+)[ \t]+bytes=(\d+)[ \t]+part=(\d+)\/(\d+)[ \t]*$/i;

function parseB64Header(line) {
  const match = String(line).trim().match(B64_HEADER_RE);
  if (!match) {
    return null;
  }
  return {
    sha256: match[1].toLowerCase(),
    bytes: Number(match[2]),
    index: Number(match[3]),
    total: Number(match[4]),
  };
}

function splitB64Parts(text) {
  const parts = [];
  let current = null;
  const body = [];

  const flush = () => {
    if (!current) {
      return;
    }
    parts.push({
      ...current,
      body: `${body.join('\n').replace(/^\n+/, '').replace(/[ \t\n]+$/, '')}\n`,
    });
    body.length = 0;
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    const header = parseB64Header(line);
    if (header) {
      flush();
      current = header;
      continue;
    }
    if (current) {
      body.push(line);
    }
  }
  flush();
  if (parts.length === 0) {
    throw new Error('в тексте нет блоков SBOX-B64');
  }
  return parts;
}

function formatRanges(nums) {
  if (nums.length === 0) {
    return '';
  }
  const ranges = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i <= nums.length; i += 1) {
    const value = nums[i];
    if (value === prev + 1) {
      prev = value;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = value;
    prev = value;
  }
  return ranges.join(', ');
}

const INBOX_BASE_BY_DIR = {
  'sbox-inbox': 'frontend-adm.sbox.txt',
  'sbox-inbox-adm': 'frontend-adm.sbox.txt',
  'sbox-inbox-pivot': 'sreda-pivot.sbox.txt',
  'sbox-inbox-spreadsheet': 'sreda-analytics-spreadsheet-frontend.sbox.txt',
  'sbox-inbox-migrations': 'sreda-analytics-migrations.sbox.txt',
};

function inboxBaseName(inbox) {
  const name = path.basename(path.resolve(inbox || 'sbox-inbox'));
  return INBOX_BASE_BY_DIR[name] || `${name}.sbox.txt`;
}

function partFileName(base, index, total) {
  const pad = String(total).length;
  return `${base}.part${String(index).padStart(pad, '0')}`;
}

async function listInboxParts(inbox, base, total) {
  const present = [];
  for (let i = 1; i <= total; i += 1) {
    if (await pathExists(path.join(inbox, partFileName(base, i, total)))) {
      present.push(i);
    }
  }
  const missing = [];
  for (let i = 1; i <= total; i += 1) {
    if (!present.includes(i)) {
      missing.push(i);
    }
  }
  return { present, missing };
}

async function detectInboxMeta(inbox, base) {
  const names = (await fsp.readdir(inbox)).filter((name) => name.startsWith(`${base}.part`));
  names.sort();
  if (names.length === 0) {
    return null;
  }
  const first = parseB64Header((await fsp.readFile(path.join(inbox, names[0]), 'utf8')).split(/\r?\n/, 1)[0]);
  if (!first) {
    throw new Error(`не разобрал заголовок: ${names[0]}`);
  }
  return first;
}

async function printInboxStatus(inbox, meta) {
  const base = inboxBaseName(inbox);
  const { present, missing } = await listInboxParts(inbox, base, meta.total);
  process.stdout.write(`inbox: ${present.length}/${meta.total}\n`);
  if (missing.length === 0) {
    process.stdout.write('все части на месте, можно unpack\n');
    return;
  }
  process.stdout.write(`нет: ${formatRanges(missing)}\n`);
}

async function ingestDump(dumpPath, inboxDir) {
  const inbox = path.resolve(inboxDir || 'sbox-inbox');
  const text = await fsp.readFile(dumpPath, 'utf8');
  const parts = splitB64Parts(text);
  const meta = parts[0];
  for (const part of parts) {
    if (part.sha256 !== meta.sha256 || part.bytes !== meta.bytes || part.total !== meta.total) {
      throw new Error(`смешаны разные архивы: part=${part.index}/${part.total}`);
    }
    if (part.index < 1 || part.index > part.total) {
      throw new Error(`некорректный номер части: ${part.index}/${part.total}`);
    }
  }

  await fsp.mkdir(inbox, { recursive: true });
  const base = inboxBaseName(inbox);
  let written = 0;
  let skipped = 0;
  for (const part of parts) {
    const dest = path.join(inbox, partFileName(base, part.index, part.total));
    const content =
      `SBOX-B64 sha256=${part.sha256} bytes=${part.bytes} part=${part.index}/${part.total}\n` +
      part.body;
    if (await pathExists(dest)) {
      const prev = await fsp.readFile(dest, 'utf8');
      if (stripBase64Text(prev) !== stripBase64Text(content)) {
        throw new Error(`часть ${part.index} уже есть и содержимое другое`);
      }
      skipped += 1;
      continue;
    }
    await fsp.writeFile(dest, content, 'utf8');
    written += 1;
  }

  const added = parts.map((part) => part.index).sort((a, b) => a - b);
  process.stdout.write(
    `в сообщении: ${parts.length} (${formatRanges(added)}), записано: ${written}, уже были: ${skipped}\n`,
  );
  await printInboxStatus(inbox, meta);
}

async function statusInbox(inboxDir) {
  const inbox = path.resolve(inboxDir || 'sbox-inbox');
  if (!(await pathExists(inbox))) {
    throw new Error(`нет каталога ${inbox}`);
  }
  const meta = await detectInboxMeta(inbox, inboxBaseName(inbox));
  if (!meta) {
    process.stdout.write('inbox пуст\n');
    return;
  }
  await printInboxStatus(inbox, meta);
}

async function pathExists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectB64Sources(inputPath) {
  const abs = path.resolve(inputPath);
  if (await pathExists(abs)) {
    const stat = await fsp.stat(abs);
    if (stat.isDirectory()) {
      const names = (await fsp.readdir(abs))
        .filter((name) => name.includes('.part') || name.endsWith('.txt') || name.endsWith('.b64'))
        .sort();
      if (names.length === 0) {
        throw new Error(`в ${abs} нет текстовых частей`);
      }
      return names.map((name) => path.join(abs, name));
    }
  }

  const dir = path.dirname(abs);
  const base = path.basename(abs);
  const siblings = (await fsp.readdir(dir))
    .filter((name) => name === base || name.startsWith(`${base}.part`))
    .sort();
  const parts = siblings.filter((name) => name.includes('.part'));
  if (parts.length > 0) {
    return parts.map((name) => path.join(dir, name));
  }
  if (siblings.includes(base)) {
    return [abs];
  }
  throw new Error(`нет файла ${abs} и нет частей ${base}.part*`);
}

async function blobFromInput(inputPath) {
  const files = Array.isArray(inputPath) ? inputPath : await collectB64Sources(inputPath);
  const first = await fsp.readFile(files[0]);
  if (files.length === 1 && !looksLikeBase64Text(first)) {
    return first;
  }
  const texts = [];
  for (const file of files) {
    texts.push(await fsp.readFile(file, 'utf8'));
  }
  const compact = stripBase64Text(texts.join('\n'));
  if (!compact) {
    throw new Error('пустой base64');
  }
  return Buffer.from(compact, 'base64');
}

async function writeBase64(blob, outFile, splitChars) {
  const b64 = blob.toString('base64');
  const wrapped = wrapBase64(b64);
  const sha = crypto.createHash('sha256').update(blob).digest('hex');
  const header = `SBOX-B64 sha256=${sha} bytes=${blob.length}`;
  const target = path.resolve(outFile);
  await fsp.mkdir(path.dirname(target), { recursive: true });

  const chunks = [];
  if (splitChars) {
    for (let i = 0; i < wrapped.length; i += splitChars) {
      chunks.push(wrapped.slice(i, i + splitChars));
    }
  } else {
    chunks.push(wrapped);
  }
  const total = chunks.length;

  if (total === 1) {
    await fsp.writeFile(target, `${header} part=1/1\n${wrapped}\n`, 'utf8');
    process.stdout.write(`base64: ${formatBytes(wrapped.length)} → ${outFile}\n`);
    return;
  }

  const pad = String(total).length;
  for (let i = 0; i < total; i += 1) {
    const partPath = `${target}.part${String(i + 1).padStart(pad, '0')}`;
    const body = `${header} part=${i + 1}/${total}\n${chunks[i].replace(/^\n+/, '')}\n`;
    await fsp.writeFile(partPath, body, 'utf8');
  }
  process.stdout.write(
    `base64: ${formatBytes(wrapped.length)}, частей: ${total} (по ~${formatBytes(splitChars)})\n` +
      `файлы: ${path.basename(target)}.part01 … part${String(total).padStart(pad, '0')}\n`,
  );
}

async function pack(srcDir, outFile, includeAll) {
  const src = path.resolve(srcDir);
  const stat = await fsp.stat(src);
  if (!stat.isDirectory()) {
    throw new Error(`не каталог: ${src}`);
  }

  const entries = await walk(src, includeAll);
  if (entries.length === 0) {
    throw new Error(`в ${src} нечего паковать (пусто или всё отфильтровано)`);
  }

  const payload = encodePayload(entries);
  const { packed, rawBytes } = wrapArchive(payload);
  await fsp.mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
  await fsp.writeFile(outFile, packed);

  const files = entries.filter((item) => item.type === TYPE_FILE).length;
  const dirs = entries.filter((item) => item.type === TYPE_DIR).length;
  process.stdout.write(
    `упаковано ${files} файл(ов), ${dirs} пуст. папок\n` +
      `исходник: ${formatBytes(rawBytes)}\n` +
      `архив:    ${formatBytes(packed.length)}  (${outFile})\n` +
      `сжатие:   ${((packed.length / rawBytes) * 100).toFixed(1)}%\n`,
  );
}

async function unpack(inFile, dstDir) {
  const blob = await blobFromInput(inFile);
  const payload = unwrapArchive(blob);
  const entries = decodePayload(payload);
  const dst = path.resolve(dstDir);
  const dstRoot = dst + path.sep;

  await fsp.mkdir(dst, { recursive: true });
  for (const entry of entries) {
    const rel = assertSafeRel(entry.rel);
    const target = path.resolve(dst, ...rel.split('/'));
    if (target !== dst && !target.startsWith(dstRoot)) {
      throw new Error(`выход за каталог: ${rel}`);
    }
    if (entry.type === TYPE_DIR) {
      await fsp.mkdir(target, { recursive: true });
      continue;
    }
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, entry.data);
  }

  const files = entries.filter((item) => item.type === TYPE_FILE).length;
  process.stdout.write(`распаковано ${files} файл(ов) → ${dst}\n`);
}

async function toB64(inFile, outFile, splitChars) {
  const blob = await fsp.readFile(inFile);
  if (blob.length < 4 || blob.subarray(0, 4).toString() !== 'SBOX') {
    throw new Error(`не .sbox файл: ${inFile}`);
  }
  await writeBase64(blob, outFile, splitChars);
}

async function fromB64(inFile, outFile) {
  const blob = await blobFromInput(inFile);
  if (blob.subarray(0, 4).toString() !== 'SBOX') {
    throw new Error('после декодирования это не .sbox');
  }
  await fsp.mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
  await fsp.writeFile(outFile, blob);
  process.stdout.write(`бинарник: ${formatBytes(blob.length)} → ${outFile}\n`);
}

const [cmd, src, dst, ...rest] = process.argv.slice(2);
if (!cmd || cmd === '-h' || cmd === '--help') {
  usage(0);
}

try {
  if (cmd === 'pack') {
    if (!src || !dst) {
      usage(1);
    }
    await pack(src, dst, rest.includes('--all'));
  } else if (cmd === 'unpack') {
    if (!src || !dst) {
      usage(1);
    }
    await unpack(src, dst);
  } else if (cmd === 'to-b64') {
    if (!src || !dst) {
      usage(1);
    }
    await toB64(src, dst, parseSplit(rest));
  } else if (cmd === 'from-b64') {
    if (!src || !dst) {
      usage(1);
    }
    await fromB64(src, dst);
  } else if (cmd === 'ingest') {
    if (!src) {
      usage(1);
    }
    await ingestDump(src, dst);
  } else if (cmd === 'status') {
    await statusInbox(src);
  } else {
    usage(1);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
