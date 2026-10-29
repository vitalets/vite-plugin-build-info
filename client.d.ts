declare module 'virtual:build-info' {
  /** Full Git HEAD hash. */
  export const commit: string;
  /** Whether the repository has staged, unstaged, or untracked changes. */
  export const dirty: boolean;
  /** UTC ISO 8601 timestamp captured at build or dev-server startup. */
  export const builtAt: string;
}
