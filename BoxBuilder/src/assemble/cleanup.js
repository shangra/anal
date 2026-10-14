'use strict';

const fs = require('fs');
const path = require('path');

const REMOVED_DIRECTORIES = new Set(['.git', 'node_modules']);
const REMOVED_FILES = new Set(['.env', '.LICENSE_KEY', '.LICENSE.KEY']);

function cleanupTree(root) {
  const removed = [];

  function visit(directory) {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (REMOVED_DIRECTORIES.has(entry.name)) {
        fs.rmSync(target, { recursive: true, force: true });
        removed.push(path.relative(root, target));
        continue;
      }

      if (entry.isDirectory()) {
        visit(target);
        continue;
      }

      if (REMOVED_FILES.has(entry.name) || entry.name.endsWith('.bak')) {
        fs.rmSync(target, { force: true });
        removed.push(path.relative(root, target));
      }
    }
  }

  visit(root);
  return removed;
}

module.exports = {
  cleanupTree,
  REMOVED_DIRECTORIES,
  REMOVED_FILES,
};
