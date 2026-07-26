import {
  MonitorAlertEmail,
  getMonitorAlertEmailTitle,
  type MonitorAlertEmailProps,
} from "@/emails/monitor-alert";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";
import type { IAlert } from "fimidx-core/definitions/alert";
import { kAlertTimeFieldLabels } from "fimidx-core/definitions/alert";
import { kEmailRecordReason } from "fimidx-core/definitions/email";
import type { IMonitor } from "fimidx-core/definitions/monitor";
import { convertToArray } from "softkave-js-utils";
import { sendEmail } from "./sendEmail";

export async function sendMonitorAlertEmail(params: {
  to: string | string[];
  monitor: IMonitor;
  alert: IAlert;
  matchCount: number;
}) {
  const recipients = convertToArray(params.to);
  const alertUrl = kClientPaths.withURL(
    kClientPaths.app.org.project.alerts.single(
      params.monitor.groupId,
      params.monitor.projectId,
      params.alert.id
    )
  );

  const thresholdLabel =
    params.monitor.alertIfCountGreaterThan == null
      ? "Alert on any match"
      : `Count greater than ${params.monitor.alertIfCountGreaterThan}`;

  const emailProps: MonitorAlertEmailProps = {
    monitorName: params.monitor.name,
    monitorDescription: params.monitor.description,
    matchCount: params.matchCount,
    windowStart: new Date(params.alert.windowStart).toUTCString(),
    windowEnd: new Date(params.alert.windowEnd).toUTCString(),
    timeFieldLabel: kAlertTimeFieldLabels[params.alert.timeField],
    thresholdLabel,
    alertUrl,
  };

  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      const { success } = await sendEmail({
        to: [to],
        subject: getMonitorAlertEmailTitle({
          monitorName: params.monitor.name,
        }),
        react: await MonitorAlertEmail(emailProps),
        reason: kEmailRecordReason.monitorAlert,
        params: emailProps,
        callerId: params.alert.id,
      });
      if (success) sent++;
      else failed++;
    } catch (err) {
      failed++;
      fimidxConsoleLogger.error({
        message: "[sendMonitorAlertEmail] failed",
        to,
        monitorId: params.monitor.id,
        alertId: params.alert.id,
        error: err,
      });
    }
  }

  return { sent, failed };
}
