import { useState, useMemo } from "react"
import { ArrowLeft, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { EXPENSE_CATEGORIES } from "../constants/categories"
import type { Expense } from "../types/expense"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"

interface CategoriesProps {
  expenses: Expense[]
  onSelectCategory: (categoryId: string) => void
  onAddCategory?: () => void
}

const formatTransactionDateTime = (date: string, time: string) => {
  if (typeof date !== "string" || typeof time !== "string") {
    return "Date unavailable"
  }

  const dateParts = date.split("-").map(Number)
  const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)

  if (
    dateParts.length !== 3 ||
    dateParts.some((part) => !Number.isFinite(part)) ||
    !timeMatch
  ) {
    return `${date} · ${time}`
  }

  const [, hourText, minuteText, meridiem] = timeMatch
  let hours = Number(hourText)
  const minutes = Number(minuteText)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) {
    return `${date} · ${time}`
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return `${date} · ${time}`
    }
    if (meridiem.toUpperCase() === "PM" && hours !== 12) hours += 12
    if (meridiem.toUpperCase() === "AM" && hours === 12) hours = 0
  } else if (hours > 23) {
    return `${date} · ${time}`
  }

  const value = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes)

  if (Number.isNaN(value.getTime())) {
    return `${date} · ${time}`
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(value)
}

export default function Categories({ expenses, onSelectCategory, onAddCategory }: CategoriesProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)

  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [categoryPage, setCategoryPage] = useState(1)
  const [transactionPage, setTransactionPage] = useState(1)


  const now = new Date()

  const categoryStats = useMemo(() => {

    const stats: Record<string, { total: number; count: number }> = {}

    expenses
      .filter((e) => {
        if (e.type === "income") return false
        const [y, m] = e.date.split("-").map(Number)
        return y === now.getFullYear() && m === now.getMonth() + 1
      })
      .forEach((e) => {
        if (!stats[e.categoryId]) {
          stats[e.categoryId] = { total: 0, count: 0 }
        }
        stats[e.categoryId].total += e.amount
        stats[e.categoryId].count += 1
      })

    return stats
  }, [expenses])

  const filtered = EXPENSE_CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const categoriesPerPage = 6
  const pageCount = Math.max(1, Math.ceil(filtered.length / categoriesPerPage))
  const currentPage = Math.min(categoryPage, pageCount)
  const visibleCategories = filtered.slice(
    (currentPage - 1) * categoriesPerPage,
    currentPage * categoriesPerPage
  )

  const selectedCategory = EXPENSE_CATEGORIES.find((c) => c.id === selectedId)

  const categoryTransactions = useMemo(() => {
    if (!selectedId) return []
    return expenses.filter((e) => e.categoryId === selectedId && e.type !== "income")
  }, [expenses, selectedId])
  const transactionsPerPage = 3
  const transactionPageCount = Math.max(
    1,
    Math.ceil(categoryTransactions.length / transactionsPerPage)
  )
  const currentTransactionPage = Math.min(transactionPage, transactionPageCount)
  const visibleTransactions = categoryTransactions.slice(
    (currentTransactionPage - 1) * transactionsPerPage,
    currentTransactionPage * transactionsPerPage
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 lg:px-8 lg:py-6">
      <div className="mb-4 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:border-zinc-800 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition hover:bg-zinc-50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 lg:h-9 lg:w-9 lg:rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white lg:text-xl">
              Categories
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Spending breakdown by category</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddCategory ? onAddCategory() : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 lg:w-auto lg:py-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 lg:mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCategoryPage(1)
          }}
          placeholder="Search categories..."
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 lg:rounded-2xl lg:py-3 lg:pl-10"
        />
      </div>

      {/* Grid Categories */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {visibleCategories.map((cat) => {
          const Icon = cat.component
          const isSelected = selectedId === cat.id
          const stat = categoryStats[cat.id] || { total: 0, count: 0 }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedId(isSelected ? null : cat.id)
                setTransactionPage(1)
              }}
              className={`flex min-h-[92px] flex-col items-start rounded-xl border p-2.5 text-left transition-all lg:min-h-0 lg:rounded-2xl lg:p-4 ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10 dark:border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:border-zinc-800 dark:bg-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
              }`}
            >
              <div className="mb-1.5 flex w-full items-center justify-between lg:mb-3">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg lg:h-10 lg:w-10 lg:rounded-xl ${cat.softBg}`}
                >
                  <Icon className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: cat.color }} />
                </div>
                {stat.count > 0 && (
                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:text-zinc-400 lg:px-2 lg:text-[10px]">
                    {stat.count} {stat.count === 1 ? "item" : "items"}
                  </span>
                )}
              </div>

              <span className="w-full truncate text-[13px] font-semibold text-zinc-900 dark:text-white lg:text-sm">
                {cat.name}
              </span>

              <p className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 lg:mt-1 lg:text-xs">
                {stat.total > 0 ? formatCurrency(stat.total) : formatCurrency(0)}
              </p>
            </button>
          )
        })}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCategoryPage((page) => Math.max(1, page - 1))}
            aria-label="Previous category page"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:border-zinc-800 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 dark:border-zinc-800 disabled:hover:bg-white disabled:hover:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:border-zinc-800 dark:bg-zinc-800 p-1 shadow-xs">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                aria-label={`Go to category page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                onClick={() => setCategoryPage(page)}
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition ${
                  page === currentPage
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setCategoryPage((page) => Math.min(pageCount, page + 1))}
            aria-label="Next category page"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:border-zinc-800 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 dark:border-zinc-800 disabled:hover:bg-white disabled:hover:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Category Transactions Section */}
      {selectedCategory && (
        <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3.5 shadow-xs lg:mt-8 lg:p-5">
          <div className="flex flex-col gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3 lg:flex-row lg:items-center lg:justify-between lg:pb-4">
            <div className="flex items-center gap-2.5 lg:gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg lg:h-9 lg:w-9 lg:rounded-xl ${selectedCategory.softBg}`}
              >
                {(() => {
                  const Icon = selectedCategory.component
                  return <Icon className="h-5 w-5" style={{ color: selectedCategory.color }} />
                })()}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {selectedCategory.name} Transactions
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {categoryTransactions.length} recorded {categoryTransactions.length === 1 ? "transaction" : "transactions"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectCategory(selectedCategory.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 lg:w-auto lg:py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add in {selectedCategory.name}
            </button>
          </div>

          <div className="mt-3 space-y-2 lg:mt-4">
            {categoryTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No transactions recorded in {selectedCategory.name} yet.
              </div>
            ) : (
              visibleTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-7 w-1 shrink-0 rounded-full bg-emerald-400" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-white">{tx.item}</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatTransactionDateTime(tx.date, tx.time)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-white">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>

          {transactionPageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <button
                type="button"
                aria-label="Previous transaction page"
                disabled={currentTransactionPage === 1}
                onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 dark:border-zinc-800 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                {currentTransactionPage} / {transactionPageCount}
              </span>
              <button
                type="button"
                aria-label="Next transaction page"
                disabled={currentTransactionPage === transactionPageCount}
                onClick={() =>
                  setTransactionPage((page) => Math.min(transactionPageCount, page + 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 dark:border-zinc-800 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
