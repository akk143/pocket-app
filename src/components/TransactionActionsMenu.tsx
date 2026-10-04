import { useEffect, useRef, useState } from "react"
import { Eye, MoreVertical, Trash2 } from "lucide-react"

interface TransactionActionsMenuProps {
  itemName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewDetails?: () => void
  onDelete?: () => void
}

const MENU_WIDTH = 144
const MENU_ITEM_HEIGHT = 40
const MENU_PADDING = 10
const VIEWPORT_GUTTER = 8

export default function TransactionActionsMenu({
  itemName,
  open,
  onOpenChange,
  onViewDetails,
  onDelete,
}: TransactionActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const handleToggle = () => {
    if (open) {
      onOpenChange(false)
      return
    }

    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const itemCount = Number(Boolean(onViewDetails)) + Number(Boolean(onDelete))
    const menuHeight = itemCount * MENU_ITEM_HEIGHT + MENU_PADDING
    const belowTop = rect.bottom + 4
    const desiredTop =
      belowTop + menuHeight <= window.innerHeight - VIEWPORT_GUTTER
        ? belowTop
        : Math.max(VIEWPORT_GUTTER, rect.top - menuHeight - 4)
    const top = Math.min(
      desiredTop,
      Math.max(VIEWPORT_GUTTER, window.innerHeight - menuHeight - VIEWPORT_GUTTER),
    )
    const left = Math.max(
      VIEWPORT_GUTTER,
      Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER),
    )

    setPosition({ top, left })
    onOpenChange(true)
  }

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        onOpenChange(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
        triggerRef.current?.focus()
      }
    }
    const closeMenu = () => onOpenChange(false)

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", closeMenu)
    window.addEventListener("scroll", closeMenu, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", closeMenu)
      window.removeEventListener("scroll", closeMenu, true)
    }
  }, [open, onOpenChange])

  if (!onViewDetails && !onDelete) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${itemName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${itemName}`}
          className="fixed z-[55] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          style={{
            top: position.top,
            left: position.left,
            width: MENU_WIDTH,
            maxHeight: "calc(100dvh - 16px)",
            overflowY: "auto",
          }}
        >
          {onViewDetails && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(false)
                onViewDetails()
              }}
              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Eye className="h-3.5 w-3.5 text-zinc-400" />
              View details
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(false)
                onDelete()
              }}
              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </>
  )
}
