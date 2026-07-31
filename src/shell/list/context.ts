import { createContext } from 'svelte';
import type { Component } from 'svelte';
import type { Command } from '../../commands/command';

/** A row button — shown on hover and on the highlighted row. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows hold heterogeneous subjects
export interface InlineAction<T = any> {
  command: Command<T>;
  /** Resting glyph; defaults to the command's icon. Reflects current state. */
  icon?: Component;
  /** Swapped in on hover to preview what a click does. */
  hoverIcon?: Component;
  /** Keep visible at rest, not just on hover — for state-indicator actions. */
  persistent?: boolean;
}

/**
 * A row's actions: exactly one primary (run on Enter) and any number of secondaries
 * (which fill the actions panel). Making the primary a required field is what keeps a
 * row from ever being actionless — no positional `[0]` convention to uphold.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic default: a row may hold any subject type
export interface RowActions<T = any> {
  primary: Command<T>;
  secondary?: Command<T>[];
  /** Actions surfaced as buttons on the row itself, revealed on hover/highlight. */
  inline?: InlineAction<T>[];
}

/** A registered row: its actions plus the subject those actions act on. */
export interface ItemEntry {
  subject: unknown;
  actions: RowActions;
}

/** The List↔ListItem seam. ListItem registers itself; List drives footer/Enter/panel. */
export interface ListContext {
  register(id: string, entry: ItemEntry): void;
  unregister(id: string): void;
  select(id: string): void;
  openActions(id: string): void;
  runInline(id: string, index: number): void;
}

/** The List↔ListItem seam: `List` sets it, each `ListItem` gets it. */
export const [getListContext, setListContext] = createContext<ListContext>();

/** A row's actions flattened, primary first — for the panel and shortcut matching. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- subjects are heterogeneous across rows
export function allActions(actions: RowActions): Command<any>[] {
  return actions.secondary?.length
    ? [actions.primary, ...actions.secondary]
    : [actions.primary];
}

/** Whether a row carries actions beyond the primary — the single threshold for
 * both the footer's actions hint and whether the actions panel is worth opening. */
export function hasSecondaryActions(actions: RowActions): boolean {
  return !!actions.secondary?.length;
}
