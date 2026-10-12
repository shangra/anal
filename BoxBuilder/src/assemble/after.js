'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { AssembleError } = require('../config/errors');

function splitCommand(command) {
  const parts = [];
  const pattern = /"([^"]*)"|'([^']*)'|\S+/g;
  let match = pattern.exec(command);
  while (match) {
    parts.push(match[1] ?? match[2] ?? match[0]);
    match = pattern.exec(command);
  }
  return parts;
}

function npxCli() {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(nodeDir, '..', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ];
  return candidates.find((item) => fs.existsSync(item));
}

function runInherit(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`код ${code}`));
    });
  });
}

/** Команды сборщика. Не записываются в файлы коробки заказчика. */
async function runAssembleAfter(stagingPath, descriptor) {
  for (const item of descriptor.packages || []) {
    if (!item.assembleAfter) continue;
    const parts = splitCommand(item.assembleAfter);
    if (parts[0] !== 'npx') {
      throw new AssembleError(
        `assembleAfter поддерживает только npx: ${item.assembleAfter}`,
        {
          code: 'ASSEMBLE_AFTER_FAILED',
          stage: 'after',
          packageName: item.name,
        }
      );
    }
    const cli = npxCli();
    if (!cli) {
      throw new AssembleError(`Не найден npx-cli.js рядом с node (${process.execPath})`, {
        code: 'ASSEMBLE_AFTER_FAILED',
        stage: 'after',
        packageName: item.name,
      });
    }
    const cwd = path.join(stagingPath, 'packages', item.destination);
    process.stdout.write(`${item.destination}: ${item.assembleAfter}\n`);
    try {
      await runInherit(process.execPath, [cli, ...parts.slice(1)], cwd);
    } catch (error) {
      throw new AssembleError(
        `Не удалось выполнить ${item.assembleAfter} в ${item.destination}: ${error.message}`,
        {
          code: 'ASSEMBLE_AFTER_FAILED',
          stage: 'after',
          packageName: item.name,
          cause: error,
        }
      );
    }
  }
}

module.exports = {
  runAssembleAfter,
};
