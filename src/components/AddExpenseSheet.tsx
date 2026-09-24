import { useEffect, useState } from "react"
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
} from "lucide-react"

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import type { Expense, TransactionType, RecurringTransaction, RecurringFrequency } from "../types/expense"
import { useCurrency } from "../contexts/CurrencyContext"
import { SUPPORTED_CURRENCIES, convertAmount, convertToBaseVND } from "../lib/currency"

interface AddExpenseSheetProps {
  open: boolean
  onClose: () => void
  onSave: (expense: Expense) => void
  onUpdate?: (id: string, updated: Partial<Omit<Expense, "id">>) => void
  onSaveRecurring?: (recurring: Omit<RecurringTransaction, "id">) => void
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

export default function AddExpenseSheet({
  open,
  onClose,
  onSave,
  onUpdate,
  onSaveRecurring,
  initialExpense,
  defaultCategoryId = "drinks",
}: AddExpenseSheetProps) {
  const { currency, rates } = useCurrency()
  const activeCurrencyConfig = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0]

  const isEditing = !!initialExpense

  const [type, setType] = useState<TransactionType>("expense")
  const [amount, setAmount] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [categoryId, setCategoryId] = useState(defaultCategoryId)
  const [item, setItem] = useState("")
  const [note, setNote] = useState("")

