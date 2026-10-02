import { useEffect } from "react"

const FOCUSABLE_FORM_CONTROLS = "input, select, textarea"
const VIEWPORT_PADDING = 16

export default function KeyboardViewport() {
  useEffect(() => {
    const visualViewport = window.visualViewport
    const root = document.documentElement
    let frame = 0
    let timeout: number | undefined

    const syncViewport = () => {
      root.style.setProperty(
        "--keyboard-viewport-height",
        `${visualViewport?.height ?? window.innerHeight}px`,
      )
      root.style.setProperty(
        "--keyboard-viewport-offset",
        `${visualViewport?.offsetTop ?? 0}px`,
      )
    }

    const keepFocusedControlVisible = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
      frame = requestAnimationFrame(() => {
        timeout = window.setTimeout(() => {
          const activeElement = document.activeElement
          if (
            !(activeElement instanceof HTMLElement) ||
            !activeElement.matches(FOCUSABLE_FORM_CONTROLS) ||
            activeElement.matches(":disabled")
          ) {
            return
          }

          const rect = activeElement.getBoundingClientRect()
          const viewportTop = visualViewport?.offsetTop ?? 0
          const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight)
          if (
            rect.top < viewportTop + VIEWPORT_PADDING ||
            rect.bottom > viewportBottom - VIEWPORT_PADDING
          ) {
            activeElement.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
          }
        }, 80)
      })
    }

    syncViewport()
    window.addEventListener("resize", syncViewport)
    document.addEventListener("focusin", keepFocusedControlVisible)
    visualViewport?.addEventListener("resize", syncViewport)
    visualViewport?.addEventListener("resize", keepFocusedControlVisible)
    visualViewport?.addEventListener("scroll", syncViewport)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
      window.removeEventListener("resize", syncViewport)
      document.removeEventListener("focusin", keepFocusedControlVisible)
      visualViewport?.removeEventListener("resize", syncViewport)
      visualViewport?.removeEventListener("resize", keepFocusedControlVisible)
      visualViewport?.removeEventListener("scroll", syncViewport)
      root.style.removeProperty("--keyboard-viewport-height")
      root.style.removeProperty("--keyboard-viewport-offset")
    }
  }, [])

  return null
}
