'use strict';

const fs = require('fs');
const path = require('path');
const { ProductConfigError } = require('./errors');
const { validateProduct } = require('./validate-product');

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function parseJson(text, descriptorPath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ProductConfigError(
      `Не удалось разобрать JSON descriptor: ${descriptorPath}`,
      [`Некорректный JSON: ${error.message}`],
      { cause: error }
    );
  }
}

function readDescriptor(descriptorPath) {
  try {
    return fs.readFileSync(descriptorPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ProductConfigError(
        `Descriptor не найден: ${descriptorPath}`,
        ['Проверьте имя продукта и наличие файла в каталоге products'],
        { cause: error }
      );
    }

    if (error.code === 'EACCES') {
      throw new ProductConfigError(
        `Нет доступа к descriptor: ${descriptorPath}`,
        ['Проверьте права на чтение файла'],
        { cause: error }
      );
    }

    throw new ProductConfigError(
      `Не удалось прочитать descriptor: ${descriptorPath}`,
      [error.message],
      { cause: error }
    );
  }
}

function loadProduct(productId, options = {}) {
  if (!PRODUCT_ID_PATTERN.test(productId || '')) {
    throw new ProductConfigError(
      `Некорректное имя продукта: ${JSON.stringify(productId)}`,
      ['Допустимы латинские буквы, цифры, точка, дефис и подчёркивание']
    );
  }

  const projectRoot = options.projectRoot || path.resolve(__dirname, '../..');
  const productsDir = path.resolve(projectRoot, 'products');
  const descriptorPath = path.resolve(productsDir, `${productId}.json`);
  const relative = path.relative(productsDir, descriptorPath);

  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new ProductConfigError('Путь descriptor выходит за пределы каталога products');
  }

  const descriptor = parseJson(readDescriptor(descriptorPath), descriptorPath);
  validateProduct(descriptor);

  return { descriptor, descriptorPath };
}

module.exports = {
  loadProduct,
};
