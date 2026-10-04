import { useState, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  
} from "lucide-react"
import type { Expense } from "../types/expense"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"
import ConfirmDialog from "../components/ConfirmDialog"
import TransactionActionsMenu from "../components/TransactionActionsMenu"

const formatTimeStr = (timeStr: string) => {
  if (!timeStr) return ""
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return timeStr
  }
  const parts = timeStr.split(":")
  if (parts.length < 2) return timeStr
  
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  if (isNaN(hours)) return timeStr
  
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 
  
  return `${hours}:${minutes} ${ampm}`
}

interface HistoryProps {
  expenses: Expense[]
  trashCount?: number
  onViewExpense?: (expense: Expense) => void
  onDeleteExpense?: (id: string) => void | Promise<void>
  onBulkDeleteExpenses?: (ids: string[]) => Promise<void>
}

export default function History({
  expenses,
  trashCount = 0,
  onViewExpense,
  onDeleteExpense,
  onBulkDeleteExpenses,
}: HistoryProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)

  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get("q") || ""

  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [viewDate, setViewDate] = useState(() => new Date())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [expensePendingDeletion, setExpensePendingDeletion] = useState<Expense | null>(null)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])
  const [bulkDeleteSnapshot, setBulkDeleteSnapshot] = useState<Expense[] | null>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)

  const handleQueryChange = (val: string) => {
    if (val) {
      setSearchParams({ q: val }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const prevMonth = () => {
    const d = new Date(viewDate)
    d.setMonth(d.getMonth() - 1)
    setViewDate(d)
  }

  const nextMonth = () => {
    const d = new Date(viewDate)
    d.setMonth(d.getMonth() + 1)
    setViewDate(d)
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const displayExpenses = expenses

  const visibleCategories = useMemo(() => {
    if (typeFilter === "expense") return EXPENSE_CATEGORIES
    if (typeFilter === "income") return INCOME_CATEGORIES
    return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
  }, [typeFilter])

  const effectiveCategoryId =
    selectedCategoryId !== "all" && visibleCategories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : "all"

  // Filter by query, type, and category
  const filtered = useMemo(() => {
    const selectedMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`
    return displayExpenses.filter((e) => {
      if (!e.date.startsWith(selectedMonth)) return false

      // Type filter
      if (typeFilter === "expense" && e.type === "income") return false
      if (typeFilter === "income" && e.type !== "income") return false

      // Category filter
      if (effectiveCategoryId !== "all" && e.categoryId !== effectiveCategoryId) {
        return false
      }

      // Query filter
      const q = query.toLowerCase().trim()
      if (!q) return true
      return (
        e.item.toLowerCase().includes(q) ||
        e.categoryName.toLowerCase().includes(q) ||
        (e.note && e.note.toLowerCase().includes(q))
      )
    })
  }, [displayExpenses, query, typeFilter, effectiveCategoryId, viewDate])

  const selectableExpenses = filtered
  const selectedExpenses = bulkDeleteSnapshot ?? selectableExpenses.filter((expense) =>
    selectedExpenseIds.includes(expense.id),
  )
  const allFilteredSelected =
    selectableExpenses.length > 0 && selectedExpenses.length === selectableExpenses.length

  // Group by date
  const grouped = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const yesterdayDate = new Date(today.getTime() - 86400000)
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`

    const map: Record<
      string,
      { dateLabel: string; dateStr: string; total: number; items: Expense[] }
    > = {}

    filtered.forEach((e) => {
      let label = e.date
      const parts = e.date.split("-").map(Number)
      if (parts.length === 3) {
        const formattedDate = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })
        if (e.date === todayStr) {
          label = `${formattedDate} (Today)`
        } else if (e.date === yesterdayStr) {
          label = `${formattedDate} (Yesterday)`
        } else {
          label = formattedDate
        }
      }

      if (!map[e.date]) {
        map[e.date] = {
          dateStr: e.date,
          dateLabel: label,
          total: 0,
          items: [],
        }
      }
      map[e.date].items.push(e)
      // If income, calculate total expenses
      if (e.type !== "income") {
        map[e.date].total += e.amount
      }
    })

    return Object.values(map).sort((a, b) => b.dateStr.localeCompare(a.dateStr))
  }, [filtered])

  const { totalExpense, totalIncome } = useMemo(() => {
    let exp = 0
    let inc = 0
    for (const e of filtered) {
      if (e.type === "income") {
        inc += e.amount
      } else {
        exp += e.amount
      }
    }
    return { totalExpense: exp, totalIncome: inc }
  }, [filtered])

  const handleTypeFilterChange = (next: "all" | "expense" | "income") => {
    setTypeFilter(next)
    setSelectedCategoryId("all")
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-8 sm:py-6">

      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-zinc-950 dark:text-white">
            History
          </h1>
          <p className="mt-1 break-words text-[13px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
            {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"} ·{" "}
            {typeFilter === "expense"
              ? `Total spending: ${formatCurrency(totalExpense)}`
              : typeFilter === "income"
              ? `Total income: ${formatCurrency(totalIncome)}`
              : `Spent: ${formatCurrency(totalExpense)} · Received: ${formatCurrency(totalIncome)}`}
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <Link
            to="/trash"
            className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-[13px] font-semibold text-zinc-700 shadow-sm shadow-zinc-900/[0.03] transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Trash2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Trash{trashCount > 0 ? ` · ${trashCount}` : ""}
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-1 text-[15px] font-semibold text-zinc-800 shadow-sm shadow-zinc-900/[0.03] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:min-w-[180px] sm:flex-none">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-0 flex-1 text-center leading-tight sm:min-w-[130px]">{monthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 w-full min-w-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search transactions..."
          aria-label="Search transactions"
          className={`w-full min-w-0 rounded-2xl border border-zinc-200 bg-white py-3.5 pl-11 ${query ? "pr-16" : "pr-4"} text-[15px] leading-5 text-zinc-900 shadow-sm shadow-zinc-900/[0.03] outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 md:hidden`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search expenses, items, categories..."
          aria-label="Search transactions"
          className={`hidden w-full min-w-0 rounded-2xl border border-zinc-200 bg-white py-3.5 pl-11 ${query ? "pr-16" : "pr-4"} text-[15px] leading-5 text-zinc-900 shadow-sm shadow-zinc-900/[0.03] outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 md:block`}
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="absolute right-1 top-1/2 flex h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg px-2 text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Type Filter & Category Filter */}
      <div className="mb-5 min-w-0 space-y-3 sm:mb-6">
        <div className="-mx-4 max-w-full min-w-0 overflow-x-auto overscroll-x-contain px-4 pb-1 no-scrollbar sm:mx-0 sm:w-fit sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="flex w-max min-w-full items-center gap-1 rounded-2xl border border-zinc-200/90 bg-white p-1 text-[13px] shadow-sm shadow-zinc-900/[0.03] dark:border-zinc-800 dark:bg-zinc-900 sm:min-w-0">
            <button
              type="button"
              onClick={() => handleTypeFilterChange("all")}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl px-3 py-1 font-semibold leading-5 transition sm:px-4 ${
                typeFilter === "all"
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange("expense")}
              className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1 font-semibold leading-5 transition sm:px-4 ${
                typeFilter === "expense"
                  ? "bg-rose-50 text-rose-700 shadow-sm dark:bg-rose-500/10 dark:text-rose-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <TrendingDown className="h-4 w-4 shrink-0" />
              Expenses
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange("income")}
              className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1 font-semibold leading-5 transition sm:px-4 ${
                typeFilter === "income"
                  ? "bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              Income
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="-mx-4 flex max-w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 text-[13px] leading-5 no-scrollbar sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 py-1 font-semibold leading-5 transition ${
              selectedCategoryId === "all"
                ? "bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 dark:bg-emerald-500"
                : "border border-zinc-200 bg-white text-zinc-700 shadow-sm shadow-zinc-900/[0.02] hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            All Categories
          </button>
          {visibleCategories.map((c) => {
            const isSelected = selectedCategoryId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(isSelected ? "all" : c.id)}
                className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1 font-medium leading-5 transition ${
                  isSelected
                    ? "bg-emerald-700 font-semibold text-white shadow-sm shadow-emerald-700/20 dark:bg-emerald-500"
                    : "border border-zinc-200 bg-white text-zinc-700 shadow-sm shadow-zinc-900/[0.02] hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <c.component className="h-4 w-4 shrink-0" />
                <span>{c.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {onBulkDeleteExpenses && selectableExpenses.length > 0 && (
        <div className="mb-3 flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={() =>
                  setSelectedExpenseIds((ids) =>
                    allFilteredSelected
                      ? ids.filter((id) => !selectableExpenses.some((expense) => expense.id === id))
                      : [...new Set([...ids, ...selectableExpenses.map((expense) => expense.id)])],
                  )
                }
                className="h-5 w-5 rounded border-zinc-300 accent-emerald-600"
              />
              Select all
            </label>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {selectedExpenses.length > 0
                ? `${selectedExpenses.length} selected`
                : `${selectableExpenses.length} items`}
            </span>
          </div>
          {selectedExpenses.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Move to Trash
            </button>
          )}
        </div>
      )}

      {/* Date Groups List */}
      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            No transactions found matching your filters.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.dateStr}>
              <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
                <span className="min-w-0 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {group.dateLabel}
                </span>
                <span className="shrink-0 whitespace-nowrap text-right text-[13px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(group.total)}
                </span>
              </div>

              {/* Expense List Card */}
              <div className="divide-y divide-zinc-100/90 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.04] dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {group.items.map((expense) => {
                  const isIncome = expense.type === "income"
                  const activeCats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                  const cat = activeCats.find((c) => c.id === expense.categoryId)
                  const Icon = cat?.component
                  const color = cat?.color || (isIncome ? "#10b981" : "#9ca3af")
                  const isMenuOpen = openMenuId === expense.id

                  return (
                    <div
                      key={expense.id}
                      className={`group relative flex min-w-0 items-center justify-between gap-1.5 px-2.5 py-4 sm:gap-2 sm:px-4 ${
                        selectedExpenseIds.includes(expense.id)
                          ? "bg-emerald-50/50 dark:bg-emerald-500/10"
                          : ""
                      }`}
                    >
                      {onViewExpense && (
                        <button
                          type="button"
                          onClick={() => onViewExpense(expense)}
                          aria-label={`View transaction details for ${expense.item}`}
                          className="absolute inset-0 z-0 cursor-pointer rounded-xl text-left transition-colors hover:bg-emerald-50/40 active:bg-emerald-50 dark:hover:bg-emerald-500/5 dark:active:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                        />
                      )}
                      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        {onBulkDeleteExpenses && (
                          <label className="pointer-events-auto relative z-20 flex h-9 w-9 shrink-0 items-center justify-center sm:h-11 sm:w-11">
                          <input
                            type="checkbox"
                            checked={selectedExpenseIds.includes(expense.id)}
                            onChange={() =>
                              setSelectedExpenseIds((ids) =>
                                ids.includes(expense.id)
                                  ? ids.filter((id) => id !== expense.id)
                                  : [...ids, expense.id],
                              )
                            }
                            aria-label={`Select ${expense.item}`}
                            className="h-5 w-5 shrink-0 rounded border-zinc-300 accent-emerald-600"
                          />
                          </label>
                        )}
                        <div
                          className="pointer-events-none relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
                          style={{ backgroundColor: color + "18" }}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0 sm:h-[21px] sm:w-[21px]" style={{ color, strokeWidth: 2.1 }} />}
                        </div>
                        <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                          <div className="flex min-w-0 items-start gap-2">
                            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 sm:line-clamp-2 sm:whitespace-normal sm:break-words">
                              {expense.item}
                            </p>
                            {isIncome && (
                              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50">
                                Income
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[12px] leading-snug text-zinc-500 dark:text-zinc-400 sm:text-[13px]">
                            {expense.categoryName} · {formatTimeStr(expense.time)}
                            {expense.quantity && expense.quantity > 1 ? ` · Qty ${expense.quantity}` : ""}
                          </p>
                          <span
                            aria-label={isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                            className={`mt-1 block whitespace-nowrap text-sm font-semibold leading-tight tracking-tight sm:hidden ${
                              isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="pointer-events-none relative z-10 flex shrink-0 items-center gap-1 sm:gap-3">
                        <span
                          aria-label={isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                          title={isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                          className={`hidden max-w-none whitespace-nowrap text-right text-sm font-semibold leading-tight tracking-tight sm:block ${
                            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                        </span>

                        <div className="pointer-events-auto relative z-20">
                          <TransactionActionsMenu
                            itemName={expense.item}
                            open={isMenuOpen}
                            onOpenChange={(open) => setOpenMenuId(open ? expense.id : null)}
                            onViewDetails={onViewExpense ? () => onViewExpense(expense) : undefined}
                            onDelete={onDeleteExpense ? () => setExpensePendingDeletion(expense) : undefined}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={expensePendingDeletion !== null}
        title="Move transaction to Trash?"
        subject={expensePendingDeletion?.item}
        message="This will move"
        confirmLabel="Move to Trash"
        variant="soft"
        onCancel={() => setExpensePendingDeletion(null)}
        onConfirm={() => {
          if (expensePendingDeletion) {
            void onDeleteExpense?.(expensePendingDeletion.id)
          }
          setExpensePendingDeletion(null)
        }}
      />
      {bulkDeleteError && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {bulkDeleteError}
        </p>
      )}
      <ConfirmDialog
        open={isBulkDeleteDialogOpen}
        title="Move selected transactions to Trash?"
        message={`This will move ${selectedExpenses.length} selected transactions`}
        confirmLabel={isBulkDeleting ? "Moving..." : "Move to Trash"}
        confirmDisabled={isBulkDeleting}
        variant="soft"
        onCancel={() => {
          if (!isBulkDeleting) {
            setIsBulkDeleteDialogOpen(false)
            setBulkDeleteSnapshot(null)
          }
        }}
        onConfirm={() => {
          if (!onBulkDeleteExpenses || selectedExpenses.length === 0 || isBulkDeleting) return
          setBulkDeleteError(null)
          setBulkDeleteSnapshot(selectedExpenses)
          setIsBulkDeleting(true)
          void onBulkDeleteExpenses(selectedExpenses.map((expense) => expense.id))
            .then(() => {
              setSelectedExpenseIds((ids) =>
                ids.filter((id) => !selectedExpenses.some((expense) => expense.id === id)),
              )
              setIsBulkDeleteDialogOpen(false)
            })
            .catch(() => setBulkDeleteError("Could not move the selected transactions to Trash. Please try again."))
            .finally(() => {
              setBulkDeleteSnapshot(null)
              setIsBulkDeleting(false)
            })
        }}
      />
    </div>
  )
}
