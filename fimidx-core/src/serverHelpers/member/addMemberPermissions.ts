import { isString } from "lodash-es";
import type { IMemberPermissionInput } from "../../definitions/member.js";
import type {
  IPermission,
  IPermissionAction,
  IPermissionAtom,
  IPermissionEntity,
  IPermissionTarget,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { addPermissions } from "../permission/addPermissions.js";

/** Entity is always the member id; stored as-is. */
export function getFimidxManagedMemberPermissionEntity(params: {
  memberId: string;
}) {
  return params.memberId;
}

export function getFimidxManagedMemberPermissionAction(params: {
  action: IPermissionAction;
  memberId: string;
}) {
  const { action, memberId } = params;
  return isString(action)
    ? action
    : {
        ...action,
        __fimidx_managed_permission_action_memberId: memberId,
      };
}

export function getFimidxManagedMemberPermissionTarget(params: {
  target: IPermissionTarget;
  memberId: string;
}) {
  const { target, memberId } = params;
  return isString(target)
    ? target
    : {
        ...target,
        __fimidx_managed_permission_target_memberId: memberId,
      };
}

export function getFimidxManagedMemberPermission(params: {
  permission: IPermissionAtom;
  memberId: string;
  groupId: string;
}): IPermissionAtom {
  const { permission, memberId } = params;
  return {
    ...permission,
    entity: getFimidxManagedMemberPermissionEntity({ memberId }),
    action: getFimidxManagedMemberPermissionAction({
      action: permission.action,
      memberId,
    }),
    target: getFimidxManagedMemberPermissionTarget({
      target: permission.target,
      memberId,
    }),
  };
}

// Inverse functions to transform managed permissions back to original format
/** Entity is stored as member id; return as-is. */
export function getOriginalMemberPermissionEntity(params: {
  entity: IPermissionEntity;
}): IPermissionEntity {
  return params.entity;
}

export function getOriginalMemberPermissionAction(params: {
  action: IPermissionAction;
  memberId: string;
}): IPermissionAction {
  const { action } = params;
  if (isString(action)) {
    return action;
  }
  const { __fimidx_managed_permission_action_memberId, ...originalAction } =
    action;
  return originalAction as IPermissionAction;
}

export function getOriginalMemberPermissionTarget(params: {
  target: IPermissionTarget;
  memberId: string;
}): IPermissionTarget {
  const { target } = params;
  if (isString(target)) {
    return target;
  }
  const { __fimidx_managed_permission_target_memberId, ...originalTarget } =
    target;
  return originalTarget as IPermissionTarget;
}

export function getOriginalMemberPermission(params: {
  permission: IPermission;
  memberId: string;
}): IPermissionAtom {
  const { permission, memberId } = params;
  return {
    entity: getOriginalMemberPermissionEntity({
      entity: permission.entity,
    }),
    action: getOriginalMemberPermissionAction({
      action: permission.action,
      memberId,
    }),
    target: getOriginalMemberPermissionTarget({
      target: permission.target,
      memberId,
    }),
    granted: permission.granted !== false,
  };
}

export async function addMemberPermissions(params: {
  by: string;
  byType: string;
  groupId: string;
  projectId: string;
  permissions: IMemberPermissionInput[];
  memberId: string;
  storage?: IObjStorage;
}) {
  const {
    by,
    byType,
    groupId,
    projectId,
    permissions: inputPermissions,
    memberId,
    storage,
  } = params;
  const permissionAtoms: IPermissionAtom[] = inputPermissions.map((p) =>
    "entity" in p && p.entity !== undefined
      ? (p as IPermissionAtom)
      : {
          entity: memberId,
          action: p.action,
          target: p.target,
          granted: (p as IMemberPermissionInput).granted ?? true,
        }
  );
  const managed = permissionAtoms.map((permission) =>
    getFimidxManagedMemberPermission({
      permission,
      memberId,
      groupId,
    })
  );
  const { permissions: newPermissions } = await addPermissions({
    by,
    byType,
    groupId,
    args: {
      projectId,
      permissions: managed.map((p) => ({
        ...p,
        granted: p.granted !== false,
      })),
    },
    storage,
  });

  return {
    permissions: newPermissions,
  };
}
