import { useEffect, useRef, useState } from "react"
import type { PointerEvent } from "react"
import { CalendarDays, Clock3, FileText, Pencil, Repeat, Tag, Trash2, X } from "lucide-react"
import type { Expense } from "../types/expense"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"
import ConfirmDialog from "./ConfirmDialog"

interface TransactionDetailsSheetProps {
  expense: Expense
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expenseId: string) => void | Promise<void>
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return date
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function formatTime(time: string) {
  if (!time) return "—"
  if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) return time
  const [hourText, minute] = time.split(":")
  const hour = Number(hourText)
  if (!Number.isInteger(hour) || !minute) return time
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`
}

export default function TransactionDetailsSheet({
  expense,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailsSheetProps) {
  const { currency, rates } = useCurrency()
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const isIncome = expense.type === "income"
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const category = categories.find((c) => c.id === expense.categoryId)
  const CategoryIcon = category?.component ?? Tag
  const amount = convertAndFormatCurrency(expense.amount, currency, rates)

  // Detect if this was posted by a recurring schedule
  const recurringLabel =
    expense.note === "Recurring payment"
      ? "Manually posted recurring"
      : expense.note?.endsWith("(Manual post)")
      ? "Manually posted recurring"
      : expense.note?.endsWith("(Auto-recurring)")
      ? "Auto-posted recurring"
      : null

  // The user-visible note — hide it if it's only the internal recurring marker
  const visibleNote =
    recurringLabel
      ? expense.note
          .replace("(Manual post)", "")
          .replace("(Auto-recurring)", "")
          .replace("Recurring payment", "")
          .trim() || null
      : expense.note?.trim() || null

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
  }
  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = dragStart.current
    dragStart.current = null
    if (s && e.clientY - s.y > 80 && Math.abs(e.clientX - s.x) < 60) onClose()
  }

  const handleDelete = async () => {
    await onDelete(expense.id)
    setIsDeleteConfirmOpen(false)
    onClose()
  }

  return (
    <>
      {/* Backdrop + positioning */}
      <div className="fixed inset-x-0 top-[var(--keyboard-viewport-offset)] z-[55] flex h-[var(--keyboard-viewport-height)] items-end justify-center pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] sm:items-center sm:p-4">
        {/* Overlay */}
        <button
          type="button"
          aria-label="Close transaction details"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-zinc-950/40 backdrop-blur-[2px] dark:bg-zinc-950/60"
        />

        {/* Sheet */}
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="txn-details-title"
          className="relative z-10 flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
          style={{ maxHeight: "min(72dvh, calc(var(--keyboard-viewport-height) - 1rem))" }}
        >
          {/* Drag handle (mobile only) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="shrink-0 touch-pan-y"
          >
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span className="h-[5px] w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            {/* Close button row */}
            <div className="flex items-center justify-end px-4 pb-1 pt-2 sm:px-5 sm:pt-4 sm:pb-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* ── Hero: icon + name + amount ── */}
            <div className="flex flex-col items-center px-6 pb-5 pt-1 text-center sm:px-8 sm:pb-6">
              {/* Category icon */}
              <div
                className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${
                  isIncome
                    ? "bg-emerald-50 dark:bg-emerald-500/10"
                    : category?.color
                    ? ""
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
                style={
                  !isIncome && category?.color
                    ? { backgroundColor: category.color + "18" }
                    : undefined
                }
              >
                <CategoryIcon
                  className="h-6 w-6"
                  style={
                    isIncome
                      ? { color: "#10b981" }
                      : category?.color
                      ? { color: category.color }
                      : undefined
                  }
                />
              </div>

              {/* Transaction name — wraps freely, never truncated */}
              <h2
                id="txn-details-title"
                className="max-w-[320px] break-words text-[19px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-white [overflow-wrap:anywhere]"
              >
                {expense.item}
              </h2>

              {/* Type badge */}
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                  isIncome
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                }`}
              >
                {isIncome ? "Income" : "Expense"}
              </span>

              {/* Amount */}
              <p
                className={`mt-4 break-words text-[28px] font-bold tabular-nums tracking-tight ${
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-950 dark:text-white"
                }`}
              >
                {isIncome ? "+ " : ""}{amount}
              </p>
            </div>

            {/* ── Metadata table ── */}
            <div className="mx-4 mb-4 sm:mx-6 sm:mb-5">
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 px-4 py-1">

                {/* Category */}
                <MetaRow
                  icon={<CategoryIcon className="h-3.5 w-3.5" style={{ color: category?.color }} />}
                  label="Category"
                  value={expense.categoryName}
                />

                {/* Recurring badge */}
                {recurringLabel && (
                  <MetaRow
                    icon={<Repeat className="h-3.5 w-3.5 text-emerald-500" />}
                    label="Recurring"
                    value={recurringLabel}
                  />
                )}

                {/* Date */}
                <MetaRow
                  icon={<CalendarDays className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />}
                  label="Date"
                  value={formatDate(expense.date)}
                />

                {/* Time */}
                <MetaRow
                  icon={<Clock3 className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />}
                  label="Time"
                  value={formatTime(expense.time)}
                />

                {/* Note */}
                {visibleNote && (
                  <MetaRow
                    icon={<FileText className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />}
                    label="Note"
                    value={visibleNote}
                    multiline
                  />
                )}
              </dl>
            </div>
          </div>

          {/* ── Actions footer ── */}
          <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
            {/* Primary: Edit */}
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Pencil className="h-4 w-4" />
              Edit Transaction
            </button>

            {/* Destructive: Delete — subtle, text-danger */}
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Transaction
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="Move transaction to Trash?"
        subject={expense.item}
        message="This will move"
        confirmLabel="Move to Trash"
        variant="soft"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}

// ── Shared metadata row ───────────────────────────────────────────────────────

function MetaRow({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 py-2.5">
      <span className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">{icon}</span>
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <dt className="shrink-0 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </dt>
        <dd
          className={`min-w-0 text-right text-[13px] font-medium text-zinc-800 dark:text-zinc-200 ${
            multiline ? "whitespace-pre-wrap break-words text-left [overflow-wrap:anywhere]" : "truncate"
          }`}
        >
          {value}
        </dd>
      </div>
    </div>
  )
}
