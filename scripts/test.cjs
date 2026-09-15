'use strict';
const { mkdtempSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const root = resolve(__dirname, '..');
const scratch = mkdtempSync(join(tmpdir(), 'canvas-theme-tests-'));
const cBinary = join(scratch, 'render-c');
const cppBinary = join(scratch, 'render-cpp');
try {
  execFileSync(process.execPath, [join(__dirname, 'check.cjs')], { stdio: 'inherit' });
  execFileSync(process.env.CC || 'cc', ['-O2', '-Wall', '-Wextra', '-Werror', join(root, 'extension/render.c'), '-lm', '-o', cBinary], { stdio: 'inherit' });
  execFileSync(process.env.CXX || 'c++', ['-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', join(root, 'extension/render.cpp'), '-o', cppBinary], { stdio: 'inherit' });
  for (const file of ['backdrop.cjs', 'terminal.cjs']) {
    execFileSync(process.execPath, [join(root, 'tests', file)], {
      stdio: 'inherit', env: { ...process.env, UNOVA_TEST_RENDER: cppBinary }
    });
  }
} finally {
  for (const file of [cBinary, cppBinary]) if (existsSync(file)) unlinkSync(file);
  rmdirSync(scratch);
}
