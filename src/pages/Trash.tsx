import { useRef, useState } from "react"
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react"
import type { Expense } from "../types/expense"
import {
  emptyTrash,
  permanentlyDeleteExpenses,
  restoreExpenses,
} from "../lib/expenses"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"
import ConfirmDialog from "../components/ConfirmDialog"

interface TrashProps {
  deletedExpenses: Expense[]
  onRestore: (expenseId: string) => Promise<void>
  onTrashChanged: (message?: string) => Promise<void>
}

export default function Trash({ deletedExpenses, onRestore, onTrashChanged }: TrashProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [isEmptyDialogOpen, setIsEmptyDialogOpen] = useState(false)
  const [isEmptying, setIsEmptying] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const permanentDeleteLock = useRef(false)

  const activeSelectedIds = selectedIds.filter((id) =>
    deletedExpenses.some((expense) => expense.id === id),
  )

  const handleRestore = async (expenseId: string) => {
    setError(null)
    setRestoringId(expenseId)
    try {
      await onRestore(expenseId)
    } catch {
      setError("Could not restore this transaction. Please try again.")
    } finally {
      setRestoringId(null)
    }
  }

  const handleRestoreSelected = async () => {
    if (activeSelectedIds.length === 0) return
    setError(null)
    setIsRestoring(true)
    const count = activeSelectedIds.length
    try {
      const restoredIds = await restoreExpenses(activeSelectedIds)
      setSelectedIds([])
      const message =
        restoredIds.length < count
          ? `${restoredIds.length} of ${count} transactions restored`
          : count === 1
          ? "Transaction restored"
          : "Transactions restored"
      await onTrashChanged(message)
    } catch {
      setError(
        count === 1
          ? "Could not restore the selected transaction. Please try again."
          : "Could not restore the selected transactions. Please try again."
      )
    } finally {
      setIsRestoring(false)
    }
  }

  const handleEmptyTrash = async () => {
    if (permanentDeleteLock.current) return
    permanentDeleteLock.current = true
    setError(null)
    setIsEmptying(true)
    const isSelective = activeSelectedIds.length > 0 && !allSelected
    const count = activeSelectedIds.length
    try {
      let deletedCount = 0
      if (isSelective) {
        deletedCount = await permanentlyDeleteExpenses(activeSelectedIds)
      } else {
        deletedCount = await emptyTrash()
      }
      setIsEmptyDialogOpen(false)
      setSelectedIds([])
      let message = ""
      if (isSelective) {
        if (deletedCount < count) {
          message = `${deletedCount} of ${count} transactions permanently deleted`
        } else {
          message = count === 1 ? "Transaction permanently deleted" : "Transactions permanently deleted"
        }
      } else {
        message = "Trash emptied"
      }
      await onTrashChanged(message)
    } catch {
      setError(
        isSelective
          ? count === 1
            ? "Could not permanently delete the selected transaction. Please try again."
            : "Could not permanently delete the selected transactions. Please try again."
          : "Could not empty Trash. Please try again."
      )
    } finally {
      permanentDeleteLock.current = false
      setIsEmptying(false)
    }
  }

  const allSelected = deletedExpenses.length > 0 && activeSelectedIds.length === deletedExpenses.length
  const isDeletingSelected = activeSelectedIds.length > 0 && !allSelected
  const deleteConfirmationCount = isDeletingSelected ? activeSelectedIds.length : deletedExpenses.length
  const toggleSelected = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id])
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
      <div className="mb-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Trash</h1>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Deleted transactions are kept here until restored or permanently removed.</p>
          </div>
        </div>
        {deletedExpenses.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3">
              <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelectedIds(allSelected ? [] : deletedExpenses.map((expense) => expense.id))}
                aria-label="Select all transactions"
                className="h-5 w-5 rounded border-zinc-300 accent-emerald-600"
              />
              Select all
              </label>
              {activeSelectedIds.length > 0 && (
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 sm:hidden">
                  {activeSelectedIds.length} selected
                </span>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {activeSelectedIds.length > 0 && (
                <button
                  type="button"
                  disabled={isRestoring || isEmptying}
                  onClick={() => void handleRestoreSelected()}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Restoring…</span>
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      <span>Restore selected ({activeSelectedIds.length})</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                disabled={isEmptying}
                onClick={() => setIsEmptyDialogOpen(true)}
                aria-label={isDeletingSelected
                  ? `Delete selected permanently (${activeSelectedIds.length})`
                  : `Empty Trash, all ${deletedExpenses.length} transactions`}
                className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 hover:text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                {isDeletingSelected
                  ? `Delete selected permanently (${activeSelectedIds.length})`
                  : "Empty Trash"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {deletedExpenses.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:border-zinc-800 dark:bg-zinc-800 py-16 text-center shadow-xs">
          <Trash2 className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Trash is empty</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Deleted transactions will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
          {deletedExpenses.map((expense) => (
            <div key={expense.id} className={`flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 px-3 py-4 last:border-b-0 sm:items-center sm:gap-4 sm:px-4 ${
              selectedIds.includes(expense.id) ? "bg-emerald-50/50 dark:bg-emerald-500/10" : ""
            }`}>
              <div className="flex min-w-0 items-center gap-3">
                <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(expense.id)}
                  onChange={() => toggleSelected(expense.id)}
                  aria-label={`Select ${expense.item}`}
                  className="h-5 w-5 shrink-0 rounded border-zinc-300 accent-emerald-600"
                />
                </label>
                <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-sm font-semibold text-zinc-900 dark:text-white">{expense.item}</p>
                <p className="mt-1 break-words text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                  {expense.categoryName} · {expense.date} · {expense.quantity && expense.quantity > 1 ? `Qty ${expense.quantity} · ` : ""}
                  {formatCurrency(expense.amount)}
                </p>
                {expense.deletedAt && (
                  <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    Deleted {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(expense.deletedAt)}
                  </p>
                )}
                </div>
              </div>
              <button
                type="button"
                disabled={restoringId !== null || isRestoring || isEmptying}
                onClick={() => void handleRestore(expense.id)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
              >
                {restoringId === expense.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Restoring…</span>
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={isEmptyDialogOpen}
        title={
          isDeletingSelected
            ? deleteConfirmationCount === 1
              ? "Delete selected transaction?"
              : "Delete selected transactions?"
            : "Empty Trash?"
        }
        message={
          isDeletingSelected
            ? deleteConfirmationCount === 1
              ? "1 selected transaction will be permanently removed. This action cannot be undone."
              : `${deleteConfirmationCount} selected transactions will be permanently removed. This action cannot be undone.`
            : `All ${deleteConfirmationCount} deleted transaction${deleteConfirmationCount === 1 ? "" : "s"} will be permanently removed. This action cannot be undone.`
        }
        confirmLabel={
          isEmptying
            ? isDeletingSelected
              ? "Deleting…"
              : "Emptying Trash…"
            : isDeletingSelected
            ? "Delete Permanently"
            : "Empty Trash"
        }
        confirmDisabled={isEmptying}
        isLoading={isEmptying}
        onCancel={() => {
          if (!isEmptying) setIsEmptyDialogOpen(false)
        }}
        onConfirm={() => void handleEmptyTrash()}
      />
    </div>
  )
}
