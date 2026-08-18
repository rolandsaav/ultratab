import { describe, expect, it } from 'vitest';
import { order } from './fuzzy';

describe('order', () => {
  it('returns no matches for an empty query', () => {
    expect(order(['Ultra Tab'], '   ')).toEqual([]);
  });
});
