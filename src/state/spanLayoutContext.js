import { createContext, useContext } from 'react'

/** Alignment data for strips spanning two bays — see useSpanAlignment. */
export const SpanLayoutContext = createContext({})

export function useSpanLayout() {
  return useContext(SpanLayoutContext)
}
