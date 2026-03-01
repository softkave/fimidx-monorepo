import { addProjectEndpoint } from "@/src/lib/endpoints/internal/projects/addProjectEndpoint";
import { deleteProjectEndpoint } from "@/src/lib/endpoints/internal/projects/deleteProjectEndpoint";
import { updateProjectEndpoint } from "@/src/lib/endpoints/internal/projects/updateProjectEndpoint";
import { wrapUserAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapUserAuthenticated(async (req, ctx, session) => {
  return addProjectEndpoint({ req, ctx, session });
});

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

const deleteEndpointFn = wrapUserAuthenticated(async (req, ctx, session) => {
  return deleteProjectEndpoint({ req, ctx, session });
});

export const DELETE = deleteEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

const patchEndpointFn = wrapUserAuthenticated(async (req, ctx, session) => {
  return updateProjectEndpoint({ req, ctx, session });
});

export const PATCH = patchEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
