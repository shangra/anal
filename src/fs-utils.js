import fs from 'node:fs/promises';

export async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  let raw = await fs.readFile(filePath, 'utf8');
  // package.json из-под Windows иногда сохраняется с BOM, JSON.parse на нём падает
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  return JSON.parse(raw);
}
