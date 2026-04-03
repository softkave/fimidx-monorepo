export const kApiGroupKeys = {
  getGroups: () => `/api/groups/fetch`,
  getGroup: (groupId: string) => `/api/groups/${groupId}`,
  addGroup: () => `/api/groups`,
  deleteGroup: () => `/api/groups`,
  updateGroup: (groupId: string) => `/api/groups/${groupId}`,
};

export const kApiOrgKeys = {
  getOrgs: () => `/api/orgs/fetch`,
  getOrg: (orgId: string) => `/api/orgs/${orgId}`,
  addOrg: () => `/api/orgs`,
  deleteOrg: (orgId: string) => `/api/orgs/${orgId}`,
  updateOrg: (orgId: string) => `/api/orgs/${orgId}`,
};

export const kApiProjectKeys = {
  getProjects: () => `/api/projects/fetch`,
  addProject: () => `/api/projects`,
  deleteProject: () => `/api/projects`,
  updateProject: () => `/api/projects`,
};

export const kApiClientTokenKeys = {
  getClientTokens: () => `/api/client-tokens/fetch`,
  addClientToken: () => `/api/client-tokens`,
  deleteClientTokens: () => `/api/client-tokens`,
  updateClientTokens: () => `/api/client-tokens`,
  encodeClientTokenJWT: (clientTokenId: string) =>
    `/api/client-tokens/${clientTokenId}/encode`,
  refreshClientTokenJWT: () => `/api/client-tokens/refresh`,
};

export const kApiLogKeys = {
  ingest: () => `/api/logs/ingest`,
  retrieve: () => `/api/logs/fetch`,
  getLogFields: () => `/api/logs/fields`,
};

export const kApiMonitorKeys = {
  getMonitors: () => `/api/monitors/fetch`,
  getMonitorById: (monitorId: string) => `/api/monitors/${monitorId}`,
  addMonitor: () => `/api/monitors`,
  deleteMonitor: () => `/api/monitors`,
  updateMonitor: (monitorId: string) => `/api/monitors/${monitorId}`,
};

export const kApiMemberKeys = {
  getMembers: () => `/api/members/fetch`,
  addMember: () => `/api/members`,
  removeMember: () => `/api/members`,
  getMemberById: (memberId: string) => `/api/members/${memberId}`,
  updateMemberById: (memberId: string) => `/api/members/${memberId}`,
  getMemberRequests: () => `/api/members/requests`,
  respondToMemberRequest: (memberId: string) =>
    `/api/members/${memberId}/respond`,
};

export const kApiCallbackKeys = {
  getCallbacks: () => `/api/callbacks/fetch`,
  addCallback: () => `/api/callbacks`,
  getCallback: (callbackId: string) => `/api/callbacks/${callbackId}`,
  deleteCallback: () => `/api/callbacks`,
  updateCallback: (callbackId: string) => `/api/callbacks/${callbackId}`,
};

export const kApiSourceMapKeys = {
  getConfig: (projectId: string) =>
    `/api/source-maps/config?projectId=${encodeURIComponent(projectId)}`,
  updateConfig: () => `/api/source-maps/config`,
  getUploads: (projectId: string) =>
    `/api/source-maps/uploads?projectId=${encodeURIComponent(projectId)}`,
};
