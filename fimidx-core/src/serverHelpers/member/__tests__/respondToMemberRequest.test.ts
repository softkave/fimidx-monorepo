import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { kMemberStatus } from "../../../definitions/member.js";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";
import { respondToMemberRequest } from "../respondToMemberRequest.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("respondToMemberRequest integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "respondToMemberRequest",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddMemberArgs(overrides: any = {}) {
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

  function makeRespondToMemberRequestArgs(overrides: any = {}) {
    return {
      projectId,
      groupId,
      requestId: "test-request-id",
      status: kMemberStatus.accepted,
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

  it("accepts a pending member request successfully", async () => {
    // Create a pending member
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      seed: {
        status: kMemberStatus.pending,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.pending },
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      requestId: member.member.id,
      status: kMemberStatus.accepted,
    });

    // Respond to the request
    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          memberId: { eq: member.member.memberId },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].status).toBe(kMemberStatus.accepted);
    expect(members[0].statusUpdatedAt).toBeInstanceOf(Date);
  });

  it("rejects a pending member request successfully", async () => {
    // Create a pending member
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      seed: {
        status: kMemberStatus.pending,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.pending },
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      requestId: member.member.id,
      status: kMemberStatus.rejected,
    });

    // Respond to the request
    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          memberId: { eq: member.member.memberId },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].status).toBe(kMemberStatus.rejected);
    expect(members[0].statusUpdatedAt).toBeInstanceOf(Date);
  });

  it("throws error when member request not found", async () => {
    const args = makeRespondToMemberRequestArgs({
      requestId: "non-existent-request-id",
    });

    await expect(
      respondToMemberRequest({
        args,
        storage,
      })
    ).rejects.toThrow("Member request not found");
  });

  it("throws error when member status is not pending", async () => {
    // Create an accepted member
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      seed: {
        status: kMemberStatus.accepted,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.accepted },
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      requestId: member.member.id,
      status: kMemberStatus.rejected,
    });

    await expect(
      respondToMemberRequest({
        args,
        storage,
      })
    ).rejects.toThrow("Invalid status");
  });

  it("handles different project IDs", async () => {
    // Create a pending member in a different project
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member-respondToMemberRequest",
      projectId: "different-project",
      seed: {
        status: kMemberStatus.pending,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.pending },
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      projectId: "different-project",
      requestId: member.member.id,
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated
    const { members } = await getMembers({
      args: {
        query: {
          projectId: "different-project",
          groupId,
          memberId: { eq: member.member.memberId },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].status).toBe(kMemberStatus.accepted);
  });

  it("handles different group IDs", async () => {
    // Create a pending member in a different group
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      groupId: "different-group",
      seed: {
        status: kMemberStatus.pending,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.pending },
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      groupId: "different-group",
      requestId: member.member.id,
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId: "different-group",
          memberId: { eq: member.member.memberId },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].status).toBe(kMemberStatus.accepted);
  });

  it("updates statusUpdatedAt timestamp", async () => {
    // Create a pending member
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      seed: {
        status: kMemberStatus.pending,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.pending },
      storage,
    });

    const beforeTime = new Date();

    const args = makeRespondToMemberRequestArgs({
      requestId: member.member.id,
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args,
      storage,
    });

    const afterTime = new Date();

    // Verify the member status was updated
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          memberId: { eq: member.member.memberId },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].statusUpdatedAt).toBeInstanceOf(Date);

    const statusUpdatedAt = members[0].statusUpdatedAt as Date;
    expect(statusUpdatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeTime.getTime()
    );
    expect(statusUpdatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it("handles multiple status updates to the same member", async () => {
    // Create a pending member
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      seed: {
        status: kMemberStatus.pending,
      },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      seed: { status: kMemberStatus.pending },
      storage,
    });

    // First update: accept
    const args1 = makeRespondToMemberRequestArgs({
      requestId: member.member.id,
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args: args1,
      storage,
    });

    // Verify first update
    let { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          memberId: { eq: member.member.memberId },
        },
      },
      storage,
    });

    expect(members[0].status).toBe(kMemberStatus.accepted);

    // Second update: reject (this should fail since status is no longer pending)
    const args2 = makeRespondToMemberRequestArgs({
      requestId: member.member.id,
      status: kMemberStatus.rejected,
    });

    await expect(
      respondToMemberRequest({
        args: args2,
        storage,
      })
    ).rejects.toThrow("Invalid status");
  });
});
