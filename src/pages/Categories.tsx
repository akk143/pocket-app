import { useState, useMemo } from "react"
import { usePaginatedContent } from "../hooks/usePaginatedContent"
import {
  ArrowLeft,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Tag,
  TrendingDown,
  TrendingUp,
  Archive,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { getCombinedCategories, findCategory } from "../constants/categories"
import type { CategoryDef, CustomCategory } from "../constants/categories"
import type { Expense } from "../types/expense"
import type { CreateCategoryPayload, UpdateCategoryPayload } from "../types/category"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"
import CategoryModal from "../components/CategoryModal"

interface CategoriesProps {
  expenses: Expense[]
  customCategories?: CustomCategory[]
  onSelectCategory: (categoryId: string) => void
  onAddCategory?: (payload: CreateCategoryPayload) => Promise<CustomCategory | void>
  onUpdateCategory?: (id: string, payload: UpdateCategoryPayload) => Promise<CustomCategory | void>
  onDeleteCategory?: (id: string) => Promise<void>
  onViewExpense?: (expense: Expense) => void
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

export default function Categories({
  expenses,
  customCategories = [],
  onSelectCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onViewExpense,
}: CategoriesProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)

  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [categoryPage, setCategoryPage] = useState(1)
  const [transactionPage, setTransactionPage] = useState(1)

  // Type & Status filters
  const [typeTab, setTypeTab] = useState<"expense" | "income">("expense")
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "archived">("active")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editingCategory, setEditingCategory] = useState<CategoryDef | null>(null)

  // All combined categories (including archived)
  const combined = useMemo(
    () => getCombinedCategories(customCategories, { includeArchived: true }),
    [customCategories],
  )

  const activeTypeList = typeTab === "expense" ? combined.expense : combined.income

  // Category statistics for the current month
  const categoryStats = useMemo(() => {
    const now = new Date()
    const stats: Record<string, { total: number; count: number }> = {}

    expenses
      .filter((e) => {
        const isMatch = typeTab === "expense" ? e.type !== "income" : e.type === "income"
        if (!isMatch) return false
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
  }, [expenses, typeTab])

  // Filter categories by type, status, and search query
  const filtered = useMemo(() => {
    return activeTypeList.filter((c) => {
      // Status filter
      if (statusFilter === "active" && c.archived) return false
      if (statusFilter === "archived" && !c.archived) return false

      // Search query
      if (!search.trim()) return true
      return c.name.toLowerCase().includes(search.toLowerCase().trim())
    })
  }, [activeTypeList, statusFilter, search])

  const categoriesPerPage = 8
  const pageCount = Math.max(1, Math.ceil(filtered.length / categoriesPerPage))
  const currentPage = Math.min(categoryPage, pageCount)
  const visibleCategories = filtered.slice(
    (currentPage - 1) * categoriesPerPage,
    currentPage * categoriesPerPage,
  )

  const selectedCategory = selectedId
    ? findCategory(selectedId, customCategories)
    : null

  const categoryTransactions = useMemo(() => {
    if (!selectedId) return []
    return expenses.filter((e) => {
      const isTypeMatch = typeTab === "expense" ? e.type !== "income" : e.type === "income"
      return e.categoryId === selectedId && isTypeMatch
    })
  }, [expenses, selectedId, typeTab])

  const transactionsPerPage = 3
  const transactionPageCount = Math.max(
    1,
    Math.ceil(categoryTransactions.length / transactionsPerPage),
  )
  const currentTransactionPage = Math.min(transactionPage, transactionPageCount)
  const visibleTransactions = categoryTransactions.slice(
    (currentTransactionPage - 1) * transactionsPerPage,
    currentTransactionPage * transactionsPerPage,
  )

  const { contentKey: catGridKey, animClass: catGridAnim } = usePaginatedContent(currentPage)
  const { contentKey: catTxKey, animClass: catTxAnim } = usePaginatedContent(currentTransactionPage)

  const handleOpenAddModal = () => {
    setModalMode("add")
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (cat: CategoryDef, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setModalMode("edit")
    setEditingCategory(cat)
    setIsModalOpen(true)
  }

  const handleSaveCategory = async (payload: CreateCategoryPayload | UpdateCategoryPayload) => {
    if (modalMode === "add") {
      if (!onAddCategory) {
        throw new Error("Cannot add category: feature unavailable.")
      }
      await onAddCategory(payload as CreateCategoryPayload)
    } else if (editingCategory) {
      if (!onUpdateCategory) {
        throw new Error("Cannot update category: feature unavailable.")
      }
      await onUpdateCategory(editingCategory.id, payload as UpdateCategoryPayload)
    }
  }

  const handleArchiveToggle = async (categoryId: string, archive: boolean) => {
    if (!onUpdateCategory) return
    await onUpdateCategory(categoryId, { archived: archive })
  }

  const handleDelete = async (categoryId: string) => {
    if (!onDeleteCategory) return
    await onDeleteCategory(categoryId)
    if (selectedId === categoryId) {
      setSelectedId(null)
    }
  }

  // Count active vs archived for badges
  const archivedCount = activeTypeList.filter((c) => c.archived).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 lg:px-8 lg:py-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:h-9 lg:w-9 lg:rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white lg:text-xl">
              Categories
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Manage built-in and custom categories
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 lg:w-auto lg:py-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Tabs: Expenses vs Income */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-zinc-200/80 bg-zinc-100/70 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => {
              setTypeTab("expense")
              setSelectedId(null)
              setCategoryPage(1)
              setTransactionPage(1)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              typeTab === "expense"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            <span>Expenses</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeTab("income")
              setSelectedId(null)
              setCategoryPage(1)
              setTransactionPage(1)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              typeTab === "income"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-800 dark:text-emerald-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>Income</span>
          </button>
        </div>

        {/* Status Filter (Active / All / Archived) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("active")
              setCategoryPage(1)
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "active"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all")
              setCategoryPage(1)
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("archived")
                setCategoryPage(1)
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === "archived"
                  ? "bg-amber-600 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Archive className="h-3 w-3" />
              <span>Archived ({archivedCount})</span>
            </button>
          )}
        </div>
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
          placeholder={`Search ${typeTab} categories...`}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 lg:rounded-2xl lg:py-3 lg:pl-10"
        />
      </div>

      {/* Grid Categories */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Search className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No categories found
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {search.trim()
                ? `No results for "${search}". Try a different keyword.`
                : statusFilter === "archived"
                ? "No archived categories found."
                : "No categories available."}
            </p>
          </div>
        </div>
      ) : (
        <div key={catGridKey} className={`grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3 ${catGridAnim}`}>
          {visibleCategories.map((cat) => {
            const Icon = cat.component || Tag
            const isSelected = selectedId === cat.id
            const stat = categoryStats[cat.id] || { total: 0, count: 0 }
            const isCustom = cat.isCustom

            return (
              <div
                key={cat.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedId(isSelected ? null : cat.id)
                  setTransactionPage(1)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedId(isSelected ? null : cat.id)
                    setTransactionPage(1)
                  }
                }}
                className={`group relative flex min-h-[104px] cursor-pointer flex-col justify-between rounded-xl border p-2.5 text-left transition-all lg:min-h-[116px] lg:rounded-2xl lg:p-4 ${
                  cat.archived
                    ? "opacity-60 bg-zinc-50/70 border-dashed border-zinc-300 dark:bg-zinc-900/40 dark:border-zinc-700"
                    : isSelected
                    ? "border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-500/10"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
                }`}
              >
                {/* Top Row: Icon & Badges */}
                <div className="mb-2 flex w-full items-start justify-between">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg lg:h-10 lg:w-10 lg:rounded-xl"
                    style={{ backgroundColor: `${cat.color || "#10b981"}18` }}
                  >
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: cat.color }} />
                  </div>

                  <div className="flex items-center gap-1">
                    {cat.archived && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Archived
                      </span>
                    )}
                    {isCustom && !cat.archived && (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        Custom
                      </span>
                    )}

                    {/* Edit button for custom categories */}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(cat, e)}
                        aria-label={`Edit ${cat.name}`}
                        title="Edit category"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 opacity-80 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom: Name & Month Total */}
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="line-clamp-1 break-words text-[13px] font-semibold text-zinc-900 dark:text-white lg:text-sm">
                      {cat.name}
                    </span>
                    {stat.count > 0 && (
                      <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                        {stat.count} {stat.count === 1 ? "tx" : "txs"}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 lg:mt-1 lg:text-xs">
                    {stat.total > 0 ? formatCurrency(stat.total) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCategoryPage((page) => Math.max(1, page - 1))}
            aria-label="Previous category page"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 disabled:hover:bg-white disabled:hover:text-zinc-500 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 lg:h-8 lg:w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-800">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                aria-label={`Go to category page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                onClick={() => setCategoryPage(page)}
                className={`flex h-10 min-w-10 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition ${
                  page === currentPage
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 disabled:hover:bg-white disabled:hover:text-zinc-500 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 lg:h-8 lg:w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Category Transactions Section */}
      {selectedCategory && (
        <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:mt-8 lg:p-5">
          <div className="flex flex-col gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between lg:pb-4">
            <div className="flex items-center gap-2.5 lg:gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg lg:h-9 lg:w-9 lg:rounded-xl"
                style={{ backgroundColor: `${selectedCategory.color || "#10b981"}1a` }}
              >
                {(() => {
                  const Icon = selectedCategory.component || Tag
                  return <Icon className="h-5 w-5" style={{ color: selectedCategory.color }} />
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {selectedCategory.name} Transactions
                  </h2>
                  {selectedCategory.isCustom && (
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.2 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Custom
                    </span>
                  )}
                  {selectedCategory.archived && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Archived
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {categoryTransactions.length} recorded{" "}
                  {categoryTransactions.length === 1 ? "transaction" : "transactions"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedCategory.isCustom && (
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedCategory)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 lg:flex-initial lg:py-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Category</span>
                </button>
              )}

              {!selectedCategory.archived && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(selectedCategory.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 lg:flex-initial lg:py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add in {selectedCategory.name}</span>
                </button>
              )}
            </div>
          </div>

          <div key={catTxKey} className={`mt-3 space-y-2 lg:mt-4 ${catTxAnim}`}>
            {categoryTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No transactions recorded in {selectedCategory.name} yet.
              </div>
            ) : (
              visibleTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="relative flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-xs transition hover:border-zinc-200 hover:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {onViewExpense && (
                    <button
                      type="button"
                      onClick={() => onViewExpense(tx)}
                      aria-label={`View transaction details for ${tx.item}`}
                      className="absolute inset-0 z-0 cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                    />
                  )}
                  <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-7 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedCategory.color || "#10b981" }}
                    />
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words font-medium text-zinc-900 dark:text-white">
                        {tx.item}
                      </p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatTransactionDateTime(tx.date, tx.time)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`pointer-events-none relative z-10 max-w-[45%] break-words text-right text-xs font-semibold leading-tight sm:max-w-none sm:whitespace-nowrap sm:text-sm ${
                      tx.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {tx.type === "income" ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>

          {transactionPageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                aria-label="Previous transaction page"
                disabled={currentTransactionPage === 1}
                onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 disabled:hover:bg-transparent disabled:hover:text-zinc-500 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {currentTransactionPage} / {transactionPageCount}
              </span>
              <button
                type="button"
                aria-label="Next transaction page"
                disabled={currentTransactionPage === transactionPageCount}
                onClick={() =>
                  setTransactionPage((page) => Math.min(transactionPageCount, page + 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:!cursor-[not-allowed] disabled:hover:border-zinc-200 disabled:hover:bg-transparent disabled:hover:text-zinc-500 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Category Modal (Add / Edit) */}
      <CategoryModal
        open={isModalOpen}
        mode={modalMode}
        category={editingCategory}
        initialType={typeTab}
        existingCategories={combined.all}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCategory}
        onArchiveToggle={handleArchiveToggle}
        onDelete={handleDelete}
      />
    </div>
  )
}
