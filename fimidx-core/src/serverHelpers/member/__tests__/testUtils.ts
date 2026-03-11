import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";

// Global test counter to ensure uniqueness across all test files
let globalTestCounter = 0;

export function getUniqueTestId(): string {
  globalTestCounter++;
  return `${globalTestCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

export function makeUniqueProjectId(prefix: string): string {
  return `${prefix}_${getUniqueTestId()}`;
}

export function makeUniqueGroupId(prefix: string): string {
  return `${prefix}_${getUniqueTestId()}`;
}

export function makeUniqueMemberId(prefix: string): string {
  return `${prefix}_${getUniqueTestId()}`;
}

export function makeUniqueEmail(prefix: string): string {
  return `test_${prefix}_${getUniqueTestId()}@example.com`;
}

export function makeUniqueName(prefix: string): string {
  return `Test ${prefix} ${getUniqueTestId()}`;
}

// Comprehensive cleanup function that cleans all related data
export async function cleanupTestData(params: {
  storage: IObjStorage;
  projectIds: string[];
  by: string;
  byType: string;
}): Promise<void> {
  const { storage, projectIds, by, byType } = params;

  try {
    for (const projectId of projectIds) {
      // Clean up all object types in the correct order to avoid foreign key constraints
      const objectTypes = [
        kObjTags.member,
        kObjTags.permission,
        kObjTags.group,
        kObjTags.project,
        kObjTags.clientToken,
        kObjTags.monitor,
        kObjTags.callback,
        kObjTags.log,
      ];

      for (const tag of objectTypes) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag,
          deletedBy: by,
          deletedByType: byType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for complete test isolation
        });
      }
    }
  } catch {
    // Ignore cleanup errors - they shouldn't fail tests
  }
}

// Test setup helper that creates isolated storage and cleanup functions
export function createTestSetup(params: {
  testName: string;
  defaultBy?: string;
  defaultByType?: string;
}) {
  const { testName, defaultBy = "tester", defaultByType = "user" } = params;

  // Create unique identifiers for this test suite
  const uniqueId = getUniqueTestId();
  const projectId = makeUniqueProjectId(testName);
  const groupId = makeUniqueGroupId(testName);

  // Create storage instance
  const storage = createDefaultStorage();

  // Create cleanup function
  const cleanup = async () => {
    await cleanupTestData({
      storage,
      projectIds: [projectId],
      by: defaultBy,
      byType: defaultByType,
    });
  };

  return {
    storage,
    cleanup,
    testData: {
      projectId,
      groupId,
      by: defaultBy,
      byType: defaultByType,
      uniqueId,
    },
  };
}

// Helper to create test data with unique identifiers
export function makeTestData(params: {
  testName: string;
  overrides?: Record<string, any>;
}) {
  const { testName, overrides = {} } = params;

  return {
    projectId: makeUniqueProjectId(testName),
    groupId: makeUniqueGroupId(testName),
    memberId: makeUniqueMemberId(testName),
    email: makeUniqueEmail(testName),
    name: makeUniqueName(testName),
    ...overrides,
  };
}
