# Plan: @vitalets/vite-plugin-build-info

## Goal and scope

Create a small reusable Vite plugin in `/Users/vitalets/projects/vite-plugin-build-info`, published as `@vitalets/vite-plugin-build-info`. It supplies Git commit, dirty status, and build timestamp through a virtual module and an optional JSON artifact.

Target modern Rolldown-based Vite versions and standard client builds. SSR and multi-environment builds are outside the initial scope; do not add machinery or tests for them.

This document carries the decisions from the planning session into a fresh implementation session. Implement the package and prepare publishing. Do not integrate it with Bookmarks New Tab, modify other extension projects, or add unrelated features. Do not create commits, push, create a remote repository, or publish until the user explicitly authorizes those actions. Include publishing preparation in the implementation; leave the actual release as a reviewable final step.

## Accepted public API

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
```

The virtual module exports three named values:

- `commit: string`: full Git HEAD hash.
- `dirty: boolean`: whether the repository contains staged, unstaged, or untracked changes. Git-ignored files do not count.
- `builtAt: string`: UTC ISO 8601 timestamp captured for the build, using `new Date().toISOString()`.

Keep these together in one virtual module. Do not add separate Git, CI, or time modules, globals, HTML metadata, banners, branch information, or custom metadata providers in the first version.

The only initial option is `filename?: string | false`:

- Default: `build-info.json` in the build output root.
- A string selects another relative output filename.
- `false` disables JSON emission while retaining the virtual module.

JSON contains exactly the same `commit`, `dirty`, and `builtAt` values as the virtual module. Emit it even when application code does not import the module.

Supply TypeScript declarations usable with:

```ts
/// <reference types="@vitalets/vite-plugin-build-info/client" />
```

## Implementation

1. Inspect applicable local agent instructions and the current directory before creating files. Preserve this plan and any existing user work. Use kebab-case for source and test filenames; retain standard ecosystem filenames such as `README.md` and `CHANGELOG.md`.
2. Set up a minimal TypeScript package with ESM output, declaration files, MIT license, and Vite as a peer dependency. Use Node built-ins for Git execution; add no runtime dependencies. Target modern Rolldown-based Vite using its standard plugin API; do not add legacy Rollup compatibility branches. Choose Node and Vite support ranges that match the versions actually verified, rather than promising untested compatibility.
3. Prefer a small source module and ordinary TypeScript compilation. Add only the scripts and tooling needed for build, type checking, tests, and package preparation; avoid scaffolding a framework or a general-purpose plugin system.
4. Resolve Git commands relative to Vite's resolved project root, not the process working directory. Use argument-based child-process calls, with `git rev-parse HEAD` and `git status --porcelain --untracked-files=all`. A repository-wide dirty flag is intended, including when the Vite root is a subdirectory.
5. Capture a consistent snapshot once per build. Refresh it for each watch rebuild. In development capture at server startup; restarting the dev server refreshes it. Do not add Git-file watchers or automatic HMR for metadata.
6. Implement `resolveId` and `load` for `virtual:build-info`, using Vite's internal virtual-ID convention. Generate named JavaScript exports with JSON serialization for safe string literals. Support both dev and build; do not mark the whole plugin build-only.
7. Emit the JSON through Vite's asset emission API during builds only. Do not write generated files into the source tree. Reuse the captured snapshot rather than querying Git or taking a second timestamp during emission.
8. Fail clearly if Git metadata cannot be read, including repositories without a HEAD commit. Do not add CI environment fallbacks or silently report an unknown commit.
9. Export the plugin API and types from the package root, and ambient virtual-module declarations through the `/client` entry. Restrict published files to compiled output, the necessary declarations, and standard package documentation.

## Small verification scope

Write only a few simple tests focused on public behavior. A single test file with a temporary Git fixture and a handful of actual Vite builds is sufficient. Prefer Node's built-in test runner; do not introduce browser automation, elaborate test infrastructure, or a large test matrix. Combine related assertions in the same test where convenient.

- Build a tiny consumer that imports all three values. Verify its executable bundle and emitted JSON agree on the actual commit, `dirty: false`, and a valid timestamp within the build interval. The fixture output directory must be Git-ignored.
- Make an uncommitted change and rebuild; verify `dirty: true`. One representative change is enough; separate cases for every Git status are unnecessary.
- Check a custom filename and `filename: false` through build outputs.
- Check that missing Git metadata produces a useful failure.
- Add one lightweight dev-server module-loading check so development imports are covered, without launching a browser.

Avoid an exhaustive matrix of operating systems, CI providers, Git configurations, or bundler versions. Do not add tests mirroring individual implementation helpers. Watch rebuild support can receive a focused smoke check if lifecycle behavior needs verification, but do not make a watch-test harness a prerequisite or expand the suite for every edge case.

Before publication, run type checking, tests, and the build, then create an npm tarball and inspect its contents. Use one temporary consumer to verify the packed package's root export and `/client` types. Do not install it into Bookmarks New Tab.

## Documentation

Write a concise README covering installation, Vite configuration, application imports, TypeScript setup, the `filename` option, the JSON schema, and dev/build snapshot timing. Explain that `dirty: true` identifies an uncommitted build but does not preserve or reconstruct those changes.

Prepare version `0.1.0`. Configure `publishConfig.access` as `public`. Use the intended repository `vitalets/vite-plugin-build-info` in package metadata once the destination is confirmed. Add a Keep a Changelog-style `CHANGELOG.md` with an `## [Unreleased]` section, as required by the user's release action.

