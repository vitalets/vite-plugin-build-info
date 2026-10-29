# Releasing

The package is prepared as `0.1.0`. No release has been made. Creating a remote repository, committing, pushing, and publishing require explicit authorization.

## First release

1. The GitHub destination is confirmed as `vitalets/vite-plugin-build-info` and recorded in `package.json`.
2. Create the GitHub repository after authorization. Add a dated `## [0.1.0] - YYYY-MM-DD` section to `CHANGELOG.md`, moving the initial notes there and keeping an empty `## [Unreleased]` section. Commit the reviewed source, changelog, and lockfile, and push.
3. From the clean checkout, run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Run `npm pack` and inspect the tarball. Verify its root JavaScript export and `/client` TypeScript declarations in a temporary consumer. Do not install it into another extension project.
4. After explicit publication authorization, use `npm login` if necessary, then `npm publish --access public`. Authenticate interactively, never through credentials in chat. The `prepublishOnly` script checks types, runs tests, and rebuilds. This publishes `0.1.0` without a version bump.
5. After successful publication, tag the published commit `v0.1.0` and push the tag. If a release step fails, check npm and Git state before retrying.
6. Configure npm trusted publishing for `@vitalets/vite-plugin-build-info`: owner `vitalets`, repository `vite-plugin-build-info`, workflow `release.yml`. The package must already exist on npm, as described by the release action. No long-lived npm token is used.
7. Check the current action documentation and run the workflow with `dry-run: true` and channel `stable`. This previews the next release; it does not publish the initial version or verify npm authentication.

## Subsequent releases

Add release notes under `Unreleased`. After explicit release authorization, manually dispatch `.github/workflows/release.yml`, selecting a channel (`stable` or `next`) and increment (`patch`, `minor`, or `major`). The workflow installs dependencies, checks types, tests, and builds before calling `vitalets/npm-release@v2`.

The action performs the full release cycle: version bump, changelog update for stable releases, commit/tag/push, npm publication through OIDC, and a GitHub Release for stable releases. Pull the resulting commit and tags afterward (`git pull --rebase`, then `git fetch --tags`).

Dispatch controls are preserved from the action's workflow example:

- `dry-run`: modifies version/changelog files in the runner checkout, but skips committing, tagging, pushing, npm publishing, and GitHub Release creation.
- `skip-npm-publish`: skips only npm publication; other release actions still run.
- `skip-changelog-update`: skips changelog updates and GitHub Release creation; version bump, commit/tag/push, and npm publication still run.

See the authoritative [npm-release documentation](https://github.com/vitalets/npm-release) before invoking the workflow. The workflow has been prepared locally; GitHub execution and OIDC authentication must be verified after repository and npm setup.
