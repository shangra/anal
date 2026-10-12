'use strict';

const { AssembleError } = require('../config/errors');

async function fetchHubPackage(packageDescriptor) {
  const { module, version } = packageDescriptor.source;
  throw new AssembleError(
    `Hub adapter не настроен для package "${packageDescriptor.name}" (${module}@${version}). ` +
      'Нужен согласованный REST endpoint или контракт CLI sbr.',
    {
      code: 'HUB_NOT_CONFIGURED',
      stage: 'fetch',
      packageName: packageDescriptor.name,
    }
  );
}

module.exports = {
  fetchHubPackage,
};
