import { describe, expect, it, vi } from 'vitest';
import { createWindowReconcileQueue } from './window-reconcile-queue';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createWindowReconcileQueue', () => {
  it('combines repeated requests into one rerun', async () => {
    const firstRun = deferred();
    const secondRun = deferred();
    const secondStarted = deferred();
    let runCount = 0;
    const reconcile = vi.fn(() => {
      runCount += 1;
      if (runCount === 2) secondStarted.resolve();
      return runCount === 1 ? firstRun.promise : secondRun.promise;
    });
    const request = createWindowReconcileQueue(reconcile);

    const task = request(4);
    expect(request(4)).toBe(task);
    expect(request(4)).toBe(task);
    expect(reconcile).toHaveBeenCalledTimes(1);

    firstRun.resolve();
    await secondStarted.promise;
    expect(reconcile).toHaveBeenCalledTimes(2);

    secondRun.resolve();
    await task;
    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it('runs different windows independently', async () => {
    const firstWindow = deferred();
    const secondWindow = deferred();
    const reconcile = vi.fn((windowId: number) =>
      windowId === 1 ? firstWindow.promise : secondWindow.promise,
    );
    const request = createWindowReconcileQueue(reconcile);

    const firstTask = request(1);
    const secondTask = request(2);
    expect(reconcile).toHaveBeenCalledTimes(2);

    firstWindow.resolve();
    secondWindow.resolve();
    await Promise.all([firstTask, secondTask]);
  });

  it('allows a new request after a failure', async () => {
    const reconcile = vi
      .fn<(windowId: number) => Promise<void>>()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce();
    const request = createWindowReconcileQueue(reconcile);

    await expect(request(3)).rejects.toThrow('failed');
    await expect(request(3)).resolves.toBeUndefined();
    expect(reconcile).toHaveBeenCalledTimes(2);
  });
});
