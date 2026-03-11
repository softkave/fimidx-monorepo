query member/client token by permissions
handle [*] in query fields (remove them for \* and transform them for numbers)
cache project id field resolutions
collect project ids from query
hard-delete for now
expose soft-delete through api
conflict-detection for members and other resources
sort by meta fields, update sort test in member
export sort meta/record fields in api
shallow & deep merge
expose merge-way to member, client token, etc.
when we expose obj externally, we need guards against reading unpermissioned data
test monitor merge query issue
