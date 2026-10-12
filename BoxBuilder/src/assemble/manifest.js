'use strict';

const fs = require('fs');
const path = require('path');

function writeManifest(stagingPath, descriptor, packages, options = {}) {
  const manifest = {
    manifestVersion: 1,
    product: {
      name: descriptor.name,
      schemaVersion: descriptor.schemaVersion,
    },
    builtAt: (options.now || new Date()).toISOString(),
    packages,
  };
  const manifestPath = path.join(stagingPath, 'build-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  return { manifest, manifestPath };
}

module.exports = {
  writeManifest,
};
