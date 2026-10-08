import { useEffect, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  X,
  TrendingDown,
  TrendingUp,
  Repeat,
  Pencil,
} from "lucide-react"

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import type { Expense, TransactionType, RecurringTransaction, RecurringFrequency } from "../types/expense"
import { useCurrency } from "../contexts/CurrencyContext"
import { SUPPORTED_CURRENCIES, convertAmount, convertToBaseVND } from "../lib/currency"
import { computeNextDueDate } from "../lib/recurring"

interface AddExpenseSheetProps {
  open: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (
    expense: Omit<Expense, "id">,
    recurring?: Omit<RecurringTransaction, "id">,
  ) => Promise<void>
  onUpdate?: (id: string, updated: Partial<Omit<Expense, "id">>) => Promise<void>
  initialExpense?: Expense | null
  defaultCategoryId?: string
}

const recentItemsByCategory: Record<string, string[]> = {
  food: ["Vietnamese Coffee", "Lunch", "Dinner", "Breakfast"],
  drinks: ["Vietnamese Coffee", "Milk Tea", "Coca-Cola", "Coffee"],
  transportation: ["Grab", "Bus", "Taxi", "Gas"],
  shopping: ["T-Shirt", "Shoes", "Groceries", "Gundam"],
  rent: ["Monthly Rent", "Utilities", "Maintenance"],
  bills: ["Internet", "Electricity", "Water", "Phone bill"],
  entertainment: ["Movie", "Game", "Netflix", "Concert"],
  education: ["Course", "Book", "Tuition"],
  health: ["Medicine", "Pharmacy", "Doctor", "Gym"],
  technology: ["Keyboard", "Mouse", "Software", "Cloud"],
  other: ["Other", "Gift", "Donation"],
  salary: ["Monthly Salary", "Bonus", "Commission"],
  freelance: ["Client Project", "Consulting", "Design work"],
  investments: ["Stock Dividends", "Interest", "Crypto"],
  gift: ["Birthday Gift", "Holiday Bonus"],
  sales: ["Item Sold", "Product Sales"],
  other_income: ["Refund", "Reimbursement", "Cashback"],
}

function toTimeInputValue(time: string) {
  const match = time.trim().match(/^(\d{1,2}):([0-5]\d)(?:\s*(AM|PM))?$/i)
  if (!match) return ""

  let hours = Number(match[1])
  const meridiem = match[3]?.toUpperCase()
  if (meridiem) {
    if (hours < 1 || hours > 12) return ""
    if (meridiem === "PM" && hours !== 12) hours += 12
    if (meridiem === "AM" && hours === 12) hours = 0
  } else if (hours > 23) {
    return ""
  }

  return `${String(hours).padStart(2, "0")}:${match[2]}`
}

export default function AddExpenseSheet({
  open,
  onClose,
  ...formProps
}: AddExpenseSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <ExpenseSheetForm
      key={formProps.initialExpense?.id ?? `new-${formProps.defaultCategoryId ?? "drinks"}`}
      {...formProps}
      onClose={onClose}
    />
  )
}

