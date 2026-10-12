'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { AssembleError } = require('../config/errors');

const WINDOWS_RETRYABLE_ERRORS = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RETRY_SIGNAL = new Int32Array(new SharedArrayBuffer(4));

function pathExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function renameWithRetry(source, destination, retries = 5) {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(source, destination);
      return;
    } catch (error) {
      if (attempt >= retries || !WINDOWS_RETRYABLE_ERRORS.has(error.code)) {
        throw error;
      }

      Atomics.wait(RETRY_SIGNAL, 0, 0, 100 * (attempt + 1));
    }
  }
}

function createStaging(outputPath) {
  const parent = path.dirname(outputPath);
  const name = path.basename(outputPath);
  fs.mkdirSync(parent, { recursive: true });
  const stagingPath = path.join(parent, `.${name}.staging-${randomUUID()}`);
  fs.mkdirSync(stagingPath, { recursive: false });
  return stagingPath;
}

function publishStaging(stagingPath, outputPath, options = {}) {
  const outputExists = pathExists(outputPath);
  if (outputExists && !options.force) {
    throw new AssembleError(
      `Output уже существует: ${outputPath}. Повторите сборку с --force для замены.`,
      { code: 'OUTPUT_EXISTS', stage: 'publish' }
    );
  }

  if (!outputExists) {
    renameWithRetry(stagingPath, outputPath);
    return;
  }

  const backupPath = `${outputPath}.previous-${randomUUID()}`;
  renameWithRetry(outputPath, backupPath);
  try {
    renameWithRetry(stagingPath, outputPath);
    fs.rmSync(backupPath, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (error) {
    if (!pathExists(outputPath) && pathExists(backupPath)) {
      renameWithRetry(backupPath, outputPath);
    }
    throw error;
  }
}

module.exports = {
  createStaging,
  pathExists,
  publishStaging,
};
