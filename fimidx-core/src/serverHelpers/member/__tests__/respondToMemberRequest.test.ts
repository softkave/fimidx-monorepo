import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  kMemberStatus,
  type AddMemberEndpointArgs,
  type RespondToMemberRequestEndpointArgs,
} from "../../../definitions/member.js";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";
import { respondToMemberRequest } from "../respondToMemberRequest.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("respondToMemberRequest integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "respondToMemberRequest",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddMemberArgs(
    overrides: Partial<AddMemberEndpointArgs> = {}
  ): AddMemberEndpointArgs {
    const testData = makeTestData({ testName: "member" });
    return {
      projectId,
      groupId,
      meta: {
        name: testData.name,
        userId: testData.memberId,
        email: testData.email,
      },
      permissions: [],
      ...overrides,
    };
  }

  function makeRespondToMemberRequestArgs(
    overrides: Partial<RespondToMemberRequestEndpointArgs> = {}
  ): RespondToMemberRequestEndpointArgs {
    return {
      query: { projectId, groupId, id: "test-request-id" },
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
    // Create a pending member (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com", status: kMemberStatus.pending },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: member.member.id },
      status: kMemberStatus.accepted,
    });

    // Respond to the request
    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated (status in meta)
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.status).toBe(kMemberStatus.accepted);
    expect(members[0].meta?.statusUpdatedAt).toBeDefined();
  });

  it("rejects a pending member request successfully", async () => {
    // Create a pending member (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com", status: kMemberStatus.pending },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: member.member.id },
      status: kMemberStatus.rejected,
    });

    // Respond to the request
    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated (status in meta)
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.status).toBe(kMemberStatus.rejected);
    expect(members[0].meta?.statusUpdatedAt).toBeDefined();
  });

  it("throws error when member request not found", async () => {
    const args = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: "non-existent-request-id" },
    });

    await expect(
      respondToMemberRequest({
        args,
        storage,
      })
    ).rejects.toThrow("Member request not found");
  });

  it("throws error when member status is not pending", async () => {
    // Create an accepted member (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com", status: kMemberStatus.accepted },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: member.member.id },
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
    // Create a pending member in a different project (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member-respondToMemberRequest", email: "t@test.com", status: kMemberStatus.pending },
      projectId: "different-project",
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      query: { projectId: "different-project", groupId, id: member.member.id },
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated (status in meta)
    const { members } = await getMembers({
      args: {
        query: {
          projectId: "different-project",
          groupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.status).toBe(kMemberStatus.accepted);
  });

  it("handles different group IDs", async () => {
    // Create a pending member in a different group (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com", status: kMemberStatus.pending },
      groupId: "different-group",
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeRespondToMemberRequestArgs({
      query: { projectId, groupId: "different-group", id: member.member.id },
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args,
      storage,
    });

    // Verify the member status was updated (status in meta)
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId: "different-group",
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.status).toBe(kMemberStatus.accepted);
  });

  it("updates statusUpdatedAt timestamp", async () => {
    // Create a pending member (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com", status: kMemberStatus.pending },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const beforeTime = new Date();

    const args = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: member.member.id },
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args,
      storage,
    });

    const afterTime = new Date();

    // Verify the member status was updated (statusUpdatedAt in meta)
    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members).toHaveLength(1);
    expect(members[0].meta?.statusUpdatedAt).toBeDefined();
    const statusUpdatedAtVal = members[0].meta?.statusUpdatedAt;
    const ts = typeof statusUpdatedAtVal === "string" ? new Date(statusUpdatedAtVal).getTime() : Number(statusUpdatedAtVal);
    expect(ts).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(ts).toBeLessThanOrEqual(afterTime.getTime() + 1000);
  });

  it("handles multiple status updates to the same member", async () => {
    // Create a pending member (status in meta)
    const memberArgs = makeAddMemberArgs({
      meta: { name: "Test", userId: "test-member", email: "t@test.com", status: kMemberStatus.pending },
    });

    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    // First update: accept
    const args1 = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: member.member.id },
      status: kMemberStatus.accepted,
    });

    await respondToMemberRequest({
      args: args1,
      storage,
    });

    // Verify first update (status in meta)
    let { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: member.member.id },
        },
      },
      storage,
    });

    expect(members[0].meta?.status).toBe(kMemberStatus.accepted);

    // Second update: reject (this should fail since status is no longer pending)
    const args2 = makeRespondToMemberRequestArgs({
      query: { projectId, groupId, id: member.member.id },
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
