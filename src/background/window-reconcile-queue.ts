export type WindowReconcile = (windowId: number) => Promise<void>;

interface WindowRun {
  rerun: boolean;
  task: Promise<void>;
}

/** Run one task at a time for each window. Combine repeated requests into one rerun. */
export function createWindowReconcileQueue(
  reconcile: WindowReconcile,
): WindowReconcile {
  const runs = new Map<number, WindowRun>();

  return (windowId) => {
    const current = runs.get(windowId);
    if (current) {
      current.rerun = true;
      return current.task;
    }

    const run: WindowRun = { rerun: false, task: Promise.resolve() };
    runs.set(windowId, run);
    run.task = (async () => {
      try {
        do {
          run.rerun = false;
          await reconcile(windowId);
        } while (run.rerun);
      } finally {
        if (runs.get(windowId) === run) runs.delete(windowId);
      }
    })();

    return run.task;
  };
}
