import { describe, expect, it } from 'vitest';

import { clampPage, pageCount, pageItems } from '../src/features/catalog/StreamList/pagination';

const items = Array.from({ length: 19 }, (_, i) => i);

describe('splitting a list into pages', () => {
  it('counts the pages needed, and none for an empty list', () => {
    expect(pageCount(19, 8)).toBe(3);
    expect(pageCount(16, 8)).toBe(2);
    expect(pageCount(0, 8)).toBe(0);
  });

  it('hands back the items of one page, the last one short', () => {
    expect(pageItems(items, 1, 8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(pageItems(items, 3, 8)).toEqual([16, 17, 18]);
  });

  it('keeps a page inside the pages there are, so a shrinking list never shows an empty page', () => {
    expect(clampPage(4, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 0)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
  });
});
