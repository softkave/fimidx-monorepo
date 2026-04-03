/**
 * Singleton document used by ixtb-nextjs/scripts/seedEnvTest.ts to
 * reuse the same org / project (and optional client token + symbolication ids)
 * across runs so local packages stay in sync.
 */
export interface ISeedEnvTestState {
  /** Singleton key, always `default` today. */
  key: string;
  groupId: string;
  projectId: string;
  /** Last JWT bearer string; optional—can be refreshed without changing
   * project. */
  clientToken?: string | null;
  /** Stable repo / version for symbolication-sample-app + e2e (optional until
   * first symbolication seed). */
  symRepo?: string | null;
  symVersion?: string | null;
  /** User id used when the row was first created (audit / debugging). */
  seededByUserId: string;
  updatedAt: Date;
}
