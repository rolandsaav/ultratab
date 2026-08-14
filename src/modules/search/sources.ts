import type { Component } from 'svelte';
import AppWindow from '@lucide/svelte/icons/app-window';
import Bookmark from '@lucide/svelte/icons/bookmark';
import History from '@lucide/svelte/icons/history';
import type { Item, ItemTime, Kind, SourceToggles, TimeKind } from './parsers';

interface SourceMeta {
  label: string;
  rowLabel: string;
  icon: Component;
  /** The @-command that enables this source when it is the entire input. */
  command: string;
}

/** Presentation metadata per source — the single home for icons, labels, and @-commands. */
export const SOURCE_META: Record<Kind, SourceMeta> = {
  tab: { label: 'Tabs', rowLabel: 'Tab', icon: AppWindow, command: '@t' },
  bookmark: {
    label: 'Bookmarks',
    rowLabel: 'Bookmark',
    icon: Bookmark,
    command: '@b',
  },
  history: {
    label: 'History',
    rowLabel: 'History',
    icon: History,
    command: '@h',
  },
};

/** Left-to-right display order of the source toggle icons — the declaration order
 * of SOURCE_META, so adding a source needs only a SOURCE_META entry. */
export const SOURCE_ORDER = Object.keys(SOURCE_META) as Kind[];

/** The source a whole-input @-command enables, or null when the input is not one. */
export function parseSourceCommand(input: string): Kind | null {
  const match = (Object.keys(SOURCE_META) as Kind[]).find(
    (kind) => SOURCE_META[kind].command === input,
  );
  return match ?? null;
}

const listFormat = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
});

const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

const dateTimeFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const TIME_LABELS: Record<TimeKind, string> = {
  lastActive: 'Last Active',
  opened: 'Opened',
  created: 'Created',
};

const RELATIVE_TIME_UNITS = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
] as const;

type RelativeTimeUnit = (typeof RELATIVE_TIME_UNITS)[number]['unit'];

function formatRelativeTime(value: number, now = Date.now()): string {
  const elapsed = value - now;
  const absElapsed = Math.abs(elapsed);
  const match =
    RELATIVE_TIME_UNITS.find(({ ms }) => absElapsed >= ms) ??
    RELATIVE_TIME_UNITS[RELATIVE_TIME_UNITS.length - 1];
  return relativeTimeFormat.format(
    Math.round(elapsed / match.ms),
    match.unit as RelativeTimeUnit,
  );
}

export function formatItemTime(time: ItemTime | undefined): string {
  if (!time) return '';
  return `${TIME_LABELS[time.kind]} ${formatRelativeTime(time.value)}`;
}

export function formatItemDateTime(time: ItemTime | undefined): string {
  if (!time) return '';
  return dateTimeFormat.format(time.value);
}

/** Input placeholder naming the enabled sources, e.g. "Search tabs and history…". */
export function searchPlaceholder(enabled: SourceToggles): string {
  const names = SOURCE_ORDER.filter((kind) => enabled[kind]).map((kind) =>
    SOURCE_META[kind].label.toLowerCase(),
  );
  return `Search ${listFormat.format(names)}…`;
}

/** Compact trailing row label for the result's source. */
export function sourceRowLabel(item: Item): string {
  return item.active ? 'Active Tab' : SOURCE_META[item.kind].rowLabel;
}
