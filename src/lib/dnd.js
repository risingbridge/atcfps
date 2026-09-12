/** Sortable ids for bay reordering, prefixed so they don't collide with the bays' strip-droppable ids. */
export const BAY_SORT_PREFIX = 'bay-sort:'
export const baySortId = (bayId) => `${BAY_SORT_PREFIX}${bayId}`

/** Droppable id for the gap to the right of `leftBayId`. */
export const GAP_PREFIX = 'gap:'
export const gapId = (leftBayId) => `${GAP_PREFIX}${leftBayId}`
