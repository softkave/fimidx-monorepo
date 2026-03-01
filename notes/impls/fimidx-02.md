# Plans for fimidx 02

- Underlying storage layer using Mongodb. Cut Postgresql for now, because deeply nested array fields are proving a bit unwieldy.
- Current offerings will be:
  - objs (underlying all offerings & external)
  - group (internal & external)
  - project (internal)
  - client token (internal & external)
  - callback (internal-use & external)
  - logs (external)
  - monitor (external)
  - permission (internal & external)
- Obj index will only contain fields, granular and array-compressed. We should tag array-granular fields with a pseudo field representing array indices with '[*]'. Obj fields will mostly be used for logs query, and will be stored in Turso.
- Will provide REST API & JS SDK. Will provide docs for both.
