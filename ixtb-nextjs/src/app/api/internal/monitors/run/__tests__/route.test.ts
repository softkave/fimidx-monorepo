import { getObjModel } from "fimidx-core/db/fimidx.mongo";
import { kByTypes } from "fimidx-core/definitions/index";
import {
  kMonitorResourceTypes,
  kMonitorStatus,
  kMonitorTimeFields,
} from "fimidx-core/definitions/monitor";
import { kObjTags } from "fimidx-core/definitions/obj";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { getCoreConfigMock } = vi.hoisted(() => ({
  getCoreConfigMock: vi.fn(),
}));

vi.mock("fimidx-core/common/getCoreConfig", async () => {
  const actual = await vi.importActual<
    typeof import("fimidx-core/common/getCoreConfig")
  >("fimidx-core/common/getCoreConfig");

  getCoreConfigMock.mockImplementation(() => {
    const config = actual.getCoreConfig();
    return {
      ...config,
      fimidxInternal: {
        ...config.fimidxInternal,
        internalAccessKey: "secret-key",
      },
    };
  });

  return { getCoreConfig: getCoreConfigMock };
});

vi.mock("@/src/lib/serverHelpers/emails/sendMonitorAlertEmail", () => ({
  sendMonitorAlertEmail: vi.fn(async () => ({ sent: 0, failed: 0 })),
}));

vi.mock("fimidx-core/common/logger/fimidx-console-logger", () => ({
  fimidxConsoleLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { addMonitor, getMonitorById } from "fimidx-core/serverHelpers/index";
import { POST } from "../route";

const defaultProjectId = "test-project-internal-run-route";
const defaultGroupId = "test-group-internal-run-route";
const defaultBy = "tester";

function makeReq(params: { key?: string | null; body?: unknown }): Request {
  const headers = new Headers();
  if (params.key != null) {
    headers.set("x-internal-access-key", params.key);
  }
  return new Request("http://localhost/api/internal/monitors/run", {
    method: "POST",
    headers,
    body: JSON.stringify(params.body ?? { monitorId: "mon-1" }),
  });
}

describe("internal monitors/run auth (real DB)", () => {
  beforeAll(async () => {
    await getObjModel().findOne({ tag: kObjTags.monitor }).lean();
  });

  beforeEach(async () => {
    getCoreConfigMock.mockClear();

    await getObjModel().deleteMany({
      tag: { $in: [kObjTags.monitor, kObjTags.monitorRun, kObjTags.alert] },
      projectId: defaultProjectId,
    });
  });

  afterEach(async () => {
    await getObjModel().deleteMany({
      tag: { $in: [kObjTags.monitor, kObjTags.monitorRun, kObjTags.alert] },
      projectId: defaultProjectId,
    });
  });

  it("returns 401 when access key is missing", async () => {
    const res = await POST(makeReq({ key: null }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when access key is wrong", async () => {
    const res = await POST(makeReq({ key: "wrong" }) as never);
    expect(res.status).toBe(401);
  });

  it("invokes runMonitor against DB when access key is valid", async () => {
    const { monitor } = await addMonitor({
      args: {
        projectId: defaultProjectId,
        name: `Internal Run ${Date.now()}`,
        status: kMonitorStatus.enabled,
        reportsTo: [],
        interval: { minutes: 10 },
        query: { recordQuery: [{ op: "eq", field: "level", value: "error" }] },
        resourceType: kMonitorResourceTypes.logs,
        timeField: kMonitorTimeFields.createdAt,
      },
      by: defaultBy,
      byType: kByTypes.user,
      groupId: defaultGroupId,
      skipReportsToValidation: true,
    });

    const res = await POST(
      makeReq({ key: "secret-key", body: { monitorId: monitor.id } }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suppressedReason).toBe("no_matches");

    const after = await getMonitorById({ monitorId: monitor.id });
    expect(after?.runningAt).toBeNull();
    expect(after?.lastRunAt).toBeTruthy();
  });
});
