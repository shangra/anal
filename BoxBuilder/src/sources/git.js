'use strict';

const { AssembleError } = require('../config/errors');
const { runProcess } = require('../process/run-process');

async function fetchGitPackage(packageDescriptor, destination, options = {}) {
  const { repository, branch } = packageDescriptor.source;
  const run = options.runProcess || runProcess;

  try {
    await run(
      'git',
      ['clone', '--branch', branch, '--single-branch', '--no-tags', '--', repository, destination],
      { env: options.env }
    );
    const revision = await run('git', ['rev-parse', 'HEAD'], {
      cwd: destination,
      env: options.env,
    });

    return {
      type: 'git',
      repository,
      branch,
      resolvedCommit: revision.stdout.trim(),
    };
  } catch (error) {
    const details = error.stderr && error.stderr.trim();
    throw new AssembleError(
      `Не удалось получить package "${packageDescriptor.name}" из Git${details ? `: ${details}` : ''}`,
      {
        code: 'GIT_FETCH_FAILED',
        stage: 'fetch',
        packageName: packageDescriptor.name,
        cause: error,
      }
    );
  }
}

module.exports = {
  fetchGitPackage,
};
