import { eq } from "drizzle-orm";
import { getCoreConfig } from "fimidx-core/common/getCoreConfig";
import {
  db,
  emailBlockLists as emailBlockListTable,
  emailRecords as emailRecordTable,
} from "fimidx-core/db/fimidx.postgres";
import {
  EmailRecordReason,
  EmailRecordStatus,
  kEmailRecordProvider,
  kEmailRecordStatus,
} from "fimidx-core/definitions/email";
import { Resend } from "resend";
import { AnyObject, convertToArray, OmitFrom } from "softkave-js-utils";
import { ixtbConsoleLogger } from "../../common/ixtb-loggers";

const { resend: resendConfig } = getCoreConfig();

const resend = new Resend(resendConfig.apiKey);

type SendEmailParams = OmitFrom<
  Parameters<typeof resend.emails.send>[0],
  "from"
> & {
  reason: EmailRecordReason;
  params: AnyObject;
  callerId: string | null;
};

export async function isEmailBlocked(email: string) {
  const emailRecord = await db
    .select()
    .from(emailBlockListTable)
    .where(eq(emailBlockListTable.email, email.toLowerCase()))
    .then(([emailRecord]) => emailRecord);

  return emailRecord;
}

export async function createEmailRecord(params: {
  from: string;
  to: string;
  subject: string;
  params: AnyObject;
  reason: EmailRecordReason;
  callerId: string | null;
}) {
  const newEmailRecord = {
    from: params.from,
    to: params.to,
    subject: params.subject,
    params: params.params,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: kEmailRecordStatus.pending,
    provider: kEmailRecordProvider.resend,
    reason: params.reason,
    callerId: params.callerId,
  } satisfies OmitFrom<typeof emailRecordTable.$inferInsert, "id">;

  const emailRecord = await db
    .insert(emailRecordTable)
    .values(newEmailRecord)
    .returning()
    .then(([emailRecord]) => emailRecord);

  return emailRecord;
}

export async function updateEmailRecord(params: {
  emailRecordId: string;
  status: EmailRecordStatus;
  response?: string;
  senderError?: string;
  serverError?: string;
}) {
  const emailRecord = await db
    .update(emailRecordTable)
    .set({
      status: params.status,
      updatedAt: new Date(),
      response: params.response,
      senderError: params.senderError,
      serverError: params.serverError,
    })
    .where(eq(emailRecordTable.id, params.emailRecordId))
    .returning()
    .then(([emailRecord]) => emailRecord);

  return emailRecord;
}

export const sendEmail = async (
  params: SendEmailParams
): Promise<{
  success: boolean;
  emailRecords: Array<{
    id: string;
    status: EmailRecordStatus;
  }>;
}> => {
  try {
    const { to, subject, reason, params: params2, callerId } = params;
    const from = resendConfig.fromEmail;
    const emailRecords = await Promise.all(
      convertToArray(to).map(async (to) => {
        const emailRecord = await createEmailRecord({
          from,
          to,
          subject,
          params: params2,
          reason,
          callerId,
        });

        return emailRecord;
      })
    );

    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        react: params.react,
      });

      const responseString = data ? JSON.stringify(data) : undefined;
      const senderErrorString = error ? JSON.stringify(error) : undefined;
      await Promise.allSettled(
        emailRecords.map(async (emailRecord) => {
          await updateEmailRecord({
            emailRecordId: emailRecord.id,
            status: error ? kEmailRecordStatus.failed : kEmailRecordStatus.sent,
            response: responseString,
            senderError: senderErrorString,
          });
        })
      );

      const emailRecordsResult = emailRecords.map((emailRecord) => ({
        id: emailRecord.id,
        status: error ? kEmailRecordStatus.failed : kEmailRecordStatus.sent,
      }));

      return { success: true, emailRecords: emailRecordsResult };
    } catch (sendEmailError) {
      ixtbConsoleLogger.error(sendEmailError);
      const serverErrorString = JSON.stringify(sendEmailError);
      await Promise.allSettled(
        emailRecords.map(async (emailRecord) => {
          await updateEmailRecord({
            emailRecordId: emailRecord.id,
            status: kEmailRecordStatus.failed,
            serverError: serverErrorString,
          });
        })
      );

      const emailRecordsResult = emailRecords.map((emailRecord) => ({
        id: emailRecord.id,
        status: kEmailRecordStatus.failed,
      }));

      return { success: false, emailRecords: emailRecordsResult };
    }
  } catch (error) {
    ixtbConsoleLogger.error(error);
    return { success: false, emailRecords: [] };
  }
};
