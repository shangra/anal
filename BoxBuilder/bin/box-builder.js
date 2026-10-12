#!/usr/bin/env node
'use strict';

const { runCli } = require('../src/cli/run');

runCli(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
});
