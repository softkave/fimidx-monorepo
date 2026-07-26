import {describe, expect, it} from 'vitest';
import {resolveFileConfig} from '../config.js';
import {LogFilesConsumerOptions} from '../types.js';

const baseConfig: LogFilesConsumerOptions = {
  logFiles: [],
};

describe('resolveFileConfig', () => {
  it('prefers per-file over global over env', () => {
    const resolved = resolveFileConfig(
      {
        path: '/var/log/a.log',
        projectId: 'file-project',
        clientToken: 'file-token',
        serverURL: 'https://file.example',
      },
      {
        ...baseConfig,
        projectId: 'global-project',
        clientToken: 'global-token',
        serverURL: 'https://global.example',
      },
      {
        FIMIDX_PROJECT_ID: 'env-project',
        FIMIDX_CLIENT_TOKEN: 'env-token',
        FIMIDX_SERVER_URL: 'https://env.example',
      },
    );

    expect(resolved.projectId).toBe('file-project');
    expect(resolved.clientToken).toBe('file-token');
    expect(resolved.serverURL).toBe('https://file.example');
  });

  it('falls back to env when config omits credentials', () => {
    const resolved = resolveFileConfig(
      {path: '/var/log/a.log'},
      baseConfig,
      {
        FIMIDX_PROJECT_ID: 'env-project',
        FIMIDX_CLIENT_TOKEN: 'env-token',
        FIMIDX_SERVER_URL: 'https://env.example',
      },
    );

    expect(resolved.projectId).toBe('env-project');
    expect(resolved.clientToken).toBe('env-token');
    expect(resolved.serverURL).toBe('https://env.example');
  });

  it('prefers global over env', () => {
    const resolved = resolveFileConfig(
      {path: '/var/log/a.log'},
      {
        ...baseConfig,
        projectId: 'global-project',
        clientToken: 'global-token',
      },
      {
        FIMIDX_PROJECT_ID: 'env-project',
        FIMIDX_CLIENT_TOKEN: 'env-token',
      },
    );

    expect(resolved.projectId).toBe('global-project');
    expect(resolved.clientToken).toBe('global-token');
  });

  it('throws when credentials cannot be resolved', () => {
    expect(() =>
      resolveFileConfig({path: '/var/log/a.log'}, baseConfig, {}),
    ).toThrow(/projectId and clientToken are required/);
  });

  it('applies processing option defaults and overrides', () => {
    const resolved = resolveFileConfig(
      {
        path: '/var/log/a.log',
        projectId: 'p',
        clientToken: 't',
        batchSize: 5,
      },
      {
        ...baseConfig,
        maxRecordBytes: 2048,
        flushIncompleteAfterMs: 1000,
      },
      {},
    );

    expect(resolved.batchSize).toBe(5);
    expect(resolved.maxRecordBytes).toBe(2048);
    expect(resolved.flushIncompleteAfterMs).toBe(1000);
  });

  it('merges per-file metadata into global metadata', () => {
    const resolved = resolveFileConfig(
      {
        path: '/var/log/a.log',
        projectId: 'p',
        clientToken: 't',
        metadata: {logType: 'application', service: 'file-service'},
      },
      {
        ...baseConfig,
        metadata: {
          environment: 'production',
          service: 'global-service',
        },
      },
      {},
    );

    expect(resolved.metadata).toEqual({
      environment: 'production',
      service: 'file-service',
      logType: 'application',
    });
  });
});
