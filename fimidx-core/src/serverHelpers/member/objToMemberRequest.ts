import type { IFimidxMemberInternal, IMemberRequest } from "../../definitions/member.js";
import type { IObj } from "../../definitions/obj.js";
import { getGroups } from "../group/getGroups.js";

export async function objToMemberRequest(params: {
  objs: IObj[];
}) {
  const { objs } = params;

  if (objs.length === 0) {
    return [];
  }

  const projectId = objs[0]?.projectId ?? "";
  const groupIds = [...new Set(objs.map((o) => o.groupId))];

  const { groups } = await getGroups({
    args: {
      query: {
        projectId,
        id: { in: groupIds },
      },
    },
  });

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  return objs
    .map((obj): IMemberRequest | null => {
      const record = obj.objRecord as IFimidxMemberInternal | undefined;
      const status = record?.status;
      const updatedAt = record?.statusUpdatedAt;
      const groupName = groupMap.get(obj.groupId) ?? "";
      if (!groupName || status == null || updatedAt == null) {
        return null;
      }
      return {
        id: obj.id,
        groupId: obj.groupId,
        groupName,
        status,
        updatedAt: updatedAt instanceof Date ? updatedAt : new Date(updatedAt),
      };
    })
    .filter((r): r is IMemberRequest => r != null);
}
