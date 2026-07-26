import {ILogFilesConsumer, LogFilesConsumer} from './LogFilesConsumer.js';

export type {ILogFilesConsumer};
export {LogFilesConsumer};
export {consumeLogFile} from './consumeLogFile.js';
export {LogFileReader} from './logFileReader.js';
export {resolveFileConfig} from './config.js';
export * from './types.js';

export async function startLogFilesConsumer(
  configFilepath: string,
): Promise<ILogFilesConsumer> {
  const consumer = new LogFilesConsumer(configFilepath);
  await consumer.start();
  return consumer;
}
