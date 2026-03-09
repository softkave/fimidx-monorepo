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

/** Entity is always the client token id; stored as-is. */
export function getFimidxManagedClientTokenPermissionEntity(params: {
  clientTokenId: string;
}) {
  return params.clientTokenId;
}

export function getFimidxManagedClientTokenPermissionAction(params: {
  action: IPermissionAction;
  clientTokenId: string;
}) {
  const { action, clientTokenId } = params;
  return isString(action)
    ? action
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
    ? target
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
    entity: getFimidxManagedClientTokenPermissionEntity({ clientTokenId }),
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
/** Entity is stored as client token id; return as-is. */
export function getOriginalClientTokenPermissionEntity(params: {
  entity: IPermissionEntity;
}): IPermissionEntity {
  return params.entity;
}

export function getOriginalClientTokenPermissionAction(params: {
  action: IPermissionAction;
  clientTokenId: string;
}): IPermissionAction {
  const { action } = params;
  if (isString(action)) {
    return action;
  }
  const {
    __fimidx_managed_permission_action_clientTokenId,
    ...originalAction
  } = action;
  return originalAction as IPermissionAction;
}

export function getOriginalClientTokenPermissionTarget(params: {
  target: IPermissionTarget;
  clientTokenId: string;
}): IPermissionTarget {
  const { target } = params;
  if (isString(target)) {
    return target;
  }
  const {
    __fimidx_managed_permission_target_clientTokenId,
    ...originalTarget
  } = target;
  return originalTarget as IPermissionTarget;
}

export function getOriginalClientTokenPermission(params: {
  permission: IPermission;
  clientTokenId: string;
}): IPermissionAtom {
  const { permission, clientTokenId } = params;
  return {
    entity: getOriginalClientTokenPermissionEntity({
      entity: permission.entity,
    }),
    action: getOriginalClientTokenPermissionAction({
      action: permission.action,
      clientTokenId,
    }),
    target: getOriginalClientTokenPermissionTarget({
      target: permission.target,
      clientTokenId,
    }),
    granted: permission.granted !== false,
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
      : {
          entity: clientTokenId,
          action: p.action,
          target: p.target,
          granted: (p as IClientTokenPermissionInput).granted ?? true,
        }
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
