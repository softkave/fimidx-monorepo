import { kId0 } from "fimidx-core/definitions/system";
import { describe, expect, it } from "vitest";
import {
  sanitizeAddCallbackInput,
  sanitizeAddClientTokenInput,
  sanitizeAddMemberInput,
  sanitizeAddMonitorInput,
  sanitizeAddProjectInput,
  sanitizeDeleteOrgInput,
  sanitizeEncodeClientTokenJWTInput,
  sanitizeGetCallbacksInput,
  sanitizeGetClientTokensInput,
  sanitizeGetLogFieldsInput,
  sanitizeGetLogsInput,
  sanitizeGetManyObjsInput,
  sanitizeGetMembersInput,
  sanitizeGetMonitorsInput,
  sanitizeGetObjFieldsInput,
  sanitizeGetOrgInput,
  sanitizeGetProjectsInput,
  sanitizeIngestLogsInput,
  sanitizeSetManyObjsInput,
  sanitizeUpdateOrgInput,
} from "./sanitizeKId0";

const kMessage = "Reserved system id is not allowed in input.";

function expectKId0Error(fn: () => void): void {
  expect(fn).toThrow(kMessage);
}

describe("sanitizeKId0", () => {
  describe("org", () => {
    it("sanitizeGetOrgInput throws when id is kId0", () => {
      expectKId0Error(() => sanitizeGetOrgInput({ id: kId0 }));
    });
    it("sanitizeGetOrgInput does not throw for valid id", () => {
      expect(() => sanitizeGetOrgInput({ id: "org-123" })).not.toThrow();
    });
    it("sanitizeUpdateOrgInput throws when id is kId0", () => {
      expectKId0Error(() =>
        sanitizeUpdateOrgInput({ id: kId0, update: { name: "x" } })
      );
    });
    it("sanitizeDeleteOrgInput throws when id is kId0", () => {
      expectKId0Error(() => sanitizeDeleteOrgInput({ id: kId0 }));
    });
  });

  describe("project", () => {
    it("sanitizeAddProjectInput throws when orgId is kId0", () => {
      expectKId0Error(() =>
        sanitizeAddProjectInput({ orgId: kId0, name: "p" })
      );
    });
    it("sanitizeAddProjectInput does not throw for valid orgId", () => {
      expect(() =>
        sanitizeAddProjectInput({ orgId: "org-1", name: "p" })
      ).not.toThrow();
    });
    it("sanitizeGetProjectsInput throws when query.orgId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetProjectsInput({
          query: { orgId: kId0 },
        })
      );
    });
    it("sanitizeGetProjectsInput throws when query.id.eq is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetProjectsInput({
          query: { orgId: "org-1", id: { eq: kId0 } },
        })
      );
    });
  });

  describe("callback", () => {
    it("sanitizeAddCallbackInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeAddCallbackInput({
          projectId: kId0,
          url: "https://example.com",
          method: "POST",
        })
      );
    });
    it("sanitizeGetCallbacksInput throws when query.projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetCallbacksInput({
          query: { projectId: kId0 },
        })
      );
    });
  });

  describe("monitor", () => {
    it("sanitizeAddMonitorInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeAddMonitorInput({
          projectId: kId0,
          name: "m",
          query: {},
          status: "enabled",
          reportsTo: [],
          interval: { days: 1 },
        })
      );
    });
    it("sanitizeAddMonitorInput throws when reportsTo contains kId0", () => {
      expectKId0Error(() =>
        sanitizeAddMonitorInput({
          projectId: "p1",
          name: "m",
          query: {},
          status: "enabled",
          reportsTo: [kId0],
          interval: { days: 1 },
        })
      );
    });
    it("sanitizeGetMonitorsInput throws when query.projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetMonitorsInput({
          query: { projectId: kId0 },
        })
      );
    });
  });

  describe("member", () => {
    it("sanitizeAddMemberInput throws when groupId is kId0", () => {
      expectKId0Error(() =>
        sanitizeAddMemberInput({
          groupId: kId0,
          projectId: "p1",
          permissions: [],
        })
      );
    });
    it("sanitizeAddMemberInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeAddMemberInput({
          groupId: "g1",
          projectId: kId0,
          permissions: [],
        })
      );
    });
    it("sanitizeGetMembersInput throws when query.projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetMembersInput({
          query: { groupId: "g1", projectId: kId0 },
        })
      );
    });
  });

  describe("clientToken", () => {
    it("sanitizeAddClientTokenInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeAddClientTokenInput({
          groupId: "g1",
          projectId: kId0,
        })
      );
    });
    it("sanitizeGetClientTokensInput throws when query.projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetClientTokensInput({
          query: { projectId: kId0, groupId: "g1" },
        } as Parameters<typeof sanitizeGetClientTokensInput>[0])
      );
    });
    it("sanitizeEncodeClientTokenJWTInput throws when id is kId0", () => {
      expectKId0Error(() =>
        sanitizeEncodeClientTokenJWTInput({
          id: kId0,
          projectId: "proj1",
        })
      );
    });
  });

  describe("objs", () => {
    it("sanitizeSetManyObjsInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeSetManyObjsInput({
          projectId: kId0,
          items: [{}],
        })
      );
    });
    it("sanitizeGetManyObjsInput throws when query.projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetManyObjsInput({
          query: { metaQuery: { projectId: { eq: kId0 } } },
        })
      );
    });
    it("sanitizeGetManyObjsInput does not throw when only recordQuery contains kId0 (exempt)", () => {
      expect(() =>
        sanitizeGetManyObjsInput({
          query: {
            metaQuery: { projectId: { eq: "p1" } },
            recordQuery: [{ op: "eq" as const, field: "foo", value: kId0 }],
          },
        })
      ).not.toThrow();
    });
    it("sanitizeGetObjFieldsInput throws when projectId is kId0", () => {
      expectKId0Error(() => sanitizeGetObjFieldsInput({ projectId: kId0 }));
    });
  });

  describe("logs", () => {
    it("sanitizeGetLogFieldsInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetLogFieldsInput({ query: { projectId: kId0 } })
      );
    });
    it("sanitizeGetLogFieldsInput does not throw for valid projectId", () => {
      expect(() =>
        sanitizeGetLogFieldsInput({ query: { projectId: "p1" } })
      ).not.toThrow();
    });
    it("sanitizeIngestLogsInput throws when projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeIngestLogsInput({ projectId: kId0, logs: [{}] })
      );
    });
    it("sanitizeGetLogsInput throws when query.projectId is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetLogsInput({
          query: { projectId: kId0 },
        })
      );
    });
    it("sanitizeGetLogsInput throws when query.metaQuery.id.eq is kId0", () => {
      expectKId0Error(() =>
        sanitizeGetLogsInput({
          query: { projectId: "p1", id: { eq: kId0 } },
        })
      );
    });
    it("sanitizeGetLogsInput does not throw when only logsQuery contains kId0 (exempt)", () => {
      expect(() =>
        sanitizeGetLogsInput({
          query: {
            projectId: "p1",
            logsQuery: [{ op: "eq" as const, field: "msg", value: kId0 }],
          },
        })
      ).not.toThrow();
    });
  });
});