## Publishing with the user's npm-release project

Use `/Users/vitalets/projects/npm-release` as the authoritative local reference. Read its current `README.md` and action definition during implementation before writing the workflow; do not modify that project. At planning time, its documented release action is `vitalets/npm-release@v2`.

1. Prepare `.github/workflows/release.yml` using that project's current workflow example. Preserve its manual dispatch controls for channel, version increment, dry run, skip npm publish, and skip changelog update.
2. Run installation, type checks, tests, and package build before the release action. Use the Node setup and registry configuration required by its documentation. Grant `contents: write` and `id-token: write`, and pass `secrets.GITHUB_TOKEN`. Do not configure a long-lived npm token.
3. Keep all validation and build actions explicit; do not add npm lifecycle hooks such as `prepublishOnly`. Provide lint and test GitHub workflows. Before releasing, use `gh run list` to require successful runs of both for the selected branch and exact release commit. Document explicit validation and build commands for manual publication.
4. Prepare a short release guide separating the first publish from subsequent releases. The action's current documentation requires the package to exist on npm before trusted publishing can be configured.
5. After review and explicit authorization, establish the GitHub repository and commit/push the reviewed source. Publish the first version manually from a clean, validated checkout with `npm login` if needed and `npm publish --access public`. User authentication may require user participation; never request credentials in chat.
6. Record the initial `0.1.0` release coherently in the changelog and Git history/tag as part of the authorized first-release steps; retain an empty Unreleased section for subsequent releases. Do not run the version-bumping action to accidentally publish `0.1.1` as the intended initial release.
7. Configure npm trusted publishing for package `@vitalets/vite-plugin-build-info`, GitHub owner `vitalets`, repository `vite-plugin-build-info`, and workflow filename `release.yml`.
8. Verify the action's dry-run path after setup. Its dry-run behavior must be checked against the current action documentation before invocation. In the currently inspected action, only dry-run mode skips committing, tagging, pushing, and publishing; it still updates version/changelog files in the runner checkout. A dry run does not verify npm publishing authentication.
9. Use the GitHub release workflow for later versions. The action updates the version and changelog, creates and pushes the release commit/tag, publishes through OIDC, and creates a GitHub Release. These are publication actions and require explicit release authorization. Pull the resulting release commit and tags afterward.

## Completion criteria

- The package exposes the accepted virtual module and optional `build-info.json` from one snapshot.
- Dev imports work; production builds and the small verification suite pass.
- The npm tarball contains working JavaScript and consumer declarations.
- Documentation and the npm-release workflow are ready for review.
- Report what is implemented, what was verified, and which authentication or authorization steps remain before publishing.
- No Bookmarks New Tab integration is performed.
