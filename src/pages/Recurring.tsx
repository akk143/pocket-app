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
import { convertAndFormatCurrency } from "../lib/currency"

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
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)

  // Form states for new recurring rule
  const [type, setType] = useState<TransactionType>("expense")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("rent")
  const [item, setItem] = useState("")
  const [note, setNote] = useState("")
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly")
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().split("T")[0])
  const [isSaving, setIsSaving] = useState(false)

  // Fallback demo data if user has no recurring schedules yet
  const displayList = useMemo(() => {
    if (recurringList.length > 0) return recurringList
    return [
      {
        id: "rec-demo-1",
        type: "expense",
        amount: 4500000,
        categoryId: "rent",
        categoryName: "Housing",
        item: "Apartment Rent",
        note: "Due on the 1st of every month",
        frequency: "monthly",
        dayOfMonth: 1,
        nextDueDate: "2026-10-01",
        lastRunDate: "2026-09-01",
        active: true,
        createdAt: 1000,
      },
      {
        id: "rec-demo-2",
        type: "income",
        amount: 25000000,
        categoryId: "salary",
        categoryName: "Salary",
        item: "Monthly Salary",
        note: "Transferred on the 25th",
        frequency: "monthly",
        dayOfMonth: 25,
        nextDueDate: "2026-09-25",
        lastRunDate: "2026-08-25",
        active: true,
        createdAt: 999,
      },
      {
        id: "rec-demo-3",
        type: "expense",
        amount: 280000,
        categoryId: "bills",
        categoryName: "Bills",
        item: "High-Speed Internet",
        note: "Auto-debit bill",
        frequency: "monthly",
        dayOfMonth: 15,
        nextDueDate: "2026-10-15",
        lastRunDate: "2026-09-15",
        active: true,
        createdAt: 998,
      },
    ] as RecurringTransaction[]
  }, [recurringList])

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
    setType(defaultType)
    setAmount("")
    const cats = defaultType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategoryId(cats[0].id)
    setItem("")
    setNote("")
    setFrequency("monthly")
    setDayOfMonth(1)
    setDayOfWeek(1)
    setFirstDueDate(new Date().toISOString().split("T")[0])
    setIsModalOpen(true)
  }

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    const cats = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategoryId(cats[0].id)
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount.replace(/\D/g, ""))
    if (!numericAmount || !item.trim()) return

    const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const selectedCat = cats.find((c) => c.id === categoryId)

    setIsSaving(true)
    try {
      await onAddRecurring({
        type,
        amount: numericAmount,
        categoryId,
        categoryName: selectedCat?.name || "Other",
        item: item.trim(),
        note: note.trim(),
        frequency,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        nextDueDate: firstDueDate,
        active: true,
        createdAt: Date.now(),
      })
      setIsModalOpen(false)
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-8 sm:py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
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
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Recurring Schedule
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-3 sm:gap-4 sm:grid-cols-3">
        {/* Recurring Expenses */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">
              Monthly Fixed Expenses
            </span>
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {convertAndFormatCurrency(totalMonthlyExpenses, currency, rates)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Rent, utilities, subscriptions & bills
          </p>
        </div>

        {/* Recurring Income */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">
              Monthly Fixed Income
            </span>
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight text-emerald-600 sm:text-2xl">
            +{convertAndFormatCurrency(totalMonthlyIncome, currency, rates)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Salary, client retainers & dividends
          </p>
        </div>

        {/* Net Monthly Baseline */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">
              Net Baseline Cashflow
            </span>
          </div>
          <p
            className={`mt-3 text-xl font-bold tracking-tight sm:text-2xl ${
              totalMonthlyIncome >= totalMonthlyExpenses
                ? "text-emerald-600"
                : "text-red-500"
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
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              filterType === "all"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All ({displayList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("expense")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-semibold transition ${
              filterType === "expense"
                ? "bg-red-50 text-red-600 font-bold shadow-xs border border-red-200/50"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setFilterType("income")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-semibold transition ${
              filterType === "income"
                ? "bg-emerald-50 text-emerald-700 font-bold shadow-xs border border-emerald-200/50"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* List of Recurring Items */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center">
            <Repeat className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-sm font-semibold text-zinc-700">
              No recurring transactions
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Add your regular rent, bills, or salary to auto-track them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredList.map((r) => {
              const isIncome = r.type === "income"
              const activeCats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
              const cat = activeCats.find((c) => c.id === r.categoryId)
              const Icon = cat?.component || Repeat
              const color = cat?.color || (isIncome ? "#10b981" : "#9ca3af")
              const isTriggering = triggeringId === r.id

              return (
                <div
                  key={r.id}
                  className={`flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                    r.active ? "hover:bg-zinc-50/50" : "bg-zinc-50/40 opacity-70"
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
                        <span className="font-bold text-sm text-zinc-900 truncate">
                          {r.item}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200/50"
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

                      <p className="text-[11px] sm:text-xs text-zinc-500 line-clamp-1">
                        {r.note || "Scheduled transaction"} <span className="mx-1.5 hidden sm:inline">·</span><br className="sm:hidden" />
                        <span className="font-semibold text-zinc-700 mt-0.5 sm:mt-0 inline-block">
                          Next due: {r.nextDueDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Amount & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    <div className="flex justify-between sm:block sm:text-right w-full sm:w-auto items-center">
                       <span className="text-[11px] font-medium text-zinc-500 sm:hidden">Amount:</span>
                       <div>
                         <p
                           className={`text-sm font-bold sm:text-[15px] ${
                             isIncome ? "text-emerald-600" : "text-zinc-900"
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
                        onClick={() => onToggleActive(r.id, !r.active)}
                        className={`flex-1 sm:flex-none rounded-xl px-3 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:py-2 ${
                          r.active
                            ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        }`}
                        title={r.active ? "Pause schedule" : "Resume schedule"}
                      >
                        {r.active ? "Pause" : "Resume"}
                      </button>

                      {/* Post Now button */}
                      <button
                        type="button"
                        onClick={() => handleTrigger(r)}
                        disabled={isTriggering}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50 shadow-2xs sm:px-3 sm:py-2"
                        title="Record this transaction immediately for today"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>{isTriggering ? "..." : "Post Now"}</span>
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete recurring schedule "${r.item}"?`)) {
                            onDeleteRecurring(r.id)
                          }
                        }}
                        className="rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-2xs sm:p-2"
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

      {/* Add Recurring Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-zinc-900">
                  New Recurring Schedule
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-4">
              {/* Type Switcher */}
              <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange("expense")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    type === "expense"
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
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
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "")
                      setAmount(val ? new Intl.NumberFormat("vi-VN").format(Number(val)) : "")
                    }}
                    placeholder="5,000,000"
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                    ₫
                  </span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
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
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Description / Title
                </label>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder={type === "income" ? "e.g. Monthly Salary" : "e.g. Apartment Rent, Netflix"}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Frequency & Due Day */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                {frequency === "monthly" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700">
                      Day of Month
                    </label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
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
                    <label className="mb-1 block text-xs font-medium text-zinc-700">
                      Day of Week
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
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
                    <label className="mb-1 block text-xs font-medium text-zinc-700">
                      Starts on
                    </label>
                    <input
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Note <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
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
