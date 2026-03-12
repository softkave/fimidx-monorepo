import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { AddMemberEndpointArgs } from "../../../definitions/member.js";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("addMember integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "addMember",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddMemberArgs(
    overrides: Partial<AddMemberEndpointArgs> = {}
  ): AddMemberEndpointArgs {
    const testData = makeTestData({ testName: "member" });
    return {
      projectId,
      groupId,
      permissions: [],
      meta: { name: testData.name, userId: testData.memberId },
      ...overrides,
    };
  }

  beforeAll(async () => {
    // Storage is already created by createTestSetup
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanup();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanup();
  });

  it("creates a member successfully", async () => {
    const args = makeAddMemberArgs();

    const result = await addMember({
      args,
      by,
      byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.id).toBeDefined();
    expect(result.member.meta).toEqual(args.meta);
    expect(result.member.projectId).toBe(args.projectId);
    expect(result.member.groupId).toBe(args.groupId);
    expect(result.member.permissions).toBeNull();
  });

  it("creates a member with permissions", async () => {
    const args = makeAddMemberArgs({
      permissions: [
        { action: "read", target: "data" },
        { action: "write", target: "profile" },
      ],
    });

    const result = await addMember({
      args,
      by,
      byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.permissions).not.toBeNull();
    expect(result.member.permissions).toHaveLength(2);
    // Entity is stored as member id
    expect(result.member.permissions![0].entity).toBe(result.member.id);
    expect(result.member.permissions![0].action).toBe("read");
    expect(result.member.permissions![0].target).toBe("data");
    expect(result.member.permissions![1].entity).toBe(result.member.id);
    expect(result.member.permissions![1].action).toBe("write");
    expect(result.member.permissions![1].target).toBe("profile");
  });

  it("creates a member with meta data", async () => {
    const args = makeAddMemberArgs({
      meta: {
        department: "engineering",
        level: "senior",
        location: "remote",
      },
    });

    const result = await addMember({
      args,
      by,
      byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.meta).toEqual({
      department: "engineering",
      level: "senior",
      location: "remote",
    });
  });

  it("verifies member was created in storage", async () => {
    const args = makeAddMemberArgs();

    const addResult = await addMember({
      args,
      by,
      byType,
      storage,
    });

    const result = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].id).toBe(addResult.member.id);
    expect(result.members[0].meta).toEqual(args.meta);
  });

  it("handles member with all optional fields", async () => {
    const args = makeAddMemberArgs({
      meta: { key: "value" },
      permissions: [{ action: "read", target: "data" }],
    });

    const result = await addMember({
      args,
      by,
      byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.meta).toEqual(args.meta);
    expect(result.member.permissions).toHaveLength(1);
  });
});
