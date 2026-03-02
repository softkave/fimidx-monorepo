/**
 * Sanitization to reject kId0 (reserved system id) in endpoint inputs.
 * Prevents callers from supplying the system id in entity id fields.
 */

import type {
  DeleteOrgEndpointArgs,
  GetOrgEndpointArgs,
  UpdateOrgEndpointArgs,
} from "@/src/definitions/org";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import type {
  DeleteCallbacksEndpointArgs,
  GetCallbacksEndpointArgs,
} from "fimidx-core/definitions/callback";
import type {
  DeleteClientTokensEndpointArgs,
  GetClientTokensEndpointArgs,
  UpdateClientTokensEndpointArgs,
} from "fimidx-core/definitions/clientToken";
import type {
  AddCallbackEndpointArgs,
  AddClientTokenEndpointArgs,
  AddProjectEndpointArgs,
} from "fimidx-core/definitions/index";
import type {
  AddMemberEndpointArgs,
  DeleteMembersEndpointArgs,
  GetMembersEndpointArgs,
  UpdateMembersEndpointArgs,
} from "fimidx-core/definitions/member";
import type {
  AddMonitorEndpointArgs,
  DeleteMonitorsEndpointArgs,
  GetMonitorsEndpointArgs,
  UpdateMonitorsEndpointArgs,
} from "fimidx-core/definitions/monitor";
import type {
  IDeleteManyObjsEndpointArgs,
  IGetManyObjsEndpointArgs,
  IObjQuery,
  ISetManyObjsEndpointArgs,
  IUpdateManyObjsEndpointArgs,
} from "fimidx-core/definitions/obj";
import type {
  GetLogFieldsEndpointArgs,
  GetLogsEndpointArgs,
  IngestLogsEndpointArgs,
} from "fimidx-core/definitions/log";
import type {
  DeleteProjectsEndpointArgs,
  GetProjectsEndpointArgs,
  UpdateProjectsEndpointArgs,
} from "fimidx-core/definitions/project";
import { kId0 } from "fimidx-core/definitions/system";

const kMessage = "Reserved system id is not allowed in input.";

function rejectIfKId0(
  value: string | string[] | undefined,
  _fieldLabel: string
): void {
  if (value === undefined) return;
  if (typeof value === "string") {
    if (value === kId0) {
      throw new OwnServerError(kMessage, kOwnServerErrorCodes.InvalidRequest);
    }
    return;
  }
  for (const v of value) {
    if (v === kId0) {
      throw new OwnServerError(kMessage, kOwnServerErrorCodes.InvalidRequest);
    }
  }
}

function sanitizeStringMetaQuery(
  meta: { eq?: string; in?: string[]; not_in?: string[] } | undefined,
  fieldLabel: string
): void {
  if (!meta) return;
  rejectIfKId0(meta.eq, fieldLabel);
  rejectIfKId0(meta.in, fieldLabel);
  rejectIfKId0(meta.not_in, fieldLabel);
}

// --- Org (ixtb-nextjs) ---

export function sanitizeGetOrgInput(input: GetOrgEndpointArgs): void {
  rejectIfKId0(input.id, "id");
}

export function sanitizeUpdateOrgInput(input: UpdateOrgEndpointArgs): void {
  rejectIfKId0(input.id, "id");
}

export function sanitizeDeleteOrgInput(input: DeleteOrgEndpointArgs): void {
  rejectIfKId0(input.id, "id");
}

// addOrgSchema / getOrgsSchema have no id-like fields to sanitize

// --- Project (fimidx-core) ---

export function sanitizeAddProjectInput(input: AddProjectEndpointArgs): void {
  rejectIfKId0(input.orgId, "orgId");
}

function sanitizeProjectQuery(query: GetProjectsEndpointArgs["query"]): void {
  rejectIfKId0(query.orgId, "query.orgId");
  sanitizeStringMetaQuery(query.id, "query.id");
}

export function sanitizeGetProjectsInput(input: GetProjectsEndpointArgs): void {
  sanitizeProjectQuery(input.query);
}

export function sanitizeUpdateProjectsInput(
  input: UpdateProjectsEndpointArgs
): void {
  sanitizeProjectQuery(input.query);
}

