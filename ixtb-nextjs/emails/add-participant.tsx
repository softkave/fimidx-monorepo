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

export interface AddParticipantEmailProps {
  orgName: string;
  inviterName: string;
}

export function getAddParticipantEmailTitle(params: {
  orgName: string;
  inviterName: string;
}) {
  return `${kAppConstants.name} — Invitation to join ${params.orgName}`;
}

export const AddParticipantEmail = ({
  orgName,
  inviterName,
}: AddParticipantEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{getAddParticipantEmailTitle({ orgName, inviterName })}</Preview>
      <Body style={main}>
        <Container>
          <Tailwind>
            <div className="w-full">
              <div className="max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-8">
                  {getAddParticipantEmailTitle({ orgName, inviterName })}
                </h1>
                <div>
                  <p className="mb-0">
                    You have been invited by <strong>{inviterName}</strong> to
                    join org <strong>{orgName}</strong> on{" "}
                    <a
                      href={kClientPaths.withURL(kClientPaths.index)}
                      className="text-blue-500"
                    >
                      <strong>{kAppConstants.name}</strong>
                    </a>
                    .
                  </p>
                  <p className="mb-4">
                    Click the button below to see and accept invitations —{" "}
                    <span className="text-gray-500">
                      you may need to signup if you do not have an existing
                      account
                    </span>
                    .
                  </p>
                  <Button
                    className="rounded-[8px] bg-blue-500 px-[16px] py-[8px] text-center font-semibold text-white"
                    href={`${kClientPaths.withURL(
                      kClientPaths.app.myRequests
                    )}`}
                  >
                    Accept Invitation
                  </Button>
                  <p className="text-gray-500">
                    If you do not wish to join, you can safely ignore this
                    email.
                  </p>
                  <Hr />
                  <p className="text-gray-500">
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

AddParticipantEmail.PreviewProps = {
  orgName: "fmlogs",
  inviterName: "John Doe",
} as AddParticipantEmailProps;

export default AddParticipantEmail;

const main = {
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif",
};
