# @vitalets/vite-plugin-build-info

[![Lint](https://github.com/vitalets/vite-plugin-build-info/actions/workflows/lint.yml/badge.svg)](https://github.com/vitalets/vite-plugin-build-info/actions/workflows/lint.yml)
[![Test](https://github.com/vitalets/vite-plugin-build-info/actions/workflows/test.yml/badge.svg)](https://github.com/vitalets/vite-plugin-build-info/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@vitalets/vite-plugin-build-info)](https://www.npmjs.com/package/@vitalets/vite-plugin-build-info)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Expose Git commit, dirty status, and build time in a Vite application, with an optional JSON artifact.

## Install

```sh
npm install --save-dev @vitalets/vite-plugin-build-info
```

Requires Git and a repository with at least one commit. Targets modern Rolldown-based Vite (`^8.3.5`) and Node.js (`^24.16.0`). The initial scope is standard client builds; SSR and multi-environment builds are not supported.

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { buildInfo } from '@vitalets/vite-plugin-build-info';

export default defineConfig({
  plugins: [buildInfo()],
});
```

```ts
// Application code
import { commit, dirty, builtAt } from 'virtual:build-info';

console.log({ commit, dirty, builtAt });
```

For TypeScript, add this to your application's `vite-env.d.ts`:

```ts
/// <reference types="@vitalets/vite-plugin-build-info/client" />
```

The package also exports the `BuildInfo` and `BuildInfoOptions` types.

## JSON output

By default, each production build emits `build-info.json` at the output root, even if the virtual module is not imported:

```json
{
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "dirty": false,
  "builtAt": "2026-10-29T12:00:00.000Z"
}
```

- `commit`: full Git HEAD hash, as a string.
- `dirty`: boolean; staged, unstaged, or untracked changes anywhere in the repository count. Git-ignored files do not.
- `builtAt`: UTC ISO 8601 string from `new Date().toISOString()`.

The JSON and virtual module contain exactly the same snapshot.

```ts
buildInfo({ filename: 'meta/build.json' }); // Custom relative output path
buildInfo({ filename: false }); // Virtual module only
```

Paths must use forward slashes and cannot be absolute or contain empty, `.` or `..` segments. No JSON is served or written during development.

## Snapshot timing

Metadata is read at the start of each build, including watch rebuilds. In development it is captured at server startup and refreshed on restart. Git changes alone do not trigger rebuilds or HMR.

Git commands run from Vite's resolved project root. A root inside a larger repository still reports repository-wide dirty status. Ignore generated output directories in Git to prevent earlier build output from making later builds dirty.

Missing Git metadata fails with an error; there are no CI fallbacks. `dirty: true` identifies an uncommitted build but cannot preserve or reconstruct its changes.

## Development

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm pack
```

Tests use Node's built-in test runner and temporary Git repositories. They do not modify this project's Git history. See [RELEASING.md](RELEASING.md) for release preparation.

## License

MIT
