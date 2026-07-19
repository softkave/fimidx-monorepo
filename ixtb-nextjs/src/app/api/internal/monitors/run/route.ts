import { getCoreConfig } from "fimidx-core/common/getCoreConfig";
import { kByTypes } from "fimidx-core/definitions/index";
import { runMonitorSchema } from "fimidx-core/definitions/monitor";
import {
  runMonitor,
  type SendMonitorAlertEmailFn,
} from "fimidx-core/serverHelpers/index";
import { NextRequest, NextResponse } from "next/server";
import { sendMonitorAlertEmail } from "@/src/lib/serverHelpers/emails/sendMonitorAlertEmail";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";

const INTERNAL_ACCESS_KEY_HEADER = "x-internal-access-key";

export async function POST(req: NextRequest) {
  try {
    const {
      fimidxInternal: { internalAccessKey },
    } = getCoreConfig();

    const provided = req.headers.get(INTERNAL_ACCESS_KEY_HEADER);
    if (!provided || provided !== internalAccessKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = runMonitorSchema.parse(body);

    const sendAlertEmail: SendMonitorAlertEmailFn = async (params) => {
      return sendMonitorAlertEmail(params);
    };

    const result = await runMonitor({
      monitorId: input.monitorId,
      by: "system",
      byType: kByTypes.system,
      sendAlertEmail,
    });

    return NextResponse.json(result);
  } catch (err) {
    fimidxConsoleLogger.error({
      message: "[internal/monitors/run]",
      error: err,
    });
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
