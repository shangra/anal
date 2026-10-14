'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { AssembleError } = require('../config/errors');

/** Registry банка. Используется только сборщиком, в файлы коробки не пишется. */
const BANK_REGISTRY = 'https://sberosc.sigma.sbrf.ru/repo/npm/';

function npmCli() {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
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

/**
 * Ставит зависимости workspace с registry банка до публикации коробки.
 * Токен берётся из npm-конфига машины сборки (~/.npmrc), в коробку не копируется.
 * В коробку попадает уже собранный node_modules.
 */
async function installWorkspaceDeps(stagingPath) {
  const cli = npmCli();
  if (!cli) {
    throw new AssembleError(`Не найден npm-cli.js рядом с node (${process.execPath})`, {
      code: 'ASSEMBLE_DEPS_FAILED',
      stage: 'deps',
    });
  }

  const args = [
    'i',
    '--legacy-peer-deps',
    '--workspaces',
    '--registry',
    BANK_REGISTRY,
  ];
  process.stdout.write(`Зависимости с registry банка: npm ${args.join(' ')}\n`);
  try {
    await runInherit(process.execPath, [cli, ...args], stagingPath);
  } catch (error) {
    throw new AssembleError(
      `Не удалось установить зависимости с registry банка: ${error.message}. На машине сборки должен быть доступ к ${BANK_REGISTRY} (токен в пользовательском .npmrc).`,
      {
        code: 'ASSEMBLE_DEPS_FAILED',
        stage: 'deps',
        cause: error,
      }
    );
  }

  const lockFile = path.join(stagingPath, 'package-lock.json');
  if (fs.existsSync(lockFile)) fs.rmSync(lockFile, { force: true });
}

module.exports = {
  installWorkspaceDeps,
  BANK_REGISTRY,
};
