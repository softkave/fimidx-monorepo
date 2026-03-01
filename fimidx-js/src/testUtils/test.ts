import assert from 'assert';

export interface ITestVars {
  authToken: string;
  serverURL: string;
  projectId: string;
}

export function getTestVars(): ITestVars {
  const authToken = process.env.FIMIDX_AUTH_TOKEN;
  const serverURL = process.env.FIMIDX_SERVER_URL;
  const projectId = process.env.FIMIDX_PROJECT_ID;

  assert.ok(authToken, 'FIMIDX_AUTH_TOKEN is not set');
  assert.ok(serverURL, 'FIMIDX_SERVER_URL is not set');
  assert.ok(projectId, 'FIMIDX_PROJECT_ID is not set');

  return {
    authToken,
    serverURL,
    projectId,
  };
}
