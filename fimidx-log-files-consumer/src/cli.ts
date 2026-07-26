#!/usr/bin/env node

import {startLogFilesConsumer} from './index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || !args[0]) {
    console.error('Usage: fimidx-log-files-consumer <config-filepath>');
    process.exit(1);
  }

  const configFilepath = args[0];

  try {
    const consumer = await startLogFilesConsumer(configFilepath);

    const shutdown = async () => {
      console.log('Shutting down...');
      await consumer.stop();
      process.exit(0);
    };

    const reload = (signal: string) => {
      console.log(`Received ${signal}, reloading config`);
      consumer.requestReload();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    // SIGUSR1 is reserved by Node for the inspector, so SIGUSR2 is the alias.
    process.on('SIGHUP', () => reload('SIGHUP'));
    process.on('SIGUSR2', () => reload('SIGUSR2'));

    console.log(
      `Log files consumer is running. Send SIGHUP (kill -HUP ${process.pid}) to reload config, Ctrl+C to stop.`,
    );
  } catch (error) {
    console.error('Failed to start log files consumer:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
