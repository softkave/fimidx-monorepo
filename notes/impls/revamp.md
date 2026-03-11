query member/client token by permissions
handle [*] in query fields (remove them for \* and transform them for numbers)
cache project id field resolutions, use protobuf and save on disk
move cpu heavy things like updates in obj storage to another thread
collect project ids from query
expose soft-delete through api
conflict-detection for members and other resources
when we expose obj externally, we need guards against reading unpermissioned data
