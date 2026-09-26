import { useState, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Pencil,
  MoreVertical,
  TrendingDown,
  TrendingUp,
  
} from "lucide-react"
import type { Expense } from "../types/expense"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"
import ConfirmDialog from "../components/ConfirmDialog"

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
  onEditExpense?: (expense: Expense) => void
  onDeleteExpense?: (id: string) => void | Promise<void>
}

export default function History({
  expenses,
  trashCount = 0,
  onEditExpense,
  onDeleteExpense,
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

  const displayExpenses = useMemo(() => {
    if (expenses.length > 0) return expenses

    return [
      {
        id: "hist-1",
        type: "expense",
        amount: 25000,
        categoryId: "drinks",
        categoryName: "Drinks",
        item: "Vietnamese Coffee",
        note: "",
        date: "2026-09-07",
        time: "8:30 AM",
        createdAt: 1000,
      },
      {
        id: "hist-2",
        type: "expense",
        amount: 100000,
        categoryId: "food",
        categoryName: "Food",
        item: "Lunch",
        note: "",
        date: "2026-09-07",
        time: "1:00 PM",
        createdAt: 999,
      },
      {
        id: "hist-3",
        type: "expense",
        amount: 30000,
        categoryId: "transportation",
        categoryName: "Transportation",
        item: "Grab",
        note: "",
        date: "2026-09-07",
        time: "12:15 PM",
        createdAt: 998,
      },
      {
        id: "hist-4",
        type: "expense",
        amount: 80000,
        categoryId: "food",
        categoryName: "Food",
        item: "Dinner",
        note: "",
        date: "2026-09-06",
        time: "7:30 PM",
        createdAt: 900,
      },
      {
        id: "hist-5",
        type: "expense",
        amount: 25000,
        categoryId: "drinks",
        categoryName: "Drinks",
        item: "Coffee",
        note: "",
        date: "2026-09-06",
        time: "5:00 PM",
        createdAt: 899,
      },
      {
        id: "hist-6",
        type: "expense",
        amount: 35000,
        categoryId: "transportation",
        categoryName: "Transportation",
        item: "Grab",
        note: "",
        date: "2026-09-06",
        time: "3:20 PM",
        createdAt: 898,
      },
      {
        id: "hist-7",
        type: "expense",
        amount: 120000,
        categoryId: "shopping",
        categoryName: "Shopping",
        item: "Groceries",
        note: "",
        date: "2026-09-05",
        time: "6:10 PM",
        createdAt: 800,
      },
    ] as Expense[]
  }, [expenses])

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

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<
      string,
      { dateLabel: string; dateStr: string; total: number; items: Expense[] }
    > = {}

    filtered.forEach((e) => {
      let label = e.date
      if (e.date === "2026-09-07") {
        label = "September 7 (Today)"
      } else if (e.date === "2026-09-06") {
        label = "September 6"
      } else if (e.date === "2026-09-05") {
        label = "September 5"
      } else {
        const parts = e.date.split("-").map(Number)
        if (parts.length === 3) {
          label = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })
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
    <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            History
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
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
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
            Trash{trashCount > 0 ? ` · ${trashCount}` : ""}
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-1 text-sm font-semibold text-zinc-700 shadow-2xs sm:min-w-[180px] sm:flex-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-0 flex-1 text-center sm:min-w-[130px]">{monthLabel}</span>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search expenses, items, or categories..."
          className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Type Filter & Category Filter */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => handleTypeFilterChange("all")}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                typeFilter === "all"
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange("expense")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 font-semibold transition ${
                typeFilter === "expense"
                  ? "bg-red-50 text-red-600 font-bold shadow-xs border border-red-200/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <TrendingDown className="h-3 w-3" />
              Expenses
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange("income")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 font-semibold transition ${
                typeFilter === "income"
                  ? "bg-emerald-50 text-emerald-700 font-bold shadow-xs border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Income
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="-mx-5 flex items-center gap-1.5 overflow-x-auto px-5 pb-1 text-xs no-scrollbar sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${
              selectedCategoryId === "all"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${
                  isSelected
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date Groups List */}
      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            No transactions found matching your filters.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.dateStr}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {group.dateLabel}
                </span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(group.total)}
                </span>
              </div>

              {/* Expense List Card */}
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/90 bg-white shadow-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
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
                      className="group relative flex items-center justify-between gap-2 px-3 py-3.5 transition hover:bg-zinc-50/50 sm:px-4 dark:hover:bg-zinc-800/30"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: color + "18" }}
                        >
                          {Icon && <Icon className="h-5 w-5" style={{ color }} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {expense.item}
                            </p>
                            {isIncome && (
                              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50">
                                Income
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {expense.categoryName} · {formatTimeStr(expense.time)}
                            {expense.quantity && expense.quantity > 1 ? ` · Qty ${expense.quantity}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                        <span
                          className={`whitespace-nowrap text-sm font-semibold ${
                            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                        </span>

                        {/* Start Menu Buttons */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(isMenuOpen ? null : expense.id)}
                            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg z-30 dark:border-zinc-800 dark:bg-zinc-900">
                              {onEditExpense && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    onEditExpense(expense)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                  <Pencil className="h-3 w-3 text-zinc-400" />
                                  Edit
                                </button>
                              )}
                              {onDeleteExpense && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setExpensePendingDeletion(expense)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {/* End Menu Buttons */}
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
    </div>
  )
}
