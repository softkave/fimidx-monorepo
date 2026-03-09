import type { ValueOf } from "type-fest";
import { z } from "zod";
import {
  numberMetaQuerySchema,
  objPartQueryListSchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";
import {
  actionSchema,
  targetSchema,
  type IPermissionAtom,
} from "./permission.js";

/** Permission input for members: action + target only; entity is the member id. */
export const memberPermissionSchema = z.object({
  action: actionSchema,
  target: targetSchema,
  /** When true, this atom grants the permission; when false, it denies.
   * Optional, default true when omitted. */
  granted: z.boolean().optional(),
});

/** Input type (granted optional); output after parse has granted: boolean. */
export type IMemberPermissionInput = z.input<typeof memberPermissionSchema>;

/** Item for check member permissions: action + target only; entity is the member id from request. */
export const checkMemberPermissionItemSchema = memberPermissionSchema;
export type ICheckMemberPermissionItem = z.infer<
  typeof checkMemberPermissionItemSchema
>;

export const kMemberStatus = {
  pending: "pending",
  accepted: "accepted",
  rejected: "rejected",
  unknown: "unknown",
} as const;

export type MemberStatus = ValueOf<typeof kMemberStatus>;

/** Public member (customer-facing). User data lives in meta only. */
export interface IMember {
  id: string;
  createdAt: number | Date;
  createdBy: string;
  createdByType: string;
  updatedAt: number | Date;
  updatedBy: string;
  updatedByType: string;
  projectId: string;
  groupId: string;
  /** Permissions are null if reading other members and user does not have
   * member:readPermissions permission. */
  permissions: IPermissionAtom[] | null;
  meta?: Record<string, string> | null;
}

/**
 * Internal slice of member obj record used by Fimidx (e.g. org creation).
 * Use for documentation, casting record when reading/writing, and type assertion.
 * Identifiers (id, groupId, projectId) come from the obj, not this type.
 */
export interface IFimidxMemberInternal {
  status: MemberStatus;
  statusUpdatedAt: number | Date;
  userId: string;
  name?: string | null;
}

/** Member request (internal). id is the member id (obj id). */
export interface IMemberRequest {
  id: string;
  groupId: string;
  groupName: string;
  status: MemberStatus;
  updatedAt: number | Date;
}

export const addMemberSchema = z.object({
  groupId: z.string().min(1),
  projectId: z.string().min(1),
  permissions: z.array(memberPermissionSchema).max(100).optional(),
  /** Passed through as obj record as-is (no transformation). For internal use,
   * include reserved keys (e.g. status, statusUpdatedAt, userId) in meta. */
  meta: z.record(z.string().min(1), z.string()).optional(),
});

export const memberQuerySchema = z.object({
  id: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
  meta: objPartQueryListSchema.optional(),
  groupId: z.string().min(1),
  projectId: z.string().min(1),
});

export const updateMembersSchema = z.object({
  query: memberQuerySchema,
  update: z.object({
    meta: z.record(z.string().min(1), z.string()).optional(),
    addPermissions: z.array(memberPermissionSchema).max(100).optional(),
    removePermissions: z.array(memberPermissionSchema).max(100).optional(),
    removeAllPermissions: z.boolean().optional(),
  }),
  updateMany: z.boolean().optional(),
});

export const updateMemberPermissionsSchema = z.object({
  query: z.object({
    id: z.string().min(1),
    groupId: z.string().min(1),
    projectId: z.string().min(1),
  }),
  update: z.object({
    addPermissions: z.array(memberPermissionSchema).max(100).optional(),
    removePermissions: z.array(memberPermissionSchema).max(100).optional(),
    removeAllPermissions: z.boolean().optional(),
  }),
});

export const deleteMembersSchema = z.object({
  query: memberQuerySchema,
  deleteMany: z.boolean().optional(),
});

export const getMembersSchema = z.object({
  query: memberQuerySchema,
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sort: objSortListSchema.optional(),
  includePermissions: z.boolean().optional(),
});

export const respondToMemberRequestSchema = z.object({
  query: z.object({
    projectId: z.string().min(1),
    groupId: z.string().min(1),
    id: z.string().min(1),
  }),
  status: z.enum([kMemberStatus.accepted, kMemberStatus.rejected]),
});

export const getMemberRequestsSchema = z.object({
  query: z.object({
    id: z.string().min(1).optional(),
    groupId: z.string().min(1).optional(),
    projectId: z.string().min(1),
    status: z
      .enum([
        kMemberStatus.pending,
        kMemberStatus.accepted,
        kMemberStatus.rejected,
      ])
      .optional(),
  }),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  includePermissions: z.boolean().optional(),
});

export const checkMemberPermissionsSchema = z.object({
  query: z.object({
    projectId: z.string().min(1),
    groupId: z.string().min(1),
    id: z.string().min(1),
  }),
  items: z.array(checkMemberPermissionItemSchema).max(100),
});

export type AddMemberEndpointArgs = z.infer<typeof addMemberSchema>;
export type GetMembersEndpointArgs = z.infer<typeof getMembersSchema>;
export type UpdateMembersEndpointArgs = z.infer<typeof updateMembersSchema>;
export type DeleteMembersEndpointArgs = z.infer<typeof deleteMembersSchema>;
export type UpdateMemberPermissionsEndpointArgs = z.infer<
  typeof updateMemberPermissionsSchema
>;
export type CheckMemberPermissionsEndpointArgs = z.infer<
  typeof checkMemberPermissionsSchema
>;
export type RespondToMemberRequestEndpointArgs = z.infer<
  typeof respondToMemberRequestSchema
>;
export type GetMemberRequestsEndpointArgs = z.infer<
  typeof getMemberRequestsSchema
>;

export interface IGetMembersEndpointResponse {
  members: IMember[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IGetMemberByMemberIdEndpointResponse {
  member: IMember;
}

export interface IGetMemberRequestsEndpointResponse {
  requests: IMemberRequest[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IAddMemberEndpointResponse {
  member: IMember;
}

export interface IRespondToMemberRequestEndpointResponse {
  success: boolean;
}

export interface CheckMemberPermissionsEndpointResponse {
  results: {
    isPermitted: boolean;
  }[];
}

export interface IUpdateMembersEndpointResponse {
  success: boolean;
}

export const kMemberStatusLabels: Record<MemberStatus, string> = {
  [kMemberStatus.pending]: "Pending",
  [kMemberStatus.accepted]: "Member",
  [kMemberStatus.rejected]: "Rejected",
  [kMemberStatus.unknown]: "Unknown",
};
