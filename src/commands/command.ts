import type { Component } from 'svelte';
import type { View } from '../shell/view';

/**
 * A keystroke stored structurally so it can be matched and formatted per-platform.
 * `mod` is the command modifier: ⌘ on macOS, Ctrl elsewhere.
 */
export interface Shortcut {
  mod?: boolean;
  shift?: boolean;
  key: string;
}

/**
 * Command pattern: anything invocable in the palette — a root entry that opens a
 * view or performs a one-shot, or a per-item action. Generic over the subject it
 * acts on: void for root commands, e.g. an Item for per-item actions.
 */
export interface Command<T = void> {
  id: string;
  title: string;
  icon: Component;
  keywords?: string[];
  shortcut?: Shortcut;
  run: CommandRun<T>;
}

/** What happens to the palette after a perform: dismiss (`close`), refresh in place
 * (`stay`), or drop the acted row and reselect its neighbour (`remove`). */
export type PerformAfter = 'close' | 'stay' | 'remove';

export type CommandRun<T> =
  | { kind: 'view'; view: View }
  | {
      kind: 'perform';
      perform: (subject: T) => Promise<void>;
      after?: PerformAfter;
    };
