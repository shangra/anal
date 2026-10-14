'use strict';

const fs = require('fs');
const path = require('path');
const { loadProduct } = require('../config/load-product');
const { AssembleError } = require('../config/errors');
const { resolvePackageDestination } = require('../config/validate-product');
const { fetchGitPackage } = require('../sources/git');
const { fetchHubPackage } = require('../sources/hub');
const { cleanupTree } = require('../assemble/cleanup');
const { writeManifest } = require('../assemble/manifest');
const { runAssembleAfter } = require('../assemble/after');
const {
  createStaging,
  pathExists,
  publishStaging,
} = require('../assemble/publish');

async function assembleProduct(productId, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.resolve(__dirname, '../..'));
  const { descriptor, descriptorPath } = loadProduct(productId, {
    projectRoot,
  });
  const outputPath = path.resolve(projectRoot, descriptor.output);

  if (path.dirname(outputPath) !== projectRoot) {
    throw new AssembleError('Output должен находиться непосредственно внутри BoxBuilder', {
      code: 'UNSAFE_OUTPUT',
      stage: 'prepare',
    });
  }

  if (pathExists(outputPath) && !options.force) {
    throw new AssembleError(
      `Output уже существует: ${outputPath}. Повторите сборку с --force для замены.`,
      { code: 'OUTPUT_EXISTS', stage: 'prepare' }
    );
  }

  const stagingPath = createStaging(outputPath);
  const packagesDir = path.join(stagingPath, 'packages');
  fs.mkdirSync(packagesDir);
  const packageResults = [];
  const fetchers = {
    git: options.fetchGitPackage || fetchGitPackage,
    hub: options.fetchHubPackage || fetchHubPackage,
  };

  try {
    for (const packageDescriptor of descriptor.packages) {
      const destination = resolvePackageDestination(
        packagesDir,
        packageDescriptor.destination
      );
      const fetcher = fetchers[packageDescriptor.source.type];
      if (!fetcher) {
        throw new AssembleError(
          `Неизвестный source type: ${packageDescriptor.source.type}`,
          {
            code: 'UNKNOWN_SOURCE_TYPE',
            stage: 'fetch',
            packageName: packageDescriptor.name,
          }
        );
      }

      const source = await fetcher(packageDescriptor, destination, options);
      const removed = cleanupTree(destination);
      packageResults.push({
        name: packageDescriptor.name,
        destination: packageDescriptor.destination,
        source,
        cleanup: { removed },
      });
    }

    writeManifest(stagingPath, descriptor, packageResults, { now: options.now });
    writeProductInstaller(stagingPath, descriptor);
    await runAssembleAfter(stagingPath, descriptor);
    publishStaging(stagingPath, outputPath, { force: options.force });

    return {
      descriptor,
      descriptorPath,
      outputPath,
      manifestPath: path.join(outputPath, 'build-manifest.json'),
      packages: packageResults,
    };
  } catch (error) {
    if (pathExists(stagingPath)) {
      fs.rmSync(stagingPath, { recursive: true, force: true });
    }
    if (error instanceof AssembleError) throw error;
    throw new AssembleError(`Сборка прервана: ${error.message}`, {
      code: 'ASSEMBLE_FAILED',
      stage: 'assemble',
      cause: error,
    });
  }
}

function writeProductInstaller(stagingPath, descriptor) {
  const boxSource = path.resolve(__dirname, '../box');
  const indexSource = path.resolve(__dirname, '../product/index.js');
  fs.cpSync(boxSource, path.join(stagingPath, 'box'), { recursive: true });
  fs.copyFileSync(indexSource, path.join(stagingPath, 'index.js'));
  writeProductPackage(stagingPath);
  writeServiceCommands(stagingPath, descriptor);
}

function writeServiceCommands(stagingPath, descriptor) {
  const services = {};
  for (const item of descriptor.packages || []) {
    if (item.commands) services[item.destination] = item.commands;
  }
  fs.writeFileSync(
    path.join(stagingPath, 'box.commands.json'),
    `${JSON.stringify({ services }, null, 2)}\n`,
    'utf8'
  );
}

function writeProductPackage(stagingPath) {
  const productPackage = {
    name: 'box.analytic',
    version: '1.5.0',
    main: 'index.js',
    scripts: {
      setup: 'node index.js',
      boxi: 'node box/07-install-deps.js',
      box: 'node box/09-start-services.js',
      start: 'node box/09-start-services.js',
      test: 'echo "Error: no test specified" && exit 1',
    },
    author: '',
    license: 'ISC',
    description: '',
  };
  fs.writeFileSync(
    path.join(stagingPath, 'package.json'),
    `${JSON.stringify(productPackage, null, 2)}\n`,
    'utf8'
  );
}

module.exports = {
  assembleProduct,
};
