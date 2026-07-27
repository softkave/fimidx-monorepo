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

export interface VerificationRequestEmailProps {
  url: string;
}

export function getVerificationRequestEmailTitle(params: { url: string }) {
  return `${kAppConstants.name} — Verification Request`;
}

export const VerificationRequestEmail = ({
  url,
}: VerificationRequestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{getVerificationRequestEmailTitle({ url })}</Preview>
      <Body style={main}>
        <Container>
          <Tailwind>
            <div className="w-full">
              <div className="max-w-lg mx-auto">
                <h1 className="text-2xl font-semibold mb-8">
                  {getVerificationRequestEmailTitle({ url })}
                </h1>
                <div>
                  <p className="mb-4">
                    Click the button below to verify your email address, and
                    continue to {kAppConstants.name}.
                  </p>
                  <Button
                    className="rounded-[8px] bg-blue-500 px-[16px] py-[8px] text-center font-semibold text-white"
                    href={url}
                  >
                    Verify Email
                  </Button>
                  <p className="text-gray-500">
                    If you did not request this verification, you can safely
                    ignore this email.
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

VerificationRequestEmail.PreviewProps = {
  url: "https://example.com",
} as VerificationRequestEmailProps;

export default VerificationRequestEmail;

const main = {
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif",
};
