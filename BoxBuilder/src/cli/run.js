'use strict';

const { ProductConfigError, AssembleError } = require('../config/errors');
const { assembleProduct } = require('../commands/assemble');

const USAGE = `Использование:
  box-builder assemble <product> [--force]

Пример:
  box-builder assemble box-flow`;

function printIssues(error, stderr) {
  stderr.write(`Ошибка конфигурации: ${error.message}\n`);
  for (const issue of error.issues) stderr.write(`  - ${issue}\n`);
}

async function runCli(args, options = {}) {
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const assemble = options.assembleProduct || options.prepareAssemble || assembleProduct;

  if (args.includes('--help') || args.includes('-h')) {
    stdout.write(`${USAGE}\n`);
    return 0;
  }

  const [command, productId, ...flags] = args;
  const unsupportedFlags = flags.filter((flag) => flag !== '--force');

  if (
    command !== 'assemble' ||
    !productId ||
    unsupportedFlags.length > 0 ||
    flags.filter((flag) => flag === '--force').length > 1
  ) {
    stderr.write(`${USAGE}\n`);
    return 2;
  }

  try {
    const result = await assemble(productId, {
      ...options,
      force: flags.includes('--force'),
    });

    stdout.write(`Descriptor: ${result.descriptorPath}\n`);
    stdout.write(`Продукт: ${result.descriptor.name}\n`);
    stdout.write(`Output: ${result.outputPath}\n`);
    stdout.write(`Packages: ${result.packages.length}\n`);
    for (const packageResult of result.packages) {
      stdout.write(
        `  - ${packageResult.name} (${packageResult.source.type}) -> packages/${packageResult.destination}\n`
      );
    }
    stdout.write(`Manifest: ${result.manifestPath}\n`);
    stdout.write('Сборка успешно завершена.\n');
    return 0;
  } catch (error) {
    if (error instanceof ProductConfigError) {
      printIssues(error, stderr);
      return 2;
    }

    if (error instanceof AssembleError) {
      const context = [error.stage, error.packageName].filter(Boolean).join('/');
      stderr.write(`Ошибка сборки${context ? ` [${context}]` : ''}: ${error.message}\n`);
      return 1;
    }

    stderr.write(`Внутренняя ошибка BoxBuilder: ${error.stack || error.message || error}\n`);
    return 1;
  }
}

module.exports = {
  runCli,
  USAGE,
};
