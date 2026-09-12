import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const MAX_PASSES = 4

/**
 * For every strip that spans into the bay to its right, work out where the
 * right bay's placeholder goes and how much to pad strip / placeholder so
 * they sit on the same row. Measures the DOM after each render and settles
 * within a few passes; state only changes when the result differs.
 *
 * Measuring is frozen while `frozen` (a drag in progress: dnd-kit has
 * transforms applied and caches droppable rects, so the DOM must not shift
 * under it). It re-runs when the board changes, when `frozen` clears, and
 * when the container resizes.
 *
 * @returns {Record<string, { index: number, height: number, stripMargin: number, placeholderMargin: number }>}
 */
export function useSpanAlignment(board, containerRef, { frozen = false } = {}) {
  const [layout, setLayout] = useState({})
  const [tick, setTick] = useState(0)
  const passes = useRef({ key: null, count: 0 })

  // container size changes (window resize, orientation) → re-measure
  useEffect(() => {
    const root = containerRef.current
    if (!root || typeof ResizeObserver === 'undefined') return undefined
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTick((t) => t + 1))
    })
    ro.observe(root)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [containerRef])

  useLayoutEffect(() => {
    if (frozen) return undefined
    const key = `${tick}:${frozen}`
    if (passes.current.key !== key || passes.current.board !== board) passes.current = { key, board, count: 0 }
    const root = containerRef.current
    if (!root || passes.current.count >= MAX_PASSES) return undefined
    const next = {}
    for (const strip of Object.values(board.strips)) {
      if (!strip.spanBayId) continue
      const el = root.querySelector(`[data-strip-id="${CSS.escape(strip.id)}"]`)
      const list = root.querySelector(`[data-bay-strips="${CSS.escape(strip.spanBayId)}"]`)
      if (!el || !list) continue
      const prev = layout[strip.id] ?? { index: 0, height: 0, stripMargin: 0, placeholderMargin: 0 }
      const rect = el.getBoundingClientRect()
      const naturalTop = rect.top - prev.stripMargin
      const ph = list.querySelector(`[data-span-of="${CSS.escape(strip.id)}"]`)
      // Row for the placeholder: count the right bay's strips whose centre
      // would be above the spanning strip if the placeholder weren't there.
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0
      let offset = 0
      let index = 0
      for (const c of list.children) {
        if (c === ph) {
          offset = c.getBoundingClientRect().height + gap + prev.placeholderMargin
          continue
        }
        if (!c.hasAttribute('data-strip-id')) continue
        const r = c.getBoundingClientRect()
        if (r.top - offset + r.height / 2 < naturalTop) index += 1
      }
      let stripMargin = 0
      let placeholderMargin = 0
      if (ph && prev.index === index) {
        const phTop = ph.getBoundingClientRect().top - prev.placeholderMargin
        const diff = Math.round(naturalTop - phTop)
        if (diff > 0) placeholderMargin = diff
        else if (diff < 0) stripMargin = -diff
      }
      next[strip.id] = { index, height: Math.round(rect.height), stripMargin, placeholderMargin }
    }
    if (same(layout, next)) return undefined
    passes.current.count += 1
    // Microtask: runs after commit but before paint, so the row shift is not visible.
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLayout(next)
    })
    return () => {
      cancelled = true
    }
  }, [board, layout, containerRef, frozen, tick])

  return layout
}

function same(a, b) {
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => {
    const x = a[k]
    const y = b[k]
    return (
      y &&
      x.index === y.index &&
      x.height === y.height &&
      x.stripMargin === y.stripMargin &&
      x.placeholderMargin === y.placeholderMargin
    )
  })
}
