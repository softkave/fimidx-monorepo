import assert from 'assert';

export interface ITestVars {
  authToken: string;
  serverURL: string;
  appId: string;
}

export function getTestVars(): ITestVars {
  const authToken = process.env.FIMIDX_AUTH_TOKEN;
  const serverURL = process.env.FIMIDX_SERVER_URL;
  const appId = process.env.FIMIDX_APP_ID;

  assert.ok(authToken, 'FIMIDX_AUTH_TOKEN is not set');
  assert.ok(serverURL, 'FIMIDX_SERVER_URL is not set');
  assert.ok(appId, 'FIMIDX_APP_ID is not set');

  return {
    authToken,
    serverURL,
    appId,
  };
}