  const getTodayLocalString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [date, setDate] = useState(getTodayLocalString)

  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly")

  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`
  })

  // Pre-fill when editing or opening
  useEffect(() => {
    if (open) {
      setIsRecurring(false)
      setFrequency("monthly")
      if (initialExpense) {
        setType(initialExpense.type || "expense")
        setQuantity(String(initialExpense.quantity || 1))
        const initialVal = currency === "VND" 
          ? initialExpense.unitPrice ?? initialExpense.amount
          : Math.round(convertAmount(initialExpense.unitPrice ?? initialExpense.amount, currency, rates) * 100) / 100
        setAmount(String(initialVal))
        setCategoryId(initialExpense.categoryId)
        setItem(initialExpense.item)
        setNote(initialExpense.note || "")
        setDate(initialExpense.date)
        setTime(initialExpense.time)
      } else {
        setType("expense")
        setAmount("")
        setQuantity("1")
        setCategoryId(defaultCategoryId || "drinks")
        setItem("")
        setNote("")
        setDate(getTodayLocalString())
        const now = new Date()
        setTime(
          `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}`
        )
      }
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [open, initialExpense, defaultCategoryId])

  if (!open) {
    return null
  }

  const activeCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const selectedCategory = activeCategories.find(
    (category) => category.id === categoryId
  ) || activeCategories[0]

  const recentItems = recentItemsByCategory[categoryId] || (
    type === "income" ? recentItemsByCategory.salary : recentItemsByCategory.drinks
  )

  const numericAmount = Number(amount.replace(/,/g, ""))
  const numericQuantity = Number(quantity)

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
    // Switch to first category of new type
    const newCats = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategoryId(newCats[0].id)
    setItem("")
  }

  const handleSave = () => {
    // Quantity and unit price guard
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

    if (isEditing && initialExpense && onUpdate) {
      onUpdate(initialExpense.id, {
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
      onSave({
        id: crypto.randomUUID(),
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
      })

      if (isRecurring && onSaveRecurring) {
        const dayOfMonth = Number(date.split("-")[2]) || 1
        const dayOfWeek = new Date(date).getDay()
        onSaveRecurring({
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
          nextDueDate: date,
          active: true,
          createdAt: Date.now(),
        })
      }
    }

    setAmount("")
    setQuantity("1")
    setItem("")
    setNote("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] items-end justify-center overflow-hidden overscroll-none md:items-center">
      {/* Overlay */}
      <div
        aria-label="Close modal"
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* Sheet / Modal */}
      <div className="relative z-10 mb-2 flex h-[80dvh] w-[calc(100%-1rem)] max-h-[80dvh] min-h-0 flex-col overflow-hidden overscroll-contain rounded-3xl bg-white shadow-2xl transition-all sm:mb-0 sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-lg md:h-auto md:max-h-[90vh] md:w-[calc(100%-3rem)] md:max-w-xl">

        <div className="flex justify-center pt-2.5 md:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-2 md:px-6 md:py-3.5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 md:text-xl">
              {isEditing ? "Edit Transaction" : type === "income" ? "Add Income" : "Add Expense"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 md:text-sm">
              {isEditing ? "Update your transaction details" : type === "income" ? "Record your earnings" : "Record what you spent"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 md:h-9 md:w-9"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          <div className="space-y-2 p-3 md:space-y-3 md:bg-zinc-50/40 md:p-5">
          <div className="relative hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-1 shadow-xs md:flex">
            <div
              className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl shadow-sm transition-all duration-300 ease-out ${
                type === "expense"
                  ? "left-1 bg-red-50 ring-1 ring-red-100"
                  : "left-[calc(50%+0.125rem)] bg-emerald-50 ring-1 ring-emerald-100"
              }`}
            />
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors duration-300 md:gap-2 md:py-2 md:text-xs ${
                type === "expense"
                  ? "text-red-700"
                  : "text-zinc-500 hover:text-zinc-900"
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
                  ? "text-emerald-700"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Income / Revenue
            </button>
          </div>

          {/* Quantity and unit price */}
          <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2">
            <div>
              <label htmlFor="expense-quantity" className="mb-1 block text-[11px] font-medium text-zinc-700 md:text-xs">
                Quantity
              </label>
              <input
                id="expense-quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-lg font-semibold tracking-tight text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:text-2xl"
              />
            </div>
            <div>
          <div>
            <label
              htmlFor="expense-amount"
              className="mb-1 block text-[11px] font-medium text-zinc-700 md:text-xs"
            >
              Unit price
            </label>

            <div className="relative">
              <input
                id="expense-amount"
                type="text"
                inputMode={currency === "VND" ? "numeric" : "decimal"}
                value={displayInputValue}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2 pr-10 text-lg font-semibold tracking-tight text-zinc-900 outline-none transition placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:pr-12 md:text-2xl"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400 md:right-4 md:text-base">
                {activeCurrencyConfig.symbol}
              </span>
            </div>
            {currency !== "VND" && numericAmount > 0 && (
              <p className="mt-1 text-[11px] text-zinc-400">
                ≈ {new Intl.NumberFormat("vi-VN").format(convertToBaseVND(numericAmount, currency, rates))} ₫ (auto-converted to base)
              </p>
            )}
            </div>
          </div>
          </div>
          {numericQuantity > 0 && numericAmount > 0 && (
            <p className="text-right text-xs font-semibold text-zinc-500">
              Total: {currency === "VND"
                ? `${new Intl.NumberFormat("vi-VN").format(numericQuantity * numericAmount)} ${activeCurrencyConfig.symbol}`
                : `${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(numericQuantity * numericAmount)}`}
            </p>
          )}

          {/* Category */}
          <div>
            <label
              htmlFor="expense-category"
              className="mb-1 block text-[11px] font-medium text-zinc-700 md:text-xs"
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
                className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-9 text-xs font-medium text-zinc-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:pr-10 md:text-sm"
              >
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
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
              className="mb-1 block text-[11px] font-medium text-zinc-700 md:text-xs"
            >
              {type === "income" ? "Source / Description" : "Item / What did you use?"}
            </label>

            <input
              id="expense-item"
              type="text"
              value={item}
              onChange={(event) => setItem(event.target.value)}
              maxLength={120}
              placeholder={type === "income" ? "e.g. Monthly Salary, Freelance project" : "e.g. Vietnamese Coffee, Lunch"}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:text-sm"
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
                          ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
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
            <label className="mb-1 block text-[11px] font-medium text-zinc-700 md:text-xs">
              When
            </label>
            <div className="grid grid-cols-2 gap-2 md:gap-2.5">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-zinc-400 md:block" />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-3 md:py-2.5 md:pl-10 md:text-sm"
                />
              </div>

              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-zinc-400 md:block" />
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-3 md:py-2.5 md:pl-10 md:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="expense-note"
              className="mb-1 block text-[11px] font-medium text-zinc-700 md:text-xs"
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
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-2.5 md:text-sm"
            />
          </div>

          {/* Recurring Option */}
          {!isEditing && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-800">
                      Repeat this transaction
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Auto-generate regularly on schedule
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
              </label>

              {isRecurring && (
                <div className="mt-2.5 flex items-center justify-between pt-2.5 border-t border-zinc-200/80 text-xs">
                  <span className="text-[11px] font-medium text-zinc-600">Frequency:</span>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 outline-none"
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
        <div className="shrink-0 border-t border-zinc-200 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:px-5 md:pb-5 md:pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!amount || numericAmount <= 0 || !item.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 md:py-3.5 md:text-sm"
          >
            <Check className="h-4 w-4" />
            {isEditing ? "Update Transaction" : type === "income" ? "Save Income" : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  )
}
