import { useEffect, useRef, useState } from "react"
import type { PointerEvent } from "react"
import { CalendarDays, Clock3, Tag, TrendingDown, TrendingUp, X } from "lucide-react"
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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function formatTime(time: string) {
  if (!time) return "Not specified"
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
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isIncome = expense.type === "income"
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const category = categories.find((item) => item.id === expense.categoryId)
  const CategoryIcon = category?.component ?? Tag
  const amount = convertAndFormatCurrency(expense.amount, currency, rates)
  const recurringLabel = expense.note === "Recurring payment"
    ? "Manually posted recurring transaction"
    : expense.note.endsWith("(Manual post)")
      ? "Manually posted recurring transaction"
      : expense.note.endsWith("(Auto-recurring)")
        ? "Automatically posted recurring transaction"
        : null

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    dragStart.current = null
    if (start && event.clientY - start.y > 90 && Math.abs(event.clientX - start.x) < 60) {
      onClose()
    }
  }

  const handleDelete = async () => {
    await onDelete(expense.id)
    setIsDeleteConfirmationOpen(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-x-0 top-[var(--keyboard-viewport-offset)] z-[55] flex h-[var(--keyboard-viewport-height)] items-end justify-center pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close transaction details"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-zinc-950/50 backdrop-blur-[2px] dark:bg-zinc-950/70"
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-details-title"
          className="relative z-10 flex max-h-[min(88dvh,var(--keyboard-viewport-height))] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl"
        >
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="shrink-0 touch-pan-y"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <header className="flex items-center justify-between gap-4 px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Transaction details
                </p>
                <h2 id="transaction-details-title" className="sr-only">Transaction details</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isIncome
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                }`}
              >
                <CategoryIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-bold leading-snug tracking-tight text-zinc-950 dark:text-white [overflow-wrap:anywhere]">
                  {expense.item}
                </h3>
                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isIncome
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                  }`}
                >
                  {isIncome ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isIncome ? "Income" : "Expense"}
                </span>
              </div>
            </div>

            <p
              className={`mt-5 break-words text-3xl font-bold tracking-tight tabular-nums ${
                isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-950 dark:text-white"
              }`}
            >
              {isIncome ? "+ " : ""}{amount}
            </p>

            <dl className="mt-6 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex min-w-0 items-start gap-3 py-3.5">
                <CategoryIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: category?.color }} />
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {expense.categoryName}
                  </dd>
                </div>
              </div>
              {recurringLabel && (
                <div className="flex min-w-0 items-start gap-3 py-3.5">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Recurring</dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {recurringLabel}
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex min-w-0 items-start gap-3 py-3.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatDate(expense.date)}
                  </dd>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-3 py-3.5">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Time</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatTime(expense.time)}
                  </dd>
                </div>
              </div>
              {expense.note?.trim() && (
                <div className="flex min-w-0 items-start gap-3 py-3.5">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Note</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 [overflow-wrap:anywhere]">
                      {expense.note}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          <footer className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:px-6">
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="min-h-12 flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              Edit Transaction
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmationOpen(true)}
              className="min-h-12 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30 sm:flex-1"
            >
              Delete Transaction
            </button>
          </footer>
        </section>
      </div>

      <ConfirmDialog
        open={isDeleteConfirmationOpen}
        title="Move transaction to Trash?"
        subject={expense.item}
        message="This will move"
        confirmLabel="Move to Trash"
        variant="soft"
        onCancel={() => setIsDeleteConfirmationOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
