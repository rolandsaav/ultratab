import { nav } from '../nav.svelte';
import { status, toMessage } from '../status.svelte';
import type { Command } from '../../commands/command';

export interface RunHandlers {
  /** For a `stay` action: re-fetch the list. */
  onRefresh?: () => void;
  /** For a `remove` action: drop the acted row, no full re-fetch. */
  onRemove?: () => void;
}

/** Run a command against its subject: push a view, or perform an effect then close,
 * refresh, or drop the acted row. Failures surface through the shared status. */
export async function runCommand<T>(
  command: Command<T>,
  subject: T,
  handlers: RunHandlers = {},
): Promise<void> {
  status.error = '';
  if (command.run.kind === 'view') {
    nav.push(command);
    return;
  }
  try {
    await command.run.perform(subject);
  } catch (e) {
    status.error = toMessage(e, 'Action failed');
    return;
  }
  if (command.run.after === 'stay') {
    handlers.onRefresh?.();
  } else if (command.run.after === 'remove') {
    (handlers.onRemove ?? handlers.onRefresh)?.();
  } else {
    nav.close();
  }
}
