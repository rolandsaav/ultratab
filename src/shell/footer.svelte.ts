/** What the shell's footer shows for the active view. A rune singleton the active
 * view mutates and the shell reads. */
export interface FooterState {
  /** Left-aligned status text for the active view, e.g. a result count. */
  info?: string;
  primaryLabel?: string;
  hasActions: boolean;
}

export const footer: FooterState = $state({ hasActions: false });
