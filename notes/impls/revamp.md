@fimidx-monorepo/fimidx-core/src/definitions/member.ts:43 @fimidx-monorepo/fimidx-core/src/definitions/member.ts:49-50 @fimidx-monorepo/fimidx-core/src/definitions/member.ts:51-56 @fimidx-monorepo/fimidx-core/src/definitions/member.ts:66-67 @fimidx-monorepo/fimidx-core/src/definitions/member.ts:68-70 move from main member/member obj to only internal fimidx member usage. fimidx also uses member to handle org members, and members (resource) can be used by customers to manage members withing a group. status and email, etc. are fimidx specific and shouldn't be pushed to external users. so put them in meta when adding members (for now, that's only when an org is created in ixtb-nextjs). update dependent code (like member requests) and tests. also remove @fimidx-monorepo/fimidx-core/src/definitions/member.ts:92 and if we're using it for managing our own org members, put it in meta.

@fimidx-monorepo/fimidx-core/src/definitions/member.ts:77 have memberId, make it optional, and have id too, and make it optional.

@fimidx-monorepo/fimidx-core/src/definitions/member.ts:92 remove and pass in meta if we're using it.

@fimidx-monorepo/fimidx-core/src/definitions/member.ts:101 remove. @fimidx-monorepo/fimidx-core/src/definitions/member.ts:104 remove. @fimidx-monorepo/fimidx-core/src/definitions/member.ts:118 remove. @fimidx-monorepo/fimidx-core/src/definitions/member.ts:154 rename to memberId.
@fimidx-monorepo/fimidx-core/src/definitions/member.ts:228 rename to isPermitted.
@fimidx-monorepo/fimidx-core/src/definitions/member.ts:19-22 add a boolean signifying whether permission is granted or denied. use it in check member permissions and the check it permitted only if the permission exists and the field is true.
@fimidx-monorepo/fimidx-core/src/definitions/member.ts:152-154 move into a query field.
@fimidx-monorepo/fimidx-core/src/definitions/member.ts:177-179 move into a query field.
@fimidx-monorepo/fimidx-core/src/definitions/member.ts:163-169 status is fine here because member requests is for internal use.
@fimidx-monorepo/fimidx-core/src/definitions/member.ts:155 status is fine here because respond to member request is internal.

@fimidx-monorepo/fimidx-core/src/definitions/callback.ts:145 move to inside a query variable.

@fimidx-monorepo/fimidx-core/src/definitions/log.ts:39-40 should be inside @fimidx-monorepo/fimidx-core/src/definitions/log.ts:43-47 and not separate.
@fimidx-monorepo/fimidx-core/src/definitions/log.ts:57 move into a query field.

@fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:16-21 add a boolean field signifying whether permission is granted or not, similar to member with same use.
@fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:29 make name optional.
@fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:46 make name optional.
@fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:98-100 remove update and just have permissions.
@fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:134-136 move inside a query field.

@fimidx-monorepo/fimidx-core/src/definitions/member.ts:117-123 add allow updating permissions.

@fimidx-monorepo/fimidx-core/src/definitions/monitor.ts:35 rename to query.
@fimidx-monorepo/fimidx-core/src/definitions/monitor.ts:45 rename to query.
@fimidx-monorepo/fimidx-core/src/definitions/monitor.ts:55 rename to query.
@fimidx-monorepo/fimidx-core/src/definitions/monitor.ts:78 rename to query.

@fimidx-monorepo/fimidx-core/src/definitions/log.ts:45 rename to query.

@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:23-32 use 4-letter tag short forms.

@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:254-258 move to inside objQuerySchema.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:261-273 move to inside @fimidx-monorepo/fimidx-core/src/definitions/obj.ts:276-281 .
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:277 make projectId not optional.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:278 rename to objRecordQuery. @fimidx-monorepo/fimidx-core/src/definitions/obj.ts:318 move into a query field.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:324 move into a query field.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:116 make max 1000.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:122 make max 100.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:127 make max 100.
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:130 rename to objRecord... (replace part with record)
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:144 rename to objRecord... (replace part with record)
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:150 rename to objRecord... (replace part with record)
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:223 rename to objRecord... (replace part with record)
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:229 rename to stringQuerySchema
@fimidx-monorepo/fimidx-core/src/definitions/obj.ts:236 rename to numberQuerySchema

@fimidx-monorepo/fimidx-core/src/definitions/permission.ts:92-96 add a field signifying whether permisison is granted or not. use in check permissions.
@fimidx-monorepo/fimidx-core/src/definitions/permission.ts:114-120 expose here.
@fimidx-monorepo/fimidx-core/src/definitions/permission.ts:128-132 add here.
@fimidx-monorepo/fimidx-core/src/definitions/permission.ts:198 move into a query field.

@fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:86 instead of permissions, have addPermissions, removePermissions, and removeAllPermissions. do the same here @fimidx-monorepo/fimidx-core/src/definitions/clientToken.ts:92-101
do the same for @fimidx-monorepo/fimidx-core/src/definitions/member.ts:115-125 and @fimidx-monorepo/fimidx-core/src/definitions/member.ts:127-136 and implement them.

for all requests, update dependent code. update tests. see if there's need for new tests. remove tests no longer needed.

parallelize for loops in reasonable chunks
support or and and query in obj and use for delete permissions
query member/client token by permissions
