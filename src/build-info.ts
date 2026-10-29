import { execFileSync } from 'node:child_process';
import { posix, win32 } from 'node:path';
import type { Plugin } from 'vite';

export interface BuildInfoOptions {
  /** Relative output path for the JSON asset; false disables it. */
  filename?: string | false;
}

export interface BuildInfo {
  commit: string;
  dirty: boolean;
  builtAt: string;
}

const virtualId = 'virtual:build-info';
const resolvedId = `\0${virtualId}`;

/** Expose one Git and timestamp snapshot through a virtual module and JSON asset. */
export function buildInfo({ filename = 'build-info.json' }: BuildInfoOptions = {}): Plugin {
  if (filename !== false && (
    !filename || posix.isAbsolute(filename) || win32.isAbsolute(filename) ||
    filename.includes('\\') || filename.split('/').some(part => !part || part === '.' || part === '..')
  )) {
    throw new Error('[build-info] filename must be a relative output file path using forward slashes.');
  }

  let root: string;
  let isBuild: boolean;
  let snapshot: BuildInfo;

  return {
    name: 'vite-plugin-build-info',
    configResolved(config) {
      root = config.root;
      isBuild = config.command === 'build';
    },
    buildStart() {
      try {
        const git = (...args: string[]) => execFileSync('git', args, {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
        snapshot = {
          commit: git('rev-parse', 'HEAD'),
          dirty: git('status', '--porcelain', '--untracked-files=all') !== '',
          builtAt: new Date().toISOString(),
        };
      } catch (cause) {
        throw new Error(
          `[build-info] Cannot read Git metadata from ${JSON.stringify(root)}. Ensure Git is installed and the project belongs to a repository with a HEAD commit.`,
          { cause },
        );
      }
    },
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id === resolvedId) {
        return Object.entries(snapshot)
          .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`)
          .join('\n');
      }
    },
    generateBundle() {
      if (isBuild && filename !== false) {
        this.emitFile({ type: 'asset', fileName: filename, source: `${JSON.stringify(snapshot, null, 2)}\n` });
      }
    },
  };
}
