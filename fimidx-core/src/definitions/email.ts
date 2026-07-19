import type { ValueOf } from "type-fest";

export const kEmailRecordReason = {
  addParticipant: "addParticipant",
  verificationRequest: "verificationRequest",
  monitorAlert: "monitorAlert",
} as const;

export const kGeneralEmailCallerId = {
  verificationRequest: "verificationRequest",
} as const;

export const kEmailRecordProvider = {
  resend: "resend",
} as const;

export const kEmailRecordStatus = {
  pending: "pending",
  sent: "sent",
  failed: "failed",
} as const;

export const kEmailBlockListReason = {
  other: "other",
} as const;

export type EmailRecordReason = ValueOf<typeof kEmailRecordReason>;
export type EmailRecordProvider = ValueOf<typeof kEmailRecordProvider>;
export type EmailRecordStatus = ValueOf<typeof kEmailRecordStatus>;
export type EmailBlockListReason = ValueOf<typeof kEmailBlockListReason>;

export interface IEmailRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  from: string;
  to: string;
  subject: string;
  status: EmailRecordStatus | (string & {});
  reason: EmailRecordReason | (string & {});
  params: Record<string, unknown> | null;
  provider: EmailRecordProvider | (string & {});
  /** JSON stringified response from the provider */
  response: string | null;
  /** JSON stringified error from the provider */
  senderError: string | null;
  /** JSON stringified error from the server */
  serverError: string | null;
  /** ID of the caller that created the email record, e.g. add participant
   * mapping ID */
  callerId: string | null;
}

export interface IEmailBlockList {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  /** Justifying email record id */
  justifyingEmailRecordId: string | null;
  /** Reason for blocking the email */
  reason: EmailBlockListReason | null;
}
