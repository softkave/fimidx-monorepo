import { range } from "lodash-es";
import { beforeAll, describe, expect, it } from "vitest";
import type { AddGroupEndpointArgs } from "../../../definitions/group.js";
import type {
  AddMemberEndpointArgs,
  GetMemberRequestsEndpointArgs,
} from "../../../definitions/member.js";
import { addGroup } from "../../group/addGroup.js";
import { addMember } from "../addMember.js";
import { getMemberRequests } from "../getMemberRequests.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("getMemberRequests integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "getMemberRequests",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddGroupArgs(
    overrides: Partial<AddGroupEndpointArgs> = {}
  ): AddGroupEndpointArgs {
    const testData = makeTestData({ testName: "group" });
    return {
      name: testData.name,
      description: "Test description",
      projectId,
      ...overrides,
    };
  }

  function makeAddMemberArgs(
    overrides: Partial<AddMemberEndpointArgs> = {}
  ): AddMemberEndpointArgs {
    const testData = makeTestData({ testName: "member" });
    return {
      name: testData.name,
      description: "Test description",
      projectId,
      groupId,
      email: testData.email,
      memberId: testData.memberId,
      permissions: [],
      ...overrides,
    };
  }

  function makeGetMemberRequestsArgs(
    overrides: Partial<GetMemberRequestsEndpointArgs> = {}
  ): GetMemberRequestsEndpointArgs {
    return {
      query: {
        projectId,
        groupId,
        memberId: undefined,
        ...overrides.query,
      },
      page: overrides.page,
      limit: overrides.limit,
    };
  }

  beforeAll(async () => {
    // Storage is already created by createTestSetup
  });

  // afterAll(async () => {
  //   await cleanup();
  // });

  // beforeEach(async () => {
  //   // Clean up before each test
  //   await cleanup();
  // });

  // afterEach(async () => {
  //   // Clean up after each test
  //   await cleanup();
  // });

  it("gets member requests successfully", async () => {
    // Create test group first
    const groupArgs = makeAddGroupArgs({ name: "Test Group" });
    const { group: testGroup } = await addGroup({
      args: groupArgs,
      by,
      byType,
      groupId,
      storage,
    });

    // Create test members
    const member1Args = makeAddMemberArgs({
      memberId: "member-1",
      groupId: testGroup.id,
    });
    const member2Args = makeAddMemberArgs({
      memberId: "member-2",
      groupId: testGroup.id,
    });

    await addMember({
      args: member1Args,
      by,
      byType,
      storage,
    });

    await addMember({
      args: member2Args,
      by,
      byType,
      storage,
    });

    const args = makeGetMemberRequestsArgs({
      query: {
        groupId: testGroup.id,
        projectId,
      },
    });

    const result = await getMemberRequests({
      args,
      storage,
    });

    expect(result.requests).toBeDefined();
    expect(result.requests.length).toBeGreaterThanOrEqual(2);
    expect(result.hasMore).toBeDefined();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);

    // Verify request structure
    const request = result.requests[0];
    expect(request).toHaveProperty("requestId");
    expect(request).toHaveProperty("groupName");
    expect(request).toHaveProperty("status");
    expect(request).toHaveProperty("updatedAt");
  });

  it("filters member requests by memberId", async () => {
    // Create test group first
    const groupArgs = makeAddGroupArgs({ name: "Test Group" });
    await addGroup({
      args: groupArgs,
      by,
      byType,
      groupId,
      storage,
    });

    // Create test members
    const member1Args = makeAddMemberArgs({ memberId: "member-1" });
    const member2Args = makeAddMemberArgs({ memberId: "member-2" });

    await addMember({
      args: member1Args,
      by,
      byType,
      storage,
    });

    await addMember({
      args: member2Args,
      by,
      byType,
      storage,
    });

    const args = makeGetMemberRequestsArgs({
      query: {
        memberId: "member-1",
        projectId,
      },
    });

    const result = await getMemberRequests({
      args,
      storage,
    });

    expect(result.requests).toBeDefined();
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].requestId).toBeDefined();
  });

  it("handles pagination correctly", async () => {
    // Create test group first
    const groupArgs = makeAddGroupArgs({ name: "Test Group" });
    await addGroup({
      args: groupArgs,
      by,
      byType,
      groupId,
      storage,
    });

    // Create multiple test members
    const members = [];
    for (let i = 0; i < 5; i++) {
      const memberArgs = makeAddMemberArgs({ memberId: `member-${i}` });
      await addMember({
        args: memberArgs,
        by,
        byType,
        storage,
      });
      members.push(memberArgs);
    }

    // Test first page with limit 2
    const args1 = makeGetMemberRequestsArgs({
      page: 1,
      limit: 2,
    });

    const result1 = await getMemberRequests({
      args: args1,
      storage,
    });

    expect(result1.requests).toHaveLength(2);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.hasMore).toBe(true);

    // Test second page
    const args2 = makeGetMemberRequestsArgs({
      page: 2,
      limit: 2,
    });

    const result2 = await getMemberRequests({
      args: args2,
      storage,
    });

    expect(result2.requests).toHaveLength(2);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.hasMore).toBe(true);

    // Test third page
    const args3 = makeGetMemberRequestsArgs({
      page: 3,
      limit: 2,
    });

    const result3 = await getMemberRequests({
      args: args3,
      storage,
    });

    expect(result3.requests).toHaveLength(1);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
    expect(result3.hasMore).toBe(false);
  });

  it("handles empty results", async () => {
    const args = makeGetMemberRequestsArgs({
      query: {
        memberId: "non-existent-member",
        projectId,
      },
    });

    const result = await getMemberRequests({
      args,
      storage,
    });

    expect(result.requests).toBeDefined();
    expect(result.requests).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("filters by different group IDs", async () => {
    // Create groups first
    const group1Args = makeAddGroupArgs({ name: "Group 1" });
    const group2Args = makeAddGroupArgs({ name: "Group 2" });

    await addGroup({
      args: group1Args,
      by,
      byType,
      groupId: "group-1",
      storage,
    });

    await addGroup({
      args: group2Args,
      by,
      byType,
      groupId: "group-2",
      storage,
    });

    // Create members in different groups
    const member1Args = makeAddMemberArgs({
      memberId: "member-1",
      groupId: "group-1",
    });
    const member2Args = makeAddMemberArgs({
      memberId: "member-2",
      groupId: "group-2",
    });

    await addMember({
      args: member1Args,
      by,
      byType,
      storage,
    });

    await addMember({
      args: member2Args,
      by,
      byType,
      storage,
    });

    // Test filtering by group-1
    const args1 = makeGetMemberRequestsArgs({
      query: {
        groupId: "group-1",
        projectId,
      },
    });

    const result1 = await getMemberRequests({
      args: args1,
      storage,
    });

    expect(result1.requests).toHaveLength(1);
    expect(result1.requests[0].requestId).toBeDefined();

    // Test filtering by group-2
    const args2 = makeGetMemberRequestsArgs({
      query: {
        groupId: "group-2",
        projectId,
      },
    });

    const result2 = await getMemberRequests({
      args: args2,
      storage,
    });

    expect(result2.requests).toHaveLength(1);
    expect(result2.requests[0].requestId).toBeDefined();
  });

  it("handles large result sets", async () => {
    // Create test group first
    const groupArgs = makeAddGroupArgs({ name: "Test Group" });
    await addGroup({
      args: groupArgs,
      by,
      byType,
      groupId,
      storage,
    });

    // Create many test members
    const memberCount = 25;
    for (let i = 0; i < memberCount; i++) {
      const memberArgs = makeAddMemberArgs({ memberId: `member-${i}` });
      await addMember({
        args: memberArgs,
        by,
        byType,
        storage,
      });
    }

    // Test with default pagination
    const args = makeGetMemberRequestsArgs();

    const result = await getMemberRequests({
      args,
      storage,
    });

    expect(result.requests).toBeDefined();
    expect(result.requests.length).toBeGreaterThan(0);
    expect(result.hasMore).toBeDefined();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it.only("handles custom limit values", async () => {
    // Create test group first
    const groupArgs = makeAddGroupArgs({ name: "Test Group" });
    const { group: testGroup } = await addGroup({
      args: groupArgs,
      by,
      byType,
      groupId,
      storage,
    });

    // Create test members
    await Promise.all(
      range(10).map((i) => async () => {
        const groupId = testGroup.id;
        const memberArgs = makeAddMemberArgs({
          memberId: `member-${i}`,
          groupId,
        });
        return await addMember({
          args: memberArgs,
          by,
          byType,
          storage,
        });
      })
    );

    // Test with custom limit
    const args = makeGetMemberRequestsArgs({
      limit: 5,
      query: {
        groupId: testGroup.id,
        projectId,
      },
    });

    const result = await getMemberRequests({
      args,
      storage,
    });

    expect(result.requests).toHaveLength(5);
    expect(result.limit).toBe(5);
    expect(result.hasMore).toBe(true);
  });
});
