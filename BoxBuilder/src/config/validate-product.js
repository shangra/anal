'use strict';

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const { ProductConfigError } = require('./errors');

const SCHEMA_PATH = path.resolve(__dirname, '../../schemas/product.schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateSchema = ajv.compile(schema);
const WINDOWS_RESERVED_NAME_PATTERN =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function displayPath(instancePath) {
  if (!instancePath) return 'descriptor';
  return instancePath
    .replace(/^\//, '')
    .replace(/\/(\d+)/g, '[$1]')
    .replace(/\//g, '.');
}

function formatSchemaError(error) {
  const location = displayPath(error.instancePath);

  switch (error.keyword) {
    case 'required':
      return `${location}: отсутствует обязательное поле "${error.params.missingProperty}"`;
    case 'additionalProperties':
      return `${location}: неизвестное поле "${error.params.additionalProperty}"`;
    case 'minItems':
      return `${location}: массив не должен быть пустым`;
    case 'minLength':
      return `${location}: значение не должно быть пустым`;
    case 'pattern':
      return `${location}: недопустимый формат значения`;
    case 'const':
      return `${location}: ожидается значение ${JSON.stringify(error.params.allowedValue)}`;
    case 'type':
      return `${location}: ожидается тип ${error.params.type}`;
    case 'oneOf':
      return `${location}: source должен соответствовать ровно одному типу — git или hub`;
    default:
      return `${location}: ${error.message || 'ошибка валидации'}`;
  }
}

function normalizedKey(value) {
  return String(value).normalize('NFC').toLocaleLowerCase('en-US');
}

function collectDuplicates(packages, field) {
  const seen = new Set();
  const duplicates = new Set();

  for (const item of packages) {
    if (!item || typeof item[field] !== 'string') continue;
    const key = normalizedKey(item[field]);
    if (seen.has(key)) duplicates.add(item[field]);
    seen.add(key);
  }

  return [...duplicates];
}

function validatePortableSegments(value, location) {
  const segments = String(value).replace(/\\/g, '/').split('/');
  const issues = [];

  for (const segment of segments) {
    if (WINDOWS_RESERVED_NAME_PATTERN.test(segment)) {
      issues.push(`${location}: имя "${segment}" зарезервировано в Windows`);
    }

    if (/[. ]$/.test(segment)) {
      issues.push(`${location}: сегмент пути не должен заканчиваться точкой или пробелом`);
    }
  }

  return issues;
}

function validateDestination(destination, packageIndex) {
  const issues = [];
  const location = `packages[${packageIndex}].destination`;

  if (typeof destination !== 'string' || destination.length === 0) return issues;

  issues.push(...validatePortableSegments(destination, location));

  if (path.isAbsolute(destination) || path.win32.isAbsolute(destination)) {
    issues.push(`${location}: абсолютный путь запрещён`);
    return issues;
  }

  const portablePath = destination.replace(/\\/g, '/');
  const segments = portablePath.split('/');

  if (segments.includes('..')) issues.push(`${location}: сегмент ".." запрещён`);
  if (segments.includes('.')) issues.push(`${location}: сегмент "." запрещён`);
  if (segments.some((segment) => segment.length === 0)) {
    issues.push(`${location}: пустой сегмент пути запрещён`);
  }

  const packagesRoot = path.resolve('/box', 'packages');
  const resolvedDestination = path.resolve(packagesRoot, destination);
  const relative = path.relative(packagesRoot, resolvedDestination);

  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    issues.push(`${location}: путь должен находиться внутри каталога packages`);
  }

  return issues;
}

function validateProduct(descriptor) {
  const schemaIsValid = validateSchema(descriptor);
  const issues = [];

  if (!schemaIsValid) issues.push(...validateSchema.errors.map(formatSchemaError));

  if (descriptor && typeof descriptor.output === 'string') {
    issues.push(...validatePortableSegments(descriptor.output, 'output'));
  }

  if (descriptor && Array.isArray(descriptor.packages)) {
    for (const name of collectDuplicates(descriptor.packages, 'name')) {
      issues.push(`packages: повторяющееся имя package "${name}"`);
    }

    for (const destination of collectDuplicates(descriptor.packages, 'destination')) {
      issues.push(`packages: повторяющийся destination "${destination}"`);
    }

    descriptor.packages.forEach((item, index) => {
      if (item) issues.push(...validateDestination(item.destination, index));
    });
  }

  const uniqueIssues = [...new Set(issues)];
  if (uniqueIssues.length > 0) {
    throw new ProductConfigError(
      `Descriptor не прошёл валидацию (${uniqueIssues.length} ошибок)`,
      uniqueIssues
    );
  }

  return descriptor;
}

function resolvePackageDestination(packagesDir, destination) {
  const root = path.resolve(packagesDir);
  const portablePath = String(destination || '').replace(/\\/g, '/');
  const segments = portablePath.split('/');

  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new ProductConfigError(
      `Небезопасный destination: ${JSON.stringify(destination)}`,
      ['destination содержит запрещённый сегмент пути']
    );
  }

  const target = path.resolve(root, ...segments);
  const relative = path.relative(root, target);

  if (
    !destination ||
    path.isAbsolute(destination) ||
    path.win32.isAbsolute(destination) ||
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new ProductConfigError(
      `Небезопасный destination: ${JSON.stringify(destination)}`,
      ['destination должен находиться внутри каталога packages']
    );
  }

  return target;
}

module.exports = {
  validateProduct,
  resolvePackageDestination,
};
