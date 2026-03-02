import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import {
  kMemberStatus,
  type AddMemberEndpointArgs,
  type GetMembersEndpointArgs,
  type IMemberObjRecord,
} from "../../../definitions/member.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";

const defaultProjectId = "test-project-getMembers";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeGetMembersArgs(
  overrides: Partial<GetMembersEndpointArgs> = {}
): GetMembersEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      ...overrides.query,
    },
    page: overrides.page,
    limit: overrides.limit,
    sort: overrides.sort,
    includePermissions: overrides.includePermissions,
  };
}

function makeAddMemberArgs(
  overrides: Partial<AddMemberEndpointArgs> = {}
): AddMemberEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    name: `Test Member ${uniqueId}`,
    description: "Test description",
    projectId: defaultProjectId,
    groupId: defaultGroupId,
    email: `test${uniqueId}@example.com`,
    memberId: `member-${uniqueId}`,
    permissions: [],
    ...overrides,
  };
}

// Helper function to insert objFields for the "name" field
async function insertNameFieldForSorting(params: {
  projectId: string;
  groupId: string;
  tag: string;
}) {
  const { projectId, groupId, tag } = params;
  const now = new Date();

  const nameField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId,
    groupId,
    tag,
    field: "name",
    path: "name",
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    fieldKeys: ["name"],
    fieldKeyTypes: ["string"],
    valueTypes: ["string"],
  };

  // Insert the field definition
  await db.insert(objFieldsTable).values(nameField);

  return nameField;
}

describe("getMembers integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Delete all members for all test projects using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-getMembers-1",
        "test-project-getMembers-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test projects
      for (const projectId of testProjectIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, projectId),
              eq(objFieldsTable.tag, kObjTags.member)
            )
          );
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      // Delete all members for all test projects using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-getMembers-1",
        "test-project-getMembers-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test projects
      for (const projectId of testProjectIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, projectId),
              eq(objFieldsTable.tag, kObjTags.member)
            )
          );
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no members exist", async () => {
    const args = makeGetMembersArgs();

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("returns members when they exist", async () => {
    // Create test members
    const member1Args = makeAddMemberArgs({ name: "Member A" });
    const member2Args = makeAddMemberArgs({ name: "Member B" });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs();
    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);

    // Verify member properties
    const memberNames = result.members.map((m) => m.name).sort();
    expect(memberNames).toEqual(["Member A", "Member B"].sort());
  });

  it("filters by name", async () => {
    // Create test members
    const member1Args = makeAddMemberArgs({ name: "Alice Member" });
    const member2Args = makeAddMemberArgs({ name: "Bob Member" });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        name: { eq: "Alice Member" },
      },
    });

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Alice Member");
  });

  it("filters by email", async () => {
    // Create test members
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      email: "alice@example.com",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      email: "bob@example.com",
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        email: { eq: "alice@example.com" },
      },
    });

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].email).toBe("alice@example.com");
  });

  it("filters by memberId", async () => {
    // Create test members
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      memberId: "alice-123",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      memberId: "bob-456",
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        memberId: { eq: "alice-123" },
      },
    });

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].memberId).toBe("alice-123");
  });

  it("filters by groupId", async () => {
    // Create test members in different groups
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      groupId: "group-1",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      groupId: "group-2",
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs({
      query: {
        projectId: defaultProjectId,
        groupId: "group-1",
      },
    });

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].groupId).toBe("group-1");
  });

  it("handles pagination correctly", async () => {
    // Create multiple test members
    const members = [];
    for (let i = 0; i < 5; i++) {
      const memberArgs = makeAddMemberArgs({ name: `Member ${i}` });
      members.push(memberArgs);

      await addMember({
        args: memberArgs,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });
    }

    // Test first page
    const args1 = makeGetMembersArgs({ page: 1, limit: 2 });
    const result1 = await getMembers({
      args: args1,
      storage,
    });

    expect(result1.members).toHaveLength(2);
    expect(result1.hasMore).toBe(true);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);

    // Test second page
    const args2 = makeGetMembersArgs({ page: 2, limit: 2 });
    const result2 = await getMembers({
      args: args2,
      storage,
    });

    expect(result2.members).toHaveLength(2);
    expect(result2.hasMore).toBe(true);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);

    // Test third page
    const args3 = makeGetMembersArgs({ page: 3, limit: 2 });
    const result3 = await getMembers({
      args: args3,
      storage,
    });

    expect(result3.members).toHaveLength(1);
    expect(result3.hasMore).toBe(false);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
  });

  it("sorts by name when objFields are set up", async () => {
    // Set up objFields for name sorting
    await insertNameFieldForSorting({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      tag: kObjTags.member,
    });

    // Create test members
    const member1Args = makeAddMemberArgs({ name: "Charlie" });
    const member2Args = makeAddMemberArgs({ name: "Alice" });
    const member3Args = makeAddMemberArgs({ name: "Bob" });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Test ascending sort
    const argsAsc = makeGetMembersArgs({
      sort: [{ field: "name", direction: "asc" }],
    });
    const resultAsc = await getMembers({
      args: argsAsc,
      storage,
    });

    expect(resultAsc.members.map((m) => m.name)).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);

    // Test descending sort
    const argsDesc = makeGetMembersArgs({
      sort: [{ field: "name", direction: "desc" }],
    });
    const resultDesc = await getMembers({
      args: argsDesc,
      storage,
    });

    expect(resultDesc.members.map((m) => m.name)).toEqual([
      "Charlie",
      "Bob",
      "Alice",
    ]);
  });

  it("includes permissions when requested", async () => {
    // Create test member with permissions
    const memberArgs = makeAddMemberArgs({
      permissions: [
        {
          entity: "test",
          action: "read",
          target: "data",
        },
      ],
    });

    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs({ includePermissions: true });
    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].permissions).not.toBeNull();
    expect(result.members[0].permissions).toHaveLength(1);
    expect(result.members[0].permissions![0]).toEqual({
      entity: "test",
      action: "read",
      target: "data",
    });
  });

  it("excludes permissions when not requested", async () => {
    // Create test member with permissions
    const memberArgs = makeAddMemberArgs({
      permissions: [
        {
          entity: "test",
          action: "read",
          target: "data",
        },
      ],
    });

    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs();
    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].permissions).toBeNull();
  });

  it("filters by meta fields", async () => {
    // Create test members with meta
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      meta: { department: "engineering", level: "senior" },
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      meta: { department: "marketing", level: "junior" },
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetMembersArgs({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        meta: [
          {
            op: "eq",
            field: "department",
            value: "engineering",
          },
        ],
      },
    });

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Alice");
    expect(result.members[0].meta?.department).toBe("engineering");
  });

  it("filters by status", async () => {
    // Create test members with different statuses
    const member1Args = makeAddMemberArgs({
      name: "Alice",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
    });

    // Extract seed from memberArgs
    const seed1: Partial<IMemberObjRecord> = { status: kMemberStatus.pending };
    const seed2: Partial<IMemberObjRecord> = { status: kMemberStatus.accepted };

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      seed: seed1,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      seed: seed2,
      storage,
    });

    // Debug: Check what members exist before filtering
    const allMembers = await getMembers({
      args: makeGetMembersArgs(),
      storage,
    });

    const args = makeGetMembersArgs({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        status: { eq: "pending" },
      },
    });

    const result = await getMembers({
      args,
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Alice");
    expect(result.members[0].status).toBe("pending");
  });
});
