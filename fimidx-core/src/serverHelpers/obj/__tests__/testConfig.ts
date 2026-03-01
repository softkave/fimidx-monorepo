/**
 * Test configuration to ensure test isolation
 * Each test file should use unique identifiers to prevent conflicts when running tests together
 */

export const TEST_CONFIG = {
  // Unique identifiers for each test file
  updateObjs: {
    projectId: "test-project-updateObjs",
    tag: "test-tag-updateObjs",
    groupId: "test-group-updateObjs",
  },
  setObjs: {
    projectId: "test-project-setObjs",
    tag: "test-tag-setObjs",
    groupId: "test-group-setObjs",
  },
  deleteObjs: {
    projectId: "test-project-deleteObjs",
    tag: "test-tag-deleteObjs",
    groupId: "test-group-deleteObjs",
  },
  getObjs: {
    projectId: "test-project-getObjs",
    tag: "test-tag-getObjs",
    groupId: "test-group-getObjs",
  },
  indexObjs: {
    projectId: "test-project-indexObjs",
    tag: "test-tag-indexObjs",
    groupId: "test-group-indexObjs",
  },
  getObjFields: {
    projectId: "test-project-getObjFields",
    tag: "test-tag-getObjFields",
    groupId: "test-group-getObjFields",
  },
} as const;

// Common test constants
export const TEST_CONSTANTS = {
  defaultBy: "tester",
  defaultByType: "user",
  defaultDeleter: "deleter",
  defaultDeleterType: "user",
} as const;

// Helper function to generate unique test data
export function makeUniqueTestData(prefix: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    projectId: `${prefix}-${timestamp}-${random}`,
    tag: `${prefix}-tag-${timestamp}-${random}`,
    groupId: `${prefix}-group-${timestamp}-${random}`,
  };
}
