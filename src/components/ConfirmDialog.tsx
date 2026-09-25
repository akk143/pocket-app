import { useEffect, useRef } from "react"
import { X } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  subject?: string
  message: string
  confirmLabel?: string
  variant?: "soft" | "danger"
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  subject,
  message,
  confirmLabel = "Delete",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
      if (event.key !== "Tab" || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open, onCancel])

  if (!open) return null
  const isSoftDelete = variant === "soft"

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-[3px] sm:items-center sm:p-4 dark:bg-zinc-950/70"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-medium leading-6 text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-3 text-sm leading-5 text-zinc-700 dark:text-zinc-300">
              {message}{" "}
              {subject && <strong className="font-semibold text-zinc-950 dark:text-zinc-50">{subject}</strong>}
              {subject && isSoftDelete ? " to Trash." : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            className="min-h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:min-w-20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-10 rounded-xl px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-w-28 ${
              isSoftDelete
                ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500"
                : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
