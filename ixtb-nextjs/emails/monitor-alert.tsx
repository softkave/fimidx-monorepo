import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import { kAppConstants } from "fimidx-core/definitions/appConstants";

export interface MonitorAlertEmailProps {
  monitorName: string;
  monitorDescription?: string | null;
  matchCount: number;
  windowStart: string;
  windowEnd: string;
  timeFieldLabel: string;
  thresholdLabel: string;
  alertUrl: string;
  projectName?: string;
}

export function getMonitorAlertEmailTitle(params: {
  monitorName: string;
}) {
  return `${kAppConstants.name} — Alert: ${params.monitorName}`;
}

export const MonitorAlertEmail = (props: MonitorAlertEmailProps) => {
  const {
    monitorName,
    monitorDescription,
    matchCount,
    windowStart,
    windowEnd,
    timeFieldLabel,
    thresholdLabel,
    alertUrl,
  } = props;

  const title = getMonitorAlertEmailTitle({ monitorName });

  return (
    <Html>
      <Head />
      <Preview>
        {`${matchCount} matching ${matchCount === 1 ? "entry" : "entries"} for ${monitorName}`}
      </Preview>
      <Body style={main}>
        <Container>
          <Tailwind>
            <div className="w-full">
              <div className="max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-8">{title}</h1>
                <div>
                  <p className="mb-2">
                    Monitor <strong>{monitorName}</strong> found{" "}
                    <strong>{String(matchCount)}</strong> matching{" "}
                    {matchCount === 1 ? "entry" : "entries"}.
                  </p>
                  {monitorDescription ? (
                    <p className="mb-4 text-gray-600">{monitorDescription}</p>
                  ) : null}
                  <p className="mb-1 text-sm text-gray-600">
                    Window: {windowStart} → {windowEnd}
                  </p>
                  <p className="mb-1 text-sm text-gray-600">
                    Time field: {timeFieldLabel}
                  </p>
                  <p className="mb-4 text-sm text-gray-600">
                    Threshold: {thresholdLabel}
                  </p>
                  <Button
                    className="rounded-[8px] bg-blue-500 px-[16px] py-[8px] text-center font-semibold text-white"
                    href={alertUrl}
                  >
                    View alert
                  </Button>
                  <p className="mt-4 text-gray-500 text-sm">
                    Open in{" "}
                    <a
                      href={kClientPaths.withURL(kClientPaths.index)}
                      className="text-blue-500"
                    >
                      {kAppConstants.name}
                    </a>
                    .
                  </p>
                  <Hr />
                  <p className="text-gray-500 text-sm">
                    This is an automated email. Please do not reply directly to
                    this email.
                  </p>
                </div>
              </div>
            </div>
          </Tailwind>
        </Container>
      </Body>
    </Html>
  );
};

MonitorAlertEmail.PreviewProps = {
  monitorName: "High error rate",
  monitorDescription: "Alerts when error logs spike",
  matchCount: 42,
  windowStart: "2026-07-14 10:00 UTC",
  windowEnd: "2026-07-14 10:15 UTC",
  timeFieldLabel: "Ingestion time (createdAt)",
  thresholdLabel: "Alert on any match",
  alertUrl: "https://example.com/alerts/1",
} as MonitorAlertEmailProps;

export default MonitorAlertEmail;

const main = {
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif",
};
