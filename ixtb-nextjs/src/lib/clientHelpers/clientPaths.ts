import { getClientConfig } from "fimidx-core/common/index";

const kBaseUrl = getClientConfig().publicURL ?? "https://dx.fimidara.com";

export const kClientPaths = {
  index: "/",
  signin: "/signin",
  signinWithRedirect: (redirectTo: string) =>
    `/signin?redirectTo=${redirectTo}`,
  project: {
    index: "/project",
    profile: "/project/profile",
    org: {
      index: "/project/orgs",
      single: (orgId: string) => `/project/orgs/${orgId}`,
      members: {
        index: (orgId: string) => `/project/orgs/${orgId}/members`,
        single: (orgId: string, memberId: string) =>
          `/project/orgs/${orgId}/members/${memberId}`,
      },
      project: {
        index: (orgId: string) => `/project/orgs/${orgId}/projects`,
        single: (orgId: string, projectId: string) =>
          `/project/orgs/${orgId}/projects/${projectId}`,
        clientToken: {
          index: (orgId: string, projectId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/client-tokens`,
          single: (orgId: string, projectId: string, clientTokenId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/client-tokens/${clientTokenId}`,
        },
        log: {
          index: (orgId: string, projectId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/logs`,
        },
        monitors: {
          index: (orgId: string, projectId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/monitors`,
          single: (orgId: string, projectId: string, monitorId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/monitors/${monitorId}`,
        },
        callbacks: {
          index: (orgId: string, projectId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/callbacks`,
          single: (orgId: string, projectId: string, callbackId: string) =>
            `/project/orgs/${orgId}/projects/${projectId}/callbacks/${callbackId}`,
        },
      },
    },
    myRequests: "/project/my-requests",
  },
  emailTemplates: {
    index: "/email-templates",
    addParticipant: "/email-templates/add-participant",
  },
  withURL(path: string) {
    return `${kBaseUrl}${path}`;
  },
};
