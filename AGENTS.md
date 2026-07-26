# fimidx-monorepo's agent instructions

## Project Overview

fimidx provides dx utils for building and managing web applications. It provides logs management, objs for storage, callbacks for cron-style automations, client tokens, members, permissions for authentication and authorization, etc.

## Code Style & Conventions

- Prefer async functions over sync functions.
- Do not use Mongo's `_id` but `id` field on every collection, so, every collection you add should have an `id` field. `id` values used should also be prefixed with resource type. Use `prefixObjId` in `/fimidx-core/src/definitions/obj.ts` to prefix an `id` with type.

## Architecture

- fimidx-core implements core shared utilities across packages.
- fimidx-js implements JS SDK and CLI.
- fimidx-log-files-consumer monitors and ingests logs from log outputs like log files.
- fimidx-mfdoc implements mfdoc definitions for generating SDKs. It is used on fimidx-js for generating endpoint types and functions.
- fimidx-node-server implements an internal Node.js server for processing internal ops and calling callbacks.
- fimidx-winston-transport implements a Winston transport for draining logs to fimidx.
- ixtb-nextjs implements a UI, and internal and external REST API layer for fimidx.
