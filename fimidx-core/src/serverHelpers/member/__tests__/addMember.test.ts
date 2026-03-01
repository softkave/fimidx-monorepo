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
    expect(result.member.name).toBe(args.name);
    expect(result.member.description).toBe(args.description);
    expect(result.member.email).toBe(args.email);
    expect(result.member.memberId).toBe(args.memberId);
    expect(result.member.projectId).toBe(args.projectId);
    expect(result.member.groupId).toBe(args.groupId);
    expect(result.member.status).toBe("pending");
    expect(result.member.permissions).toBeNull(); // No permissions by default
  });

  it("creates a member with permissions", async () => {
    const args = makeAddMemberArgs({
      permissions: [
        {
          entity: "test",
          action: "read",
          target: "data",
        },
        {
          entity: "user",
          action: "write",
          target: "profile",
        },
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
    expect(result.member.permissions![0]).toEqual({
      entity: "test",
      action: "read",
      target: "data",
    });
    expect(result.member.permissions![1]).toEqual({
      entity: "user",
      action: "write",
      target: "profile",
    });
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

  it("creates a member with custom seed data", async () => {
    const args = makeAddMemberArgs();

    const result = await addMember({
      args,
      by,
      byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.status).toBe("pending");
    expect(result.member.sentEmailCount).toBe(0);
  });

  it("handles duplicate memberId", async () => {
    const args = makeAddMemberArgs();

    // Create first member
    await addMember({
      args,
      by,
      byType,
      storage,
    });

    // Try to create second member with same memberId
    const duplicateArgs = makeAddMemberArgs({ memberId: args.memberId });

    await expect(
      addMember({
        args: duplicateArgs,
        by,
        byType,
        storage,
      })
    ).rejects.toThrow();
  });

  it("handles duplicate email", async () => {
    const args = makeAddMemberArgs();

    // Create first member
    await addMember({
      args,
      by,
      byType,
      storage,
    });

    // Try to create second member with same email
    const duplicateArgs = makeAddMemberArgs({ email: args.email });

    await expect(
      addMember({
        args: duplicateArgs,
        by,
        byType,
        storage,
      })
    ).rejects.toThrow();
  });

  it("verifies member was created in storage", async () => {
    const args = makeAddMemberArgs();

    await addMember({
      args,
      by,
      byType,
      storage,
    });

    // Verify member exists in storage
    const result = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          memberId: { eq: args.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe(args.name);
    expect(result.members[0].email).toBe(args.email);
  });

  it("handles member with all optional fields", async () => {
    const args = makeAddMemberArgs({
      description: "Optional description",
      meta: { key: "value" },
      permissions: [
        {
          entity: "test",
          action: "read",
          target: "data",
        },
      ],
    });

    const result = await addMember({
      args,
      by,
      byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.description).toBe(args.description);
    expect(result.member.meta).toEqual(args.meta);
    expect(result.member.permissions).toHaveLength(1);
  });
});
