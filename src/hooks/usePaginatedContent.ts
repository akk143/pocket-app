import { useRef, useState, useEffect } from "react"

type Direction = "forward" | "backward" | "none"

/**
 * Tracks page/period changes and returns a stable `contentKey` (to use as React `key`)
 * and an `animClass` string to apply the correct enter-animation CSS class.
 *
 * Usage:
 *   const { contentKey, animClass } = usePaginatedContent(currentPage)
 *   <div key={contentKey} className={`... ${animClass}`}>...</div>
 */
export function usePaginatedContent<T>(
  page: T,
  compareFn?: (prev: T, next: T) => number,
): { contentKey: string; animClass: string } {
  const prevPage = useRef<T>(page)
  const [animState, setAnimState] = useState<{ key: number; dir: Direction }>({
    key: 0,
    dir: "none",
  })

  useEffect(() => {
    if (prevPage.current === page) return

    let dir: Direction = "none"
    if (compareFn) {
      const cmp = compareFn(prevPage.current, page)
      dir = cmp < 0 ? "forward" : "backward"
    } else if (
      typeof page === "number" &&
      typeof prevPage.current === "number"
    ) {
      dir = page > prevPage.current ? "forward" : "backward"
    } else if (page instanceof Date && prevPage.current instanceof Date) {
      dir = page > prevPage.current ? "forward" : "backward"
    } else {
      // string key or other type — always animate forward (direction unknown)
      dir = "forward"
    }

    prevPage.current = page
    setAnimState((s) => ({ key: s.key + 1, dir }))
  }, [page, compareFn])

  const animClass =
    animState.dir === "forward"
      ? "animate-pg-forward"
      : animState.dir === "backward"
        ? "animate-pg-backward"
        : ""

  return { contentKey: String(animState.key), animClass }
}
