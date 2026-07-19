// TODO: implement a better fine-grained SWR key matcher, so that we can invalidate
// the SWR cache when the user changes the query params. But for now, we'll just
// invalidate the SWR cache using the api path.

import { GetOrgsEndpointArgs } from "@/src/definitions/org";
import { GetAlertsEndpointArgs } from "fimidx-core/definitions/alert";
import { GetCallbacksEndpointArgs } from "fimidx-core/definitions/callback";
import { GetClientTokensEndpointArgs } from "fimidx-core/definitions/clientToken";
import { GetGroupsEndpointArgs } from "fimidx-core/definitions/group";
import {
  GetLogFieldsEndpointArgs,
  GetLogsEndpointArgs,
} from "fimidx-core/definitions/log";
import {
  GetMemberRequestsEndpointArgs,
  GetMembersEndpointArgs,
} from "fimidx-core/definitions/member";
import { GetMonitorsEndpointArgs } from "fimidx-core/definitions/monitor";
import { GetMonitorRunsEndpointArgs } from "fimidx-core/definitions/monitorRun";
import { GetProjectsEndpointArgs } from "fimidx-core/definitions/project";
import {
  kApiAlertKeys,
  kApiCallbackKeys,
  kApiClientTokenKeys,
  kApiGroupKeys,
  kApiLogKeys,
  kApiMemberKeys,
  kApiMonitorKeys,
  kApiMonitorRunKeys,
  kApiOrgKeys,
  kApiProjectKeys,
} from "./apikeys";

export const kGroupSWRKeys = {
  getGroups: (params: GetGroupsEndpointArgs) =>
    [kApiGroupKeys.getGroups(), params] as const,
  getGroup: (groupId: string) => kApiGroupKeys.getGroup(groupId),
  addGroup: () => kApiGroupKeys.addGroup(),
  deleteGroup: () => kApiGroupKeys.deleteGroup(),
  updateGroup: (groupId: string) => kApiGroupKeys.updateGroup(groupId),
};

export const kOrgSWRKeys = {
  getOrgs: (params: GetOrgsEndpointArgs) =>
    [kApiOrgKeys.getOrgs(), params] as const,
  getOrg: (orgId: string) => kApiOrgKeys.getOrg(orgId),
  addOrg: () => kApiOrgKeys.addOrg(),
  deleteOrg: (orgId: string) => kApiOrgKeys.deleteOrg(orgId),
  updateOrg: (orgId: string) => kApiOrgKeys.updateOrg(orgId),
};

export const kProjectSWRKeys = {
  getProjects: (params: GetProjectsEndpointArgs) =>
    [kApiProjectKeys.getProjects(), params] as const,
  addProject: () => kApiProjectKeys.addProject(),
  deleteProject: () => kApiProjectKeys.deleteProject(),
  updateProject: () => kApiProjectKeys.updateProject(),
};

export const kClientTokenSWRKeys = {
  getClientTokens: (params: GetClientTokensEndpointArgs) =>
    [kApiClientTokenKeys.getClientTokens(), params] as const,
  addClientToken: () => kApiClientTokenKeys.addClientToken(),
  deleteClientTokens: () => kApiClientTokenKeys.deleteClientTokens(),
  updateClientTokens: () => kApiClientTokenKeys.updateClientTokens(),
  encodeClientTokenJWT: (clientTokenId: string) =>
    kApiClientTokenKeys.encodeClientTokenJWT(clientTokenId),
  refreshClientTokenJWT: () => kApiClientTokenKeys.refreshClientTokenJWT(),
};

export const kLogSWRKeys = {
  ingest: () => kApiLogKeys.ingest(),
  retrieve: (params: GetLogsEndpointArgs) =>
    [kApiLogKeys.retrieve(), params] as const,
  getLogFields: (params: GetLogFieldsEndpointArgs) =>
    [kApiLogKeys.getLogFields(), params] as const,
};

export const kMonitorSWRKeys = {
  getMonitors: (params: GetMonitorsEndpointArgs) =>
    [kApiMonitorKeys.getMonitors(), params] as const,
  getMonitorById: (monitorId: string) =>
    kApiMonitorKeys.getMonitorById(monitorId),
  addMonitor: () => kApiMonitorKeys.addMonitor(),
  deleteMonitor: () => kApiMonitorKeys.deleteMonitor(),
  updateMonitor: (monitorId: string) =>
    kApiMonitorKeys.updateMonitor(monitorId),
  runMonitor: (monitorId: string) => kApiMonitorKeys.runMonitor(monitorId),
  previewMonitor: (monitorId: string) =>
    kApiMonitorKeys.previewMonitor(monitorId),
};

export const kAlertSWRKeys = {
  getAlerts: (params: GetAlertsEndpointArgs) =>
    [kApiAlertKeys.getAlerts(), params] as const,
  getAlert: (alertId: string) => kApiAlertKeys.getAlert(alertId),
  acknowledgeAlert: (alertId: string) =>
    kApiAlertKeys.acknowledgeAlert(alertId),
  getAlertLogs: (params: { alertId: string; page?: number; limit?: number }) =>
    [kApiAlertKeys.getAlertLogs(params.alertId), params] as const,
};

export const kMonitorRunSWRKeys = {
  getMonitorRuns: (params: GetMonitorRunsEndpointArgs) =>
    [kApiMonitorRunKeys.getMonitorRuns(), params] as const,
};

export const kMemberSWRKeys = {
  getMembers: (params: GetMembersEndpointArgs) =>
    [kApiMemberKeys.getMembers(), params] as const,
  addMember: () => kApiMemberKeys.addMember(),
  removeMember: () => kApiMemberKeys.removeMember(),
  getMemberById: (memberId: string) => kApiMemberKeys.getMemberById(memberId),
  updateMemberById: (memberId: string) =>
    kApiMemberKeys.updateMemberById(memberId),
  getMemberRequests: (params: GetMemberRequestsEndpointArgs) =>
    [kApiMemberKeys.getMemberRequests(), params] as const,
  respondToMemberRequest: (memberId: string) =>
    kApiMemberKeys.respondToMemberRequest(memberId),
};

export const kCallbackSWRKeys = {
  getCallbacks: (params: GetCallbacksEndpointArgs) =>
    [kApiCallbackKeys.getCallbacks(), params] as const,
  addCallback: () => kApiCallbackKeys.addCallback(),
  getCallback: (callbackId: string) => kApiCallbackKeys.getCallback(callbackId),
  deleteCallback: () => kApiCallbackKeys.deleteCallback(),
  updateCallback: (callbackId: string) =>
    kApiCallbackKeys.updateCallback(callbackId),
};
