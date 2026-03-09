import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";
import { updateMemberSendEmailStatus } from "../updateMemberSendEmailStatus.js";

const defaultProjectId = "test-project-updateMemberSendEmailStatus";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeAddMemberArgs(overrides: Record<string, unknown> = {}) {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    groupId: defaultGroupId,
    meta: {
      name: `Test Member ${uniqueId}`,
      userId: `member-${uniqueId}`,
      email: `test${uniqueId}@example.com`,
    },
    permissions: [],
    ...overrides,
  };
}

describe("updateMemberSendEmailStatus integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    try {
      const testProjectIds = [
        defaultProjectId,
        "test-project-updateMemberSendEmailStatus-1",
        "test-project-updateMemberSendEmailStatus-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    try {
      const testProjectIds = [
        defaultProjectId,
        "test-project-updateMemberSendEmailStatus-1",
        "test-project-updateMemberSendEmailStatus-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("updates member email status successfully", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 5;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "sent" as const;

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    // Verify the member email status was updated (stored in meta/objRecord)
    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
    expect(members[0].meta?.emailLastSentAt).toBeDefined();
    expect(members[0].meta?.emailLastSentStatus).toBe(emailLastSentStatus);
  });

  it("updates member email status with different email status values", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 10;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "failed" as const;

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
    expect(members[0].meta?.emailLastSentAt).toBeDefined();
    expect(members[0].meta?.emailLastSentStatus).toBe(emailLastSentStatus);
  });

  it("updates member email status with zero email count", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 0;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "pending" as const;

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
    expect(members[0].meta?.emailLastSentAt).toBeDefined();
    expect(members[0].meta?.emailLastSentStatus).toBe(emailLastSentStatus);
  });

  it("handles different project IDs", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
      projectId: "different-project",
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 3;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "sent" as const;

    await updateMemberSendEmailStatus({
      projectId: "different-project",
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: "different-project",
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
    expect(members[0].meta?.emailLastSentAt).toBeDefined();
    expect(members[0].meta?.emailLastSentStatus).toBe(emailLastSentStatus);
  });

  it("handles different group IDs", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
      groupId: "different-group",
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 7;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "sent" as const;

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: "different-group",
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: "different-group",
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
    expect(members[0].meta?.emailLastSentAt).toBeDefined();
    expect(members[0].meta?.emailLastSentStatus).toBe(emailLastSentStatus);
  });

  it("updates email status for multiple members", async () => {
    const member1Args = makeAddMemberArgs({
      meta: { name: "M1", userId: "member-1", email: "m1@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member2Args = makeAddMemberArgs({
      meta: { name: "M2", userId: "member-2", email: "m2@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];

    const member1 = await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const member2 = await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member1.member.id,
      sentEmailCount: 5,
      emailLastSentAt: new Date(),
      emailLastSentStatus: "sent" as const,
      storage,
    });

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member2.member.id,
      sentEmailCount: 10,
      emailLastSentAt: new Date(),
      emailLastSentStatus: "failed" as const,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
      },
      storage,
    });

    expect(members).toHaveLength(2);

    const member1Updated = members.find((m) => m.id === member1.member.id);
    const member2Updated = members.find((m) => m.id === member2.member.id);

    expect(member1Updated).toBeDefined();
    expect(Number(member1Updated!.meta?.sentEmailCount)).toBe(5);
    expect(member1Updated!.meta?.emailLastSentStatus).toBe("sent");

    expect(member2Updated).toBeDefined();
    expect(Number(member2Updated!.meta?.sentEmailCount)).toBe(10);
    expect(member2Updated!.meta?.emailLastSentStatus).toBe("failed");
  });

  it("preserves other member properties after email status update", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Test Member",
        userId: "test-member",
        email: "test@example.com",
        description: "Test description",
        department: "engineering",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 15;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "sent" as const;

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.name).toBe("Test Member");
    expect(members[0].meta?.email).toBe("test@example.com");
    expect(members[0].meta?.description).toBe("Test description");
    expect(members[0].meta?.department).toBe("engineering");
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
    expect(members[0].meta?.emailLastSentAt).toBeDefined();
    expect(members[0].meta?.emailLastSentStatus).toBe(emailLastSentStatus);
  });

  it("handles large email count values", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 999999;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "sent" as const;

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(Number(members[0].meta?.sentEmailCount)).toBe(sentEmailCount);
  });

  it("handles custom email status values", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const sentEmailCount = 2;
    const emailLastSentAt = new Date();
    const emailLastSentStatus = "custom_status" as "sent" | "failed" | "pending";

    await updateMemberSendEmailStatus({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      id: member.member.id,
      sentEmailCount,
      emailLastSentAt,
      emailLastSentStatus,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.emailLastSentStatus).toBe("custom_status");
  });
});
