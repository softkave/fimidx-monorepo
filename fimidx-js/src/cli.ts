#!/usr/bin/env node

import { Command } from 'commander';
import { kDefaultServerURL } from './constants.js';
import { runUploadSourceMaps } from './bin/upload-source-maps.js';

const program = new Command();

program.name('fimidx').description('Fimidx CLI').version('0.6.0');

const sourceMaps = program
  .command('source-maps')
  .description('Source map operations');

sourceMaps
  .command('upload')
  .description('Upload source maps (folder or zip) for a project')
  .requiredOption('--client-token <token>', 'Fimidx client token')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--repo <repo>', 'Repo identifier')
  .requiredOption('--version <version>', 'Version')
  .requiredOption('--path <path>', 'Path to folder or zip file')
  .option('--server-url <url>', 'Fimidx API base URL', kDefaultServerURL)
  .option(
    '--fimidara-url <url>',
    'Fimidara API base URL (e.g. https://api.fimidara.com)',
  )
  .action(
    async (opts: {
      clientToken: string;
      projectId: string;
      repo: string;
      version: string;
      path: string;
      serverUrl: string;
      fimidaraUrl?: string;
    }) => {
      const fimidaraUrl = opts.fimidaraUrl ?? process.env.FIMIDARA_SERVER_URL;
      if (!fimidaraUrl) {
        console.error(
          'Missing Fimidara URL: set --fimidara-url or FIMIDARA_SERVER_URL',
        );
        process.exit(1);
      }
      try {
        await runUploadSourceMaps({
          clientToken: opts.clientToken,
          projectId: opts.projectId,
          repo: opts.repo,
          version: opts.version,
          inputPath: opts.path,
          serverUrl: opts.serverUrl,
          fimidaraUrl,
        });
        console.log('Upload complete.');
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    },
  );

program.parse();
