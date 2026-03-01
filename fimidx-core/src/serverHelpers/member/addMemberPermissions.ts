import { isString } from "lodash-es";
import type { IMemberObjRecordMeta } from "../../definitions/member.js";
import type {
  IPermission,
  IPermissionAction,
  IPermissionAtom,
  IPermissionEntity,
  IPermissionTarget,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { addPermissions } from "../permission/addPermissions.js";

export function getFimidxManagedMemberPermissionEntity(params: {
  entity: IPermissionEntity;
  memberId: string;
}) {
  const { entity, memberId } = params;
  return isString(entity)
    ? `__fimidx_managed_permission_entity_${entity}:${memberId}`
    : {
        ...entity,
        __fimidx_managed_permission_entity_memberId: memberId,
      };
}

export function getFimidxManagedMemberPermissionAction(params: {
  action: IPermissionAction;
  memberId: string;
}) {
  const { action, memberId } = params;
  return isString(action)
    ? `__fimidx_managed_permission_action_${action}:${memberId}`
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
    ? `__fimidx_managed_permission_target_${target}:${memberId}`
    : {
        ...target,
        __fimidx_managed_permission_target_memberId: memberId,
      };
}

export function getFimidxManagedMemberPermission(params: {
  permission: IPermissionAtom;
  memberId: string;
  groupId: string;
}): IPermissionAtom & Pick<IPermission, "meta"> {
  const { permission, memberId, groupId } = params;
  const meta: IMemberObjRecordMeta = {
    __fimidx_managed_memberId: memberId,
    __fimidx_managed_groupId: groupId,
  };
  return {
    ...permission,
    entity: getFimidxManagedMemberPermissionEntity({
      entity: permission.entity,
      memberId,
    }),
    action: getFimidxManagedMemberPermissionAction({
      action: permission.action,
      memberId,
    }),
    target: getFimidxManagedMemberPermissionTarget({
      target: permission.target,
      memberId,
    }),
    meta,
  };
}

// Inverse functions to transform managed permissions back to original format
export function getOriginalMemberPermissionEntity(params: {
  entity: IPermissionEntity;
  memberId: string;
}): IPermissionEntity {
  const { entity, memberId } = params;
  if (isString(entity)) {
    const prefix = `__fimidx_managed_permission_entity_`;
    const suffix = `:${memberId}`;
    if (entity.startsWith(prefix) && entity.endsWith(suffix)) {
      return entity.slice(prefix.length, -suffix.length);
    }
  } else {
    // Handle object format
    const { __fimidx_managed_permission_entity_memberId, ...originalEntity } =
      entity;
    return originalEntity;
  }
  return entity;
}

export function getOriginalMemberPermissionAction(params: {
  action: IPermissionAction;
  memberId: string;
}): IPermissionAction {
  const { action, memberId } = params;
  if (isString(action)) {
    const prefix = `__fimidx_managed_permission_action_`;
    const suffix = `:${memberId}`;
    if (action.startsWith(prefix) && action.endsWith(suffix)) {
      return action.slice(prefix.length, -suffix.length);
    }
  } else {
    // Handle object format
    const { __fimidx_managed_permission_action_memberId, ...originalAction } =
      action;
    return originalAction;
  }
  return action;
}

export function getOriginalMemberPermissionTarget(params: {
  target: IPermissionTarget;
  memberId: string;
}): IPermissionTarget {
  const { target, memberId } = params;
  if (isString(target)) {
    const prefix = `__fimidx_managed_permission_target_`;
    const suffix = `:${memberId}`;
    if (target.startsWith(prefix) && target.endsWith(suffix)) {
      return target.slice(prefix.length, -suffix.length);
    }
  } else {
    // Handle object format
    const { __fimidx_managed_permission_target_memberId, ...originalTarget } =
      target;
    return originalTarget;
  }
  return target;
}

export function getOriginalMemberPermission(params: {
  permission: IPermission;
  memberId: string;
}): IPermissionAtom {
  const { permission, memberId } = params;
  return {
    entity: getOriginalMemberPermissionEntity({
      entity: permission.entity,
      memberId,
    }),
    action: getOriginalMemberPermissionAction({
      action: permission.action,
      memberId,
    }),
    target: getOriginalMemberPermissionTarget({
      target: permission.target,
      memberId,
    }),
  };
}

export async function addMemberPermissions(params: {
  by: string;
  byType: string;
  groupId: string;
  projectId: string;
  permissions: IPermissionAtom[];
  memberId: string;
  storage?: IObjStorage;
}) {
  const { by, byType, groupId, projectId, permissions, memberId, storage } =
    params;
  const { permissions: newPermissions } = await addPermissions({
    by,
    byType,
    groupId,
    args: {
      projectId,
      permissions: permissions.map((permission) =>
        getFimidxManagedMemberPermission({
          permission,
          memberId,
          groupId,
        })
      ),
    },
    storage,
  });

  return {
    permissions: newPermissions,
  };
}