function ExpenseSheetForm({
  isSaving,
  onClose,
  onSave,
  onUpdate,
  initialExpense,
  defaultCategoryId = "drinks",
}: Omit<AddExpenseSheetProps, "open">) {
  const { currency, rates } = useCurrency()
  const activeCurrencyConfig = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0]

  const isEditing = !!initialExpense

  const [type, setType] = useState<TransactionType>(
    () =>
      initialExpense?.type ??
      (INCOME_CATEGORIES.some((category) => category.id === defaultCategoryId)
        ? "income"
        : "expense"),
  )
  const [amount, setAmount] = useState(() => {
    if (!initialExpense) return ""
    const initialAmount =
      initialExpense.type === "income"
        ? initialExpense.amount
        : initialExpense.unitPrice ?? initialExpense.amount
    const convertedAmount =
      currency === "VND"
        ? initialAmount
        : Math.round(convertAmount(initialAmount, currency, rates) * 100) / 100
    return String(convertedAmount)
  })
  const [quantity, setQuantity] = useState(() =>
    String(initialExpense?.type === "income" ? 1 : initialExpense?.quantity || 1),
  )
  const [categoryId, setCategoryId] = useState(
    () => initialExpense?.categoryId ?? defaultCategoryId,
  )
  const [item, setItem] = useState(() => initialExpense?.item ?? "")
  const [note, setNote] = useState(() => initialExpense?.note ?? "")

  const getTodayLocalString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [date, setDate] = useState(() => initialExpense?.date ?? getTodayLocalString())

  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly")
  const [saveError, setSaveError] = useState<string | null>(null)
  const submitLock = useRef(false)

  const [time, setTime] = useState(() => {
    if (initialExpense) return toTimeInputValue(initialExpense.time)
    const now = new Date()
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`
  })

  const activeCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const selectedCategory = activeCategories.find(
    (category) => category.id === categoryId
  ) || activeCategories[0]

  const recentItems = recentItemsByCategory[categoryId] || (
    type === "income" ? recentItemsByCategory.salary : recentItemsByCategory.drinks
  )

  const numericAmount = Number(amount.replace(/,/g, ""))
  const numericQuantity = type === "income" ? 1 : Number(quantity)

  const displayInputValue =
    currency === "VND"
      ? numericAmount > 0
        ? new Intl.NumberFormat("vi-VN").format(numericAmount)
        : ""
      : amount

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (currency === "VND") {
      const value = event.target.value.replace(/\D/g, "")
      setAmount(value)
    } else {
      let value = event.target.value.replace(/[^0-9.]/g, "")
      const parts = value.split(".")
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("")
      }
      setAmount(value)
    }
  }

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    setQuantity("1")
    // Switch to first category of new type
    const newCats = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategoryId(newCats[0].id)
    setItem("")
  }

  const handleSave = async () => {
    if (isSaving || submitLock.current) return
    // Income entries are single amounts; only expenses can use quantity.
    if (!amount || !isFinite(numericAmount) || numericAmount <= 0 || !Number.isInteger(numericQuantity) || numericQuantity <= 0) {
      return
    }

    const trimmedItem = item.trim().slice(0, 120)
    const trimmedNote = note.trim().slice(0, 500)

    if (!trimmedItem) {
      return
    }

    // Convert amount in selected currency to base VND
    const baseUnitPrice = convertToBaseVND(numericAmount, currency, rates)
    const totalAmount = baseUnitPrice * numericQuantity

    submitLock.current = true
    setSaveError(null)
    try {
      if (isEditing && initialExpense && onUpdate) {
        await onUpdate(initialExpense.id, {
          type,
          amount: totalAmount,
          quantity: numericQuantity,
          unitPrice: baseUnitPrice,
          categoryId,
          categoryName: selectedCategory?.name ?? "Other",
          item: trimmedItem,
          note: trimmedNote,
          date,
          time,
        })
      } else {
        const expense = {
          type,
          amount: totalAmount,
          quantity: numericQuantity,
          unitPrice: baseUnitPrice,
          categoryId,
          categoryName: selectedCategory?.name ?? "Other",
          item: trimmedItem,
          note: trimmedNote,
          date,
          time,
          createdAt: Date.now(),
        }

        if (isRecurring) {
          const dayOfMonth = Number(date.split("-")[2]) || 1
          const dayOfWeek = new Date(date).getDay()
          const recurring: Omit<RecurringTransaction, "id"> = {
            type,
            amount: totalAmount,
            quantity: numericQuantity,
            unitPrice: baseUnitPrice,
            categoryId,
            categoryName: selectedCategory?.name ?? "Other",
            item: trimmedItem,
            note: trimmedNote,
            frequency,
            dayOfMonth,
            dayOfWeek,
            lastRunDate: date,
            nextDueDate: computeNextDueDate(frequency, date, dayOfMonth, dayOfWeek),
            active: true,
            createdAt: Date.now(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          }
          await onSave(expense, recurring)
        } else {
          await onSave(expense)
        }
      }

      setAmount("")
      setQuantity("1")
      setItem("")
      setNote("")
      onClose()
    } catch {
      setSaveError("Could not save this transaction. Please try again.")
    } finally {
      submitLock.current = false
    }
  }

  // ── Edit mode: dedicated, clearly-form-styled sheet ────────────────────────
  if (isEditing) {
    return (
      <div className="fixed inset-x-0 top-[var(--keyboard-viewport-offset)] z-50 flex h-[var(--keyboard-viewport-height)] items-end justify-center pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] sm:items-center sm:p-4">
        {/* Overlay */}
        <div
          aria-label="Close"
          onClick={() => { if (!isSaving) onClose() }}
          className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] dark:bg-zinc-950/60"
        />

        {/* Edit sheet — slightly wider than Details, clearly a form */}
        <div
          className="relative z-10 flex w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
          style={{ maxHeight: "min(90dvh, calc(var(--keyboard-viewport-height) - 0.5rem))" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 sm:hidden">
            <div className="h-[5px] w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>

          {/* ── Edit header ── */}
          <div className="flex shrink-0 items-center gap-3 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800 sm:px-6 sm:py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Pencil className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Edit Transaction
              </h2>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                {type === "income" ? "Income" : "Expense"} · Update details below
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              disabled={isSaving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* ── Scrollable form fields ── */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">

              {/* Amount + Quantity row */}
              <div className={type === "income" ? "" : "grid grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] gap-3"}>
                {type !== "income" && (
                  <FormField label="Quantity" htmlFor="edit-quantity">
                    <input
                      id="edit-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                      className={inputCls}
                    />
                  </FormField>
                )}
                <FormField label={type === "income" ? "Amount" : "Unit price"} htmlFor="edit-amount">
                  <div className="relative">
                    <input
                      id="edit-amount"
                      type="text"
                      inputMode={currency === "VND" ? "numeric" : "decimal"}
                      value={displayInputValue}
                      onChange={handleAmountChange}
                      placeholder="0"
                      className={`${inputCls} pr-10`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                      {activeCurrencyConfig.symbol}
                    </span>
                  </div>
                  {currency !== "VND" && numericAmount > 0 && (
                    <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                      ≈ {new Intl.NumberFormat("vi-VN").format(convertToBaseVND(numericAmount, currency, rates))} ₫
                    </p>
                  )}
                </FormField>
              </div>

              {/* Total summary */}
              {type !== "income" && numericQuantity > 0 && numericAmount > 0 && (
                <p className="text-right text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Total: {currency === "VND"
                    ? `${new Intl.NumberFormat("vi-VN").format(numericQuantity * numericAmount)} ${activeCurrencyConfig.symbol}`
                    : `${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(numericQuantity * numericAmount)}`}
                </p>
              )}

              {/* Category */}
              <FormField label="Category" htmlFor="edit-category">
                <div className="relative">
                  <select
                    id="edit-category"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value)
                      setItem("")
                    }}
                    className={`${inputCls} appearance-none pr-9`}
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="dark:bg-zinc-800 dark:text-zinc-200">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </div>
              </FormField>

              {/* Item name */}
              <FormField label="Transaction name" htmlFor="edit-item">
                <textarea
                  id="edit-item"
                  rows={Math.max(2, Math.min(5, Math.ceil(item.length / 26)))}
                  value={item}
                  onChange={(e) => setItem(e.target.value.replace(/[\r\n]+/g, " "))}
                  maxLength={120}
                  placeholder={type === "income" ? "e.g. Monthly Salary, Freelance project" : "e.g. Vietnamese Coffee, Lunch"}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
                {recentItems.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Suggestions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recentItems.map((ri) => (
                        <button
                          key={ri}
                          type="button"
                          onClick={() => setItem(ri)}
                          className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                            item === ri
                              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400"
                              : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {ri}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </FormField>

              {/* Date + Time */}
              <FormField label="When">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>
              </FormField>

              {/* Note */}
              <FormField label={<>Note <span className="font-normal normal-case text-zinc-400">(optional)</span></>} htmlFor="edit-note">
                <textarea
                  id="edit-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Any details you'd like to remember..."
                  className={`${inputCls} resize-none`}
                />
              </FormField>

            </div>
          </div>

          {/* ── Footer: Save + Cancel ── */}
          <div className="shrink-0 border-t border-zinc-100 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
            {saveError && (
              <p role="alert" className="mb-2 text-center text-[12px] font-medium text-red-600 dark:text-red-400">
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !amount || numericAmount <= 0 || !item.trim()}
              aria-busy={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 dark:disabled:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {isSaving ? (
                "Updating…"
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-2 text-[13px] font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Add mode: original layout ───────────────────────────────────────────────
  return (
    <div className="fixed inset-x-0 top-[var(--keyboard-viewport-offset)] z-50 flex h-[var(--keyboard-viewport-height)] items-end justify-center overflow-hidden overscroll-none pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:items-center">
      {/* Overlay */}
      <div
        aria-label="Close modal"
        onClick={() => {
          if (!isSaving) onClose()
        }}
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[2px] transition-opacity dark:bg-zinc-950/70"
      />

      {/* Sheet / Modal */}
      <div className="relative z-10 mb-2 flex h-[min(80dvh,calc(var(--keyboard-viewport-height)-1rem))] w-[calc(100%-1rem)] max-h-[calc(var(--keyboard-viewport-height)-1rem)] min-h-0 flex-col overflow-hidden overscroll-contain rounded-3xl bg-white shadow-2xl transition-all dark:bg-zinc-900 sm:mb-0 sm:w-[calc(100%-2rem)] sm:max-w-lg md:h-auto md:max-h-[calc(var(--keyboard-viewport-height)-2rem)] md:w-[calc(100%-3rem)] md:max-w-xl">

        <div className="flex justify-center pt-2.5 md:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 md:px-6 md:py-3.5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
              {type === "income" ? "Add Income" : "Add Expense"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
              {type === "income" ? "Record your earnings" : "Record what you spent"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={isSaving}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 md:h-9 md:w-9"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          <div className="space-y-2 p-3 md:space-y-3 md:bg-zinc-50/40 md:dark:bg-zinc-900/40 md:p-5">
          <div className="relative hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1 shadow-xs md:flex">
            <div
              className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl shadow-sm transition-all duration-300 ease-out ${
                type === "expense"
                  ? "left-1 bg-red-50 dark:bg-red-950/40 ring-1 ring-red-100 dark:ring-red-900/50"
                  : "left-[calc(50%+0.125rem)] bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-100 dark:ring-emerald-900/50"
              }`}
            />
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors duration-300 md:gap-2 md:py-2 md:text-xs ${
                type === "expense"
                  ? "text-red-700 dark:text-red-400"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors duration-300 md:gap-2 md:py-2 md:text-xs ${
                type === "income"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Income / Revenue
            </button>
          </div>

          {/* Amount and optional expense quantity */}
          <div className={type === "income" ? "" : "grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2"}>
            {type !== "income" && (
              <div>
                <label htmlFor="expense-quantity" className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 md:text-xs">
                  Quantity
                </label>
                <input
                  id="expense-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:text-2xl"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="expense-amount"
                className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 md:text-xs"
              >
                {type === "income" ? "Amount" : "Unit price"}
              </label>

              <div className="relative">
                <input
                  id="expense-amount"
                  type="text"
                  inputMode={currency === "VND" ? "numeric" : "decimal"}
                  value={displayInputValue}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 pr-10 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 outline-none transition placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:pr-12 md:text-2xl"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400 md:right-4 md:text-base">
                  {activeCurrencyConfig.symbol}
                </span>
              </div>
              {currency !== "VND" && numericAmount > 0 && (
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  ≈ {new Intl.NumberFormat("vi-VN").format(convertToBaseVND(numericAmount, currency, rates))} ₫ (auto-converted to base)
                </p>
              )}
            </div>
          </div>
          {type !== "income" && numericQuantity > 0 && numericAmount > 0 && (
            <p className="text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total: {currency === "VND"
                ? `${new Intl.NumberFormat("vi-VN").format(numericQuantity * numericAmount)} ${activeCurrencyConfig.symbol}`
                : `${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(numericQuantity * numericAmount)}`}
            </p>
          )}

          {/* Category */}
          <div>
            <label
              htmlFor="expense-category"
              className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 md:text-xs"
            >
              Category
            </label>

            <div className="relative">
              <select
                id="expense-category"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value)
                  setItem("")
                }}
                className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 pr-9 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:pr-10 md:text-sm"
              >
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id} className="dark:bg-zinc-800 dark:text-zinc-200">
                    {category.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 md:right-4 md:h-4 md:w-4" />
            </div>
          </div>

          {/* Item */}
          <div>
            <label
              htmlFor="expense-item"
              className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 md:text-xs"
            >
              {type === "income" ? "Source / Description" : "Item / What did you use?"}
            </label>

            <textarea
              id="expense-item"
              rows={Math.max(3, Math.min(6, Math.ceil(item.length / 22)))}
              value={item}
              onChange={(event) => setItem(event.target.value.replace(/[\r\n]+/g, " "))}
              maxLength={120}
              placeholder={type === "income" ? "e.g. Monthly Salary, Freelance project" : "e.g. Vietnamese Coffee, Lunch"}
              className="w-full resize-y break-words rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:text-sm"
            />

            {/* Recent suggestions */}
            {recentItems.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wider md:text-[11px]">
                  Suggestions
                </p>

                <div className="flex flex-wrap gap-1">
                  {recentItems.map((recentItem) => (
                    <button
                      key={recentItem}
                      type="button"
                      onClick={() => setItem(recentItem)}
                      className={`rounded-lg border px-2 py-1 text-[11px] transition md:px-2.5 md:text-xs ${
                        item === recentItem
                          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400"
                          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {recentItem}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 md:text-xs">
              When
            </label>
            <div className="grid grid-cols-2 gap-2 md:gap-2.5">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-zinc-400 md:block" />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-3 md:py-2.5 md:pl-10 md:text-sm"
                />
              </div>

              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-zinc-400 md:block" />
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-3 md:py-2.5 md:pl-10 md:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="expense-note"
              className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 md:text-xs"
            >
              Note <span className="normal-case font-normal text-zinc-400">(optional)</span>
            </label>

            <textarea
              id="expense-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              placeholder="Any details you'd like to remember..."
              className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:text-sm"
            />
          </div>

          {/* Recurring Option */}
          {!isEditing && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/50 p-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Repeat this transaction
                    </span>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Auto-generate regularly on schedule
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
              </label>

              {isRecurring && (
                <div className="mt-2.5 flex items-center justify-between pt-2.5 border-t border-zinc-200/80 dark:border-zinc-700 text-xs">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Frequency:</span>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none"
                  >
                    <option value="monthly">Monthly (day {Number(date.split("-")[2]) || 1})</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              )}
            </div>
          )}

          </div>
        </div>

        {/* Submit Button — always visible at bottom, never scrolls away */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:px-5 md:pb-5 md:pt-4">
          {saveError && (
            <p role="alert" className="mb-2 text-center text-xs font-medium text-red-600 dark:text-red-400">
              {saveError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !amount || numericAmount <= 0 || !item.trim()}
            aria-busy={isSaving}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 md:py-3.5 md:text-sm"
          >
            {isSaving ? (
              <>{type === "income" ? "Saving..." : "Saving..."}</>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {type === "income" ? "Save Income" : "Save Expense"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared form field wrapper (Edit mode only) ────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
