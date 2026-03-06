import { isString } from "lodash-es";
import type {
  IClientTokenObjRecordMeta,
  IClientTokenPermissionInput,
} from "../../definitions/clientToken.js";
import type {
  IPermission,
  IPermissionAction,
  IPermissionAtom,
  IPermissionEntity,
  IPermissionTarget,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { addPermissions } from "../permission/addPermissions.js";

export function getFimidxManagedClientTokenPermissionEntity(params: {
  entity: IPermissionEntity;
  clientTokenId: string;
}) {
  const { entity, clientTokenId } = params;
  return isString(entity)
    ? `__fimidx_managed_permission_entity_${entity}:${clientTokenId}`
    : {
        ...entity,
        __fimidx_managed_permission_entity_clientTokenId: clientTokenId,
      };
}

export function getFimidxManagedClientTokenPermissionAction(params: {
  action: IPermissionAction;
  clientTokenId: string;
}) {
  const { action, clientTokenId } = params;
  return isString(action)
    ? `__fimidx_managed_permission_action_${action}:${clientTokenId}`
    : {
        ...action,
        __fimidx_managed_permission_action_clientTokenId: clientTokenId,
      };
}

export function getFimidxManagedClientTokenPermissionTarget(params: {
  target: IPermissionTarget;
  clientTokenId: string;
}) {
  const { target, clientTokenId } = params;
  return isString(target)
    ? `__fimidx_managed_permission_target_${target}:${clientTokenId}`
    : {
        ...target,
        __fimidx_managed_permission_target_clientTokenId: clientTokenId,
      };
}

export function getFimidxManagedClientTokenPermission(params: {
  permission: IPermissionAtom;
  clientTokenId: string;
  groupId: string;
}): IPermissionAtom & Pick<IPermission, "meta"> {
  const { permission, clientTokenId, groupId } = params;
  const meta: IClientTokenObjRecordMeta = {
    __fimidx_managed_clientTokenId: clientTokenId,
    __fimidx_managed_groupId: groupId,
  };
  return {
    ...permission,
    entity: getFimidxManagedClientTokenPermissionEntity({
      entity: permission.entity,
      clientTokenId,
    }),
    action: getFimidxManagedClientTokenPermissionAction({
      action: permission.action,
      clientTokenId,
    }),
    target: getFimidxManagedClientTokenPermissionTarget({
      target: permission.target,
      clientTokenId,
    }),
    meta,
  };
}

// Inverse functions to transform managed permissions back to original format
export function getOriginalClientTokenPermissionEntity(params: {
  entity: IPermissionEntity;
  clientTokenId: string;
}): IPermissionEntity {
  const { entity, clientTokenId } = params;
  if (isString(entity)) {
    const prefix = `__fimidx_managed_permission_entity_`;
    const suffix = `:${clientTokenId}`;
    if (entity.startsWith(prefix) && entity.endsWith(suffix)) {
      return entity.slice(prefix.length, -suffix.length);
    }
  } else {
    // Handle object format
    const {
      __fimidx_managed_permission_entity_clientTokenId,
      ...originalEntity
    } = entity;
    return originalEntity;
  }
  return entity;
}

export function getOriginalClientTokenPermissionAction(params: {
  action: IPermissionAction;
  clientTokenId: string;
}): IPermissionAction {
  const { action, clientTokenId } = params;
  if (isString(action)) {
    const prefix = `__fimidx_managed_permission_action_`;
    const suffix = `:${clientTokenId}`;
    if (action.startsWith(prefix) && action.endsWith(suffix)) {
      return action.slice(prefix.length, -suffix.length);
    }
  } else {
    // Handle object format
    const {
      __fimidx_managed_permission_action_clientTokenId,
      ...originalAction
    } = action;
    return originalAction;
  }
  return action;
}

export function getOriginalClientTokenPermissionTarget(params: {
  target: IPermissionTarget;
  clientTokenId: string;
}): IPermissionTarget {
  const { target, clientTokenId } = params;
  if (isString(target)) {
    const prefix = `__fimidx_managed_permission_target_`;
    const suffix = `:${clientTokenId}`;
    if (target.startsWith(prefix) && target.endsWith(suffix)) {
      return target.slice(prefix.length, -suffix.length);
    }
  } else {
    // Handle object format
    const {
      __fimidx_managed_permission_target_clientTokenId,
      ...originalTarget
    } = target;
    return originalTarget;
  }
  return target;
}

export function getOriginalClientTokenPermission(params: {
  permission: IPermission;
  clientTokenId: string;
}): IPermissionAtom {
  const { permission, clientTokenId } = params;
  return {
    entity: getOriginalClientTokenPermissionEntity({
      entity: permission.entity,
      clientTokenId,
    }),
    action: getOriginalClientTokenPermissionAction({
      action: permission.action,
      clientTokenId,
    }),
    target: getOriginalClientTokenPermissionTarget({
      target: permission.target,
      clientTokenId,
    }),
  };
}

export async function addClientTokenPermissions(params: {
  by: string;
  byType: string;
  groupId: string;
  projectId: string;
  permissions: IClientTokenPermissionInput[] | IPermissionAtom[];
  clientTokenId: string;
  storage?: IObjStorage;
}) {
  const {
    by,
    byType,
    groupId,
    projectId,
    permissions: inputPermissions,
    clientTokenId,
    storage,
  } = params;
  const permissionAtoms: IPermissionAtom[] = inputPermissions.map((p) =>
    "entity" in p && p.entity !== undefined
      ? (p as IPermissionAtom)
      : { entity: clientTokenId, action: p.action, target: p.target }
  );
  const { permissions: newPermissions } = await addPermissions({
    by,
    byType,
    groupId,
    args: {
      projectId,
      permissions: permissionAtoms.map((permission) =>
        getFimidxManagedClientTokenPermission({
          permission,
          clientTokenId,
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
