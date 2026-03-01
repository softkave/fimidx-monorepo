import {describe, test} from 'vitest';
import {getTestVars} from '../../testUtils/test.js';
import {FimidxEndpoints} from '../fimidxEndpoints.js';

const vars = getTestVars();
const endpoints = new FimidxEndpoints({
  authToken: vars.authToken,
  serverURL: vars.serverURL,
});

describe('log endpoints', () => {
  test('ingest logs succeeds', async () => {
    await endpoints.logs.ingestLogs({
      projectId: vars.projectId,
      logs: [
        {
          message: 'Hello, world!',
          level: 'info',
          timestamp: new Date(),
        },
        {
          message: 'Hello, world!',
          level: 'info',
        },
        {
          some: 'other',
        },
      ],
    });
  });
});
