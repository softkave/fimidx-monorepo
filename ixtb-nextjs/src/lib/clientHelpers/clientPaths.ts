import { getClientConfig } from "fimidx-core/common/index";

const kBaseUrl = getClientConfig().publicURL ?? "https://dx.fimidara.com";

export const kClientPaths = {
  index: "/",
  signin: "/signin",
  signinWithRedirect: (redirectTo: string) =>
    `/signin?redirectTo=${redirectTo}`,
  app: {
    index: "/app",
    profile: "/app/profile",
    org: {
      index: "/app/orgs",
      single: (orgId: string) => `/app/orgs/${orgId}`,
      members: {
        index: (orgId: string) => `/app/orgs/${orgId}/members`,
        single: (orgId: string, memberId: string) =>
          `/app/orgs/${orgId}/members/${memberId}`,
      },
      project: {
        index: (orgId: string) => `/app/orgs/${orgId}/projects`,
        single: (orgId: string, projectId: string) =>
          `/app/orgs/${orgId}/projects/${projectId}`,
        clientToken: {
          index: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/client-tokens`,
          single: (orgId: string, projectId: string, clientTokenId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/client-tokens/${clientTokenId}`,
        },
        log: {
          index: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/logs`,
        },
        sourceMaps: {
          index: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/source-maps`,
          config: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/source-maps/config`,
          uploads: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/source-maps/uploads`,
        },
        monitors: {
          index: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors`,
          /** Defaults to the details tab. */
          single: (orgId: string, projectId: string, monitorId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}/details`,
          details: (orgId: string, projectId: string, monitorId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}/details`,
          alerts: (orgId: string, projectId: string, monitorId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}/alerts`,
          runs: (orgId: string, projectId: string, monitorId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}/runs`,
          edit: (orgId: string, projectId: string, monitorId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}/edit`,
          tab: (
            orgId: string,
            projectId: string,
            monitorId: string,
            tab: string
          ) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}/${tab}`,
          new: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/monitors/new`,
        },
        alerts: {
          index: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/alerts`,
          single: (orgId: string, projectId: string, alertId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/alerts/${alertId}`,
        },
        callbacks: {
          index: (orgId: string, projectId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/callbacks`,
          single: (orgId: string, projectId: string, callbackId: string) =>
            `/app/orgs/${orgId}/projects/${projectId}/callbacks/${callbackId}`,
        },
      },
    },
    myRequests: "/app/my-requests",
  },
  emailTemplates: {
    index: "/email-templates",
    addParticipant: "/email-templates/add-participant",
    monitorAlert: "/email-templates/monitor-alert",
  },
  withURL(path: string) {
    return `${kBaseUrl}${path}`;
  },
};