export function sanitizeDeleteProjectsInput(
  input: DeleteProjectsEndpointArgs
): void {
  sanitizeProjectQuery(input.query);
}

// --- Callback ---

export function sanitizeAddCallbackInput(input: AddCallbackEndpointArgs): void {
  rejectIfKId0(input.projectId, "projectId");
}

function sanitizeCallbacksQuery(
  query: GetCallbacksEndpointArgs["query"]
): void {
  rejectIfKId0(query.projectId, "query.projectId");
  sanitizeStringMetaQuery(query.id, "query.id");
  sanitizeStringMetaQuery(query.createdBy, "query.createdBy");
  sanitizeStringMetaQuery(query.updatedBy, "query.updatedBy");
}

export function sanitizeGetCallbacksInput(
  input: GetCallbacksEndpointArgs
): void {
  sanitizeCallbacksQuery(input.query);
}

export function sanitizeDeleteCallbacksInput(
  input: DeleteCallbacksEndpointArgs
): void {
  sanitizeCallbacksQuery(input.query);
}

// --- Monitor ---

export function sanitizeAddMonitorInput(input: AddMonitorEndpointArgs): void {
  rejectIfKId0(input.projectId, "projectId");
  rejectIfKId0(input.reportsTo, "reportsTo");
}

function sanitizeMonitorQuery(query: GetMonitorsEndpointArgs["query"]): void {
  rejectIfKId0(query.projectId, "query.projectId");
  sanitizeStringMetaQuery(query.id, "query.id");
  sanitizeStringMetaQuery(query.createdBy, "query.createdBy");
  sanitizeStringMetaQuery(query.updatedBy, "query.updatedBy");
}

export function sanitizeGetMonitorsInput(input: GetMonitorsEndpointArgs): void {
  sanitizeMonitorQuery(input.query);
}

export function sanitizeDeleteMonitorsInput(
  input: DeleteMonitorsEndpointArgs
): void {
  sanitizeMonitorQuery(input.query);
}

export function sanitizeUpdateMonitorsInput(
  input: UpdateMonitorsEndpointArgs
): void {
  sanitizeMonitorQuery(input.query);
  if (input.update.reportsTo !== undefined) {
    rejectIfKId0(input.update.reportsTo, "update.reportsTo");
  }
}

// --- Member ---

export function sanitizeAddMemberInput(input: AddMemberEndpointArgs): void {
  rejectIfKId0(input.groupId, "groupId");
  rejectIfKId0(input.projectId, "projectId");
  rejectIfKId0(input.memberId, "memberId");
}

function sanitizeMemberQuery(query: GetMembersEndpointArgs["query"]): void {
  rejectIfKId0(query.groupId, "query.groupId");
  rejectIfKId0(query.projectId, "query.projectId");
  sanitizeStringMetaQuery(query.id, "query.id");
  sanitizeStringMetaQuery(query.memberId, "query.memberId");
  sanitizeStringMetaQuery(query.createdBy, "query.createdBy");
  sanitizeStringMetaQuery(query.updatedBy, "query.updatedBy");
  // Do not sanitize query.meta (part-query)
}

export function sanitizeGetMembersInput(input: GetMembersEndpointArgs): void {
  sanitizeMemberQuery(input.query);
}

export function sanitizeDeleteMembersInput(
  input: DeleteMembersEndpointArgs
): void {
  sanitizeMemberQuery(input.query);
}

export function sanitizeUpdateMembersInput(
  input: UpdateMembersEndpointArgs
): void {
  sanitizeMemberQuery(input.query);
  if (input.update.memberId !== undefined) {
    rejectIfKId0(input.update.memberId, "update.memberId");
  }
}

// --- Member requests (schemas from fimidx-core when available) ---

export function sanitizeGetMemberRequestsInput(input: {
  projectId?: string;
  groupId?: string;
  [key: string]: unknown;
}): void {
  if (input.projectId !== undefined) rejectIfKId0(input.projectId, "projectId");
  if (input.groupId !== undefined) rejectIfKId0(input.groupId, "groupId");
}

export function sanitizeRespondToMemberRequestInput(input: {
  requestId?: string;
  projectId?: string;
  groupId?: string;
  [key: string]: unknown;
}): void {
  if (input.requestId !== undefined) rejectIfKId0(input.requestId, "requestId");
  if (input.projectId !== undefined) rejectIfKId0(input.projectId, "projectId");
  if (input.groupId !== undefined) rejectIfKId0(input.groupId, "groupId");
}

