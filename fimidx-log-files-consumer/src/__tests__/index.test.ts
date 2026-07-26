import {describe, expect, it, vi} from 'vitest';

vi.mock('../LogFilesConsumer.js', () => ({
  LogFilesConsumer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('startLogFilesConsumer', () => {
  it('constructs and starts a consumer', async () => {
    const {startLogFilesConsumer} = await import('../index.js');
    const {LogFilesConsumer} = await import('../LogFilesConsumer.js');

    const consumer = await startLogFilesConsumer('./config.json');
    expect(LogFilesConsumer).toHaveBeenCalledWith('./config.json');
    expect(consumer.start).toBeTypeOf('function');
    expect(consumer.stop).toBeTypeOf('function');
    await consumer.stop();
  });
});
