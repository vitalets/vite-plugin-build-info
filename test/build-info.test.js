import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { build, createServer } from 'vite';
import { buildInfo } from '../src/build-info.ts';

async function fixture(t, committed = true) {
  const root = await mkdtemp(join(tmpdir(), 'build-info-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  await mkdir(join(root, 'app'));
  await writeFile(join(root, '.gitignore'), 'app/dist/\n');
  await writeFile(join(root, 'app/main.js'), "export { commit, dirty, builtAt } from 'virtual:build-info';\n");
  git('init', '--quiet');
  if (committed) {
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture');
  }
  return { root, git };
}

function config(root, options = {}) {
  return {
    root: join(root, 'app'),
    configFile: false,
    logLevel: 'silent',
    plugins: [buildInfo(options)],
    build: {
      lib: { entry: 'main.js', formats: ['es'], fileName: () => 'bundle.js' },
      minify: false,
    },
  };
}

async function json(root, filename = 'build-info.json') {
  return JSON.parse(await readFile(join(root, 'app/dist', filename), 'utf8'));
}

async function bundle(root) {
  const code = await readFile(join(root, 'app/dist/bundle.js'), 'utf8');
  const { commit, dirty, builtAt } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  return { commit, dirty, builtAt };
}

test('build exports match JSON and refresh after an uncommitted change', async t => {
  const { root, git } = await fixture(t);
  const start = Date.now();
  await build(config(root));
  const info = await json(root);
  assert.deepEqual(await bundle(root), info);
  assert.equal(info.commit, git('rev-parse', 'HEAD'));
  assert.equal(info.dirty, false);
  assert.equal(new Date(info.builtAt).toISOString(), info.builtAt);
  assert.ok(Date.parse(info.builtAt) >= start && Date.parse(info.builtAt) <= Date.now());

  // A change outside the nested Vite root still makes the repository dirty.
  await writeFile(join(root, 'note.txt'), 'uncommitted');
  await build(config(root));
  assert.equal((await json(root)).dirty, true);
  assert.deepEqual(await bundle(root), await json(root));
});

test('custom JSON filename works without imports; false disables emission', async t => {
  const { root } = await fixture(t);
  await writeFile(join(root, 'app/main.js'), 'export const value = 42;');
  await build(config(root, { filename: 'meta/build.json' }));
  assert.equal((await json(root, 'meta/build.json')).dirty, true);
  await build(config(root, { filename: false }));
  await assert.rejects(readFile(join(root, 'app/dist/build-info.json')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(root, 'app/dist/meta/build.json')), { code: 'ENOENT' });
});

test('a repository without a HEAD commit fails clearly', async t => {
  const { root } = await fixture(t, false);
  await assert.rejects(build(config(root)), /Cannot read Git metadata.*HEAD commit/s);
});

test('dev imports keep the startup snapshot', async t => {
  const { root, git } = await fixture(t);
  const server = await createServer({
    ...config(root),
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  t.after(() => server.close());
  const result = await server.transformRequest('virtual:build-info');
  assert.ok(result);
  assert.ok(result.code.includes(git('rev-parse', 'HEAD')));
  assert.match(result.code, /export const dirty = false/);
  await writeFile(join(root, 'note.txt'), 'uncommitted');
  const again = await server.transformRequest('virtual:build-info');
  assert.equal(again?.code, result.code);
});
