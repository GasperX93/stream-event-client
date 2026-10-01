/** How many past streams one page of the browse page shows, as msrs-client does. */
export const PAST_STREAMS_PER_PAGE = 8;

export function pageCount(total: number, perPage: number): number {
  return Math.ceil(total / perPage);
}

/** A page number from 1 to the last page, so a list that shrank under a viewer never leaves them on an empty page. */
export function clampPage(page: number, count: number): number {
  return Math.min(Math.max(page, 1), Math.max(count, 1));
}

/** The items on a page, counting pages from 1. */
export function pageItems<T>(items: readonly T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}