// --- Client token ---

export function sanitizeAddClientTokenInput(
  input: AddClientTokenEndpointArgs
): void {
  rejectIfKId0(input.groupId, "groupId");
  rejectIfKId0(input.projectId, "projectId");
}

function sanitizeClientTokenQuery(
  query: GetClientTokensEndpointArgs["query"]
): void {
  rejectIfKId0(query.projectId, "query.projectId");
  sanitizeStringMetaQuery(query.id, "query.id");
  sanitizeStringMetaQuery(query.createdBy, "query.createdBy");
  sanitizeStringMetaQuery(query.updatedBy, "query.updatedBy");
  // Do not sanitize query.meta (part-query)
}

export function sanitizeGetClientTokensInput(
  input: GetClientTokensEndpointArgs
): void {
  sanitizeClientTokenQuery(input.query);
}

export function sanitizeDeleteClientTokensInput(
  input: DeleteClientTokensEndpointArgs
): void {
  sanitizeClientTokenQuery(input.query);
}

export function sanitizeUpdateClientTokensInput(
  input: UpdateClientTokensEndpointArgs
): void {
  sanitizeClientTokenQuery(input.query);
}

export function sanitizeEncodeClientTokenJWTInput(input: {
  id: string;
  [key: string]: unknown;
}): void {
  rejectIfKId0(input.id, "id");
}

// refreshClientTokenJWTSchema has no id-like fields to sanitize

// --- Logs ---

export function sanitizeGetLogFieldsInput(
  input: GetLogFieldsEndpointArgs
): void {
  rejectIfKId0(input.projectId, "projectId");
}

export function sanitizeIngestLogsInput(input: IngestLogsEndpointArgs): void {
  rejectIfKId0(input.projectId, "projectId");
}

function sanitizeLogQuery(query: GetLogsEndpointArgs["query"]): void {
  rejectIfKId0(query.projectId, "query.projectId");
  if (query.metaQuery) {
    sanitizeStringMetaQuery(query.metaQuery.id, "query.metaQuery.id");
    sanitizeStringMetaQuery(
      query.metaQuery.createdBy,
      "query.metaQuery.createdBy"
    );
  }
  // Do not sanitize query.logsQuery (part-query under objRecord)
}

export function sanitizeGetLogsInput(input: GetLogsEndpointArgs): void {
  sanitizeLogQuery(input.query);
}

// --- Objs ---

export function sanitizeSetManyObjsInput(
  input: ISetManyObjsEndpointArgs
): void {
  rejectIfKId0(input.projectId, "projectId");
}

function sanitizeObjQuery(query: IObjQuery): void {
  rejectIfKId0(query.projectId, "query.projectId");
  if (query.metaQuery) {
    sanitizeStringMetaQuery(query.metaQuery.id, "query.metaQuery.id");
    sanitizeStringMetaQuery(
      query.metaQuery.createdBy,
      "query.metaQuery.createdBy"
    );
    sanitizeStringMetaQuery(
      query.metaQuery.updatedBy,
      "query.metaQuery.updatedBy"
    );
  }
  if (query.topLevelFields) {
    sanitizeStringMetaQuery(
      query.topLevelFields.groupId,
      "query.topLevelFields.groupId"
    );
    sanitizeStringMetaQuery(
      query.topLevelFields.tag,
      "query.topLevelFields.tag"
    );
  }
  // Explicitly do not touch query.partQuery
}

export function sanitizeGetManyObjsInput(
  input: IGetManyObjsEndpointArgs
): void {
  sanitizeObjQuery(input.query);
}

export function sanitizeUpdateManyObjsInput(
  input: IUpdateManyObjsEndpointArgs
): void {
  sanitizeObjQuery(input.query);
}

export function sanitizeDeleteManyObjsInput(
  input: IDeleteManyObjsEndpointArgs
): void {
  sanitizeObjQuery(input.query);
}

export function sanitizeGetObjFieldsInput(input: {
  projectId: string;
  [key: string]: unknown;
}): void {
  rejectIfKId0(input.projectId, "projectId");
}
