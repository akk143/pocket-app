import { useState, useMemo } from "react"
import {
  Repeat,
  Plus,
  Trash2,
  
  Check,
  X,
  
  Zap,
  TrendingDown,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import type { RecurringTransaction, TransactionType, RecurringFrequency } from "../types/expense"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency, convertToBaseVND, SUPPORTED_CURRENCIES } from "../lib/currency"
import ConfirmDialog from "../components/ConfirmDialog"
import { getLocalDateString } from "../lib/recurring"

interface RecurringProps {
  recurringList: RecurringTransaction[]
  onAddRecurring: (item: Omit<RecurringTransaction, "id">) => Promise<void>
  onToggleActive: (id: string, active: boolean) => Promise<void>
  onDeleteRecurring: (id: string) => Promise<void>
  onTriggerNow: (item: RecurringTransaction) => Promise<void>
}

export default function Recurring({
  recurringList,
  onAddRecurring,
  onToggleActive,
  onDeleteRecurring,
  onTriggerNow,
}: RecurringProps) {
  const { currency, rates } = useCurrency()
  const activeCurrencyConfig = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0]
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [recurringPendingDeletion, setRecurringPendingDeletion] = useState<RecurringTransaction | null>(null)

  // Form states for new recurring rule
  const [type, setType] = useState<TransactionType>("expense")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("rent")
  const [item, setItem] = useState("")
  const [note, setNote] = useState("")
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly")
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [firstDueDate, setFirstDueDate] = useState(() => getLocalDateString())
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const displayList = recurringList

  // Computed commitments
  const totalMonthlyExpenses = useMemo(() => {
    return displayList
      .filter((r) => r.active && r.type !== "income")
      .reduce((sum, r) => {
        if (r.frequency === "daily") return sum + r.amount * 30
        if (r.frequency === "weekly") return sum + r.amount * 4
        return sum + r.amount
      }, 0)
  }, [displayList])

  const totalMonthlyIncome = useMemo(() => {
    return displayList
      .filter((r) => r.active && r.type === "income")
      .reduce((sum, r) => {
        if (r.frequency === "daily") return sum + r.amount * 30
        if (r.frequency === "weekly") return sum + r.amount * 4
        return sum + r.amount
      }, 0)
  }, [displayList])

  const filteredList = useMemo(() => {
    return displayList.filter((r) => {
      if (filterType === "expense") return r.type !== "income"
      if (filterType === "income") return r.type === "income"
      return true
    })
  }, [displayList, filterType])

  const handleOpenAddModal = (defaultType: TransactionType = "expense") => {
    setFormError(null)
    setType(defaultType)
    setAmount("")
    const cats = defaultType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategoryId(cats[0].id)
    setItem("")
    setNote("")
    setFrequency("monthly")
    setDayOfMonth(1)
    setDayOfWeek(1)
    setFirstDueDate(getLocalDateString())
    setIsModalOpen(true)
  }

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    const cats = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategoryId(cats[0].id)
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount.replace(/,/g, ""))
    if (!numericAmount || numericAmount <= 0 || !item.trim()) {
      setFormError("Enter a valid amount and schedule name.")
      return
    }

    const baseAmount = convertToBaseVND(numericAmount, currency, rates)
    const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const selectedCat = cats.find((c) => c.id === categoryId)

    setIsSaving(true)
    setFormError(null)
    try {
      await onAddRecurring({
        type,
        amount: baseAmount,
        categoryId,
        categoryName: selectedCat?.name || "Other",
        item: item.trim(),
        note: note.trim(),
        frequency,
        ...(frequency === "monthly" ? { dayOfMonth } : {}),
        ...(frequency === "weekly" ? { dayOfWeek } : {}),
        nextDueDate: firstDueDate,
        active: true,
        createdAt: Date.now(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      })
      setIsModalOpen(false)
    } catch {
      setFormError("Could not save this schedule. Check your connection and try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleTrigger = async (r: RecurringTransaction) => {
    setTriggeringId(r.id)
    try {
      await onTriggerNow(r)
    } finally {
      setTriggeringId(null)
    }
  }

  const handleToggle = async (r: RecurringTransaction) => {
    setUpdatingId(r.id)
    setActionError(null)
    try {
      await onToggleActive(r.id, !r.active)
    } catch {
      setActionError(`Could not ${r.active ? "pause" : "resume"} "${r.item}". Please try again.`)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!recurringPendingDeletion || deletingId) return

    const itemToDelete = recurringPendingDeletion
    setDeletingId(itemToDelete.id)
    setActionError(null)
    try {
      await onDeleteRecurring(itemToDelete.id)
      setRecurringPendingDeletion(null)
    } catch {
      setActionError(`Could not delete "${itemToDelete.item}". Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-8 sm:py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Repeat className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
                Recurring Transactions
              </h1>
              <p className="text-xs text-zinc-400">
                Automate fixed expenses and scheduled earnings
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 sm:min-h-0 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Recurring Schedule
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-3 sm:gap-4 sm:grid-cols-3">
        {/* Recurring Expenses */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Monthly Fixed Expenses
            </span>
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
            {convertAndFormatCurrency(totalMonthlyExpenses, currency, rates)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Rent, utilities, subscriptions & bills
          </p>
        </div>

        {/* Recurring Income */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Monthly Fixed Income
            </span>
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight text-emerald-600 sm:text-2xl dark:text-emerald-400">
            +{convertAndFormatCurrency(totalMonthlyIncome, currency, rates)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Salary, client retainers & dividends
          </p>
        </div>

        {/* Net Monthly Baseline */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Net Baseline Cashflow
            </span>
          </div>
          <p
            className={`mt-3 text-xl font-bold tracking-tight sm:text-2xl ${
              totalMonthlyIncome >= totalMonthlyExpenses
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {totalMonthlyIncome >= totalMonthlyExpenses ? "+" : "-"}
            {convertAndFormatCurrency(Math.abs(totalMonthlyIncome - totalMonthlyExpenses), currency, rates)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Guaranteed buffer before discretionary spend
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      {actionError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400">
          {actionError}
        </p>
      )}
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              filterType === "all"
                ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            All ({displayList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("expense")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-semibold transition ${
              filterType === "expense"
                ? "bg-red-50 text-red-600 font-bold shadow-xs border border-red-200/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setFilterType("income")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-semibold transition ${
              filterType === "income"
                ? "bg-emerald-50 text-emerald-700 font-bold shadow-xs border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* List of Recurring Items */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center">
            <Repeat className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No recurring transactions
            </p>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              Add your regular rent, bills, or salary to auto-track them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredList.map((r) => {
              const isIncome = r.type === "income"
              const activeCats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
              const cat = activeCats.find((c) => c.id === r.categoryId)
              const Icon = cat?.component || Repeat
              const color = cat?.color || (isIncome ? "#10b981" : "#9ca3af")
              const isTriggering = triggeringId === r.id
              const isUpdating = updatingId === r.id

              return (
                <div
                  key={r.id}
                  className={`flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                    r.active ? "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40" : "bg-zinc-50/40 opacity-70 dark:bg-zinc-800/20"
                  }`}
                >
                  {/* Left Side: Icon & Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: color + "18" }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="line-clamp-2 min-w-0 break-words font-bold text-sm text-zinc-900 dark:text-white">
                          {r.item}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700/50"
                          }`}
                        >
                          {r.categoryName}
                        </span>
                        <span className="rounded-md bg-blue-50 border border-blue-200/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          {r.frequency === "monthly"
                            ? `Monthly (Day ${r.dayOfMonth || 1})`
                            : r.frequency === "weekly"
                            ? "Weekly"
                            : "Daily"}
                        </span>
                        {!r.active && (
                          <span className="rounded-md bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                            Paused
                          </span>
                        )}
                      </div>

                      <p className="min-w-0 break-words text-[11px] sm:text-xs text-zinc-500 line-clamp-2 dark:text-zinc-400">
                        {r.note || "Scheduled transaction"} <span className="mx-1.5 hidden sm:inline">·</span><br className="sm:hidden" />
                        <span className="font-semibold text-zinc-700 mt-0.5 sm:mt-0 inline-block dark:text-zinc-300">
                          Next due: {r.nextDueDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Amount & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between sm:block sm:text-right w-full sm:w-auto items-center">
                       <span className="text-[11px] font-medium text-zinc-500 sm:hidden dark:text-zinc-400">Amount:</span>
                       <div>
                         <p
                           className={`break-words text-right text-sm font-bold sm:text-[15px] ${
                             isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                           }`}
                         >
                           {isIncome ? "+" : ""}{convertAndFormatCurrency(r.amount, currency, rates)}
                         </p>
                         <span className="text-[10px] text-zinc-400 capitalize hidden sm:block">
                           Per {r.frequency.replace("ly", "")}
                         </span>
                       </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => void handleToggle(r)}
                        disabled={isUpdating}
                        className={`flex min-h-11 flex-1 items-center justify-center sm:min-h-0 sm:flex-none rounded-xl px-3 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:py-2 ${
                          r.active
                            ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-500/20"
                        }`}
                        title={r.active ? "Pause schedule" : "Resume schedule"}
                      >
                        {isUpdating ? "Saving..." : r.active ? "Pause" : "Resume"}
                      </button>

                      {/* Post Now button */}
                      <button
                        type="button"
                        onClick={() => handleTrigger(r)}
                        disabled={isTriggering}
                        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50 shadow-2xs sm:min-h-0 sm:flex-none sm:px-3 sm:py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 dark:hover:border-emerald-900/50"
                        title="Record this transaction immediately for today"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>{isTriggering ? "Posting..." : "Post Now"}</span>
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          setRecurringPendingDeletion(r)
                        }}
                        aria-label={`Delete ${r.item} schedule`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-400 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900/50 sm:h-9 sm:w-9"
                        title="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={recurringPendingDeletion !== null}
        title="Delete recurring schedule?"
        message={recurringPendingDeletion ? `Are you sure you want to delete "${recurringPendingDeletion.item}"? This action cannot be undone.` : ""}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        onCancel={() => {
          if (!deletingId) setRecurringPendingDeletion(null)
        }}
        onConfirm={() => void handleConfirmDelete()}
      />

      {/* Add Recurring Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-x-0 top-[var(--keyboard-viewport-offset)] z-50 flex h-[var(--keyboard-viewport-height)] items-center justify-center overflow-y-auto overscroll-contain bg-black/50 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xs dark:bg-black/70 sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex max-h-[calc(var(--keyboard-viewport-height)-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-zinc-800 dark:bg-zinc-900 sm:max-h-[calc(var(--keyboard-viewport-height)-2rem)]">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-6">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  New Recurring Schedule
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close recurring schedule form"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:h-9 md:w-9"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              {/* Type Switcher */}
              <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => handleTypeChange("expense")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    type === "expense"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("income")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    type === "income"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode={currency === "VND" ? "numeric" : "decimal"}
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value
                      if (currency === "VND") {
                        const clean = val.replace(/\D/g, "")
                        setAmount(clean ? new Intl.NumberFormat("vi-VN").format(Number(clean)) : "")
                      } else {
                        if (val === "" || /^\d*\.?\d*$/.test(val)) {
                          setAmount(val)
                        }
                      }
                    }}
                    placeholder={currency === "VND" ? "5,000,000" : "100"}
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white pr-8 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                    {activeCurrencyConfig.symbol}
                  </span>
                </div>
                {currency !== "VND" && Number(amount) > 0 && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    ≈ {new Intl.NumberFormat("vi-VN").format(convertToBaseVND(Number(amount), currency, rates))} ₫ (base)
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700"
                >
                  {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Description / Title
                </label>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder={type === "income" ? "e.g. Monthly Salary" : "e.g. Apartment Rent, Netflix"}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700"
                />
              </div>

              {/* Frequency & Due Day */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                {frequency === "monthly" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Day of Month
                    </label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Day {d}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : frequency === "weekly" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Day of Week
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Starts on
                    </label>
                    <input
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Note <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700"
                />
              </div>

              {formError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400">
                  {formError}
                </p>
              )}

              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] dark:border-zinc-800 sm:px-6 sm:pb-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
