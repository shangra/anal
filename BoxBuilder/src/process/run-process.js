'use strict';

const { spawn } = require('child_process');

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode, signal) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, exitCode });
        return;
      }

      const error = new Error(
        `${command} завершился с кодом ${exitCode}${signal ? ` (${signal})` : ''}`
      );
      error.command = command;
      error.args = args;
      error.exitCode = exitCode;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

module.exports = {
  runProcess,
};
