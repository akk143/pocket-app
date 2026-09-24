import { useState } from "react"
import { Link } from "react-router-dom"
import { updateProfile, type User } from "firebase/auth"
import {
  User as UserIcon,
  Download,
  LogOut,
  Check,
  Target,
  Repeat,
  Globe,
  RefreshCw,
} from "lucide-react"
import type { Expense } from "../types/expense"
import { useCurrency } from "../contexts/CurrencyContext"
import { SUPPORTED_CURRENCIES, convertAndFormatCurrency, STATIC_VND_RATES } from "../lib/currency"

interface SettingsProps {
  user: User
  expenses: Expense[]
  onSignOut: () => void
}

export default function Settings({ user, expenses, onSignOut }: SettingsProps) {
  const { currency, setCurrency, rates, isLoadingRates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)
  const activeCurrencyConfig = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0]

  const [name, setName] = useState(user.displayName || "")
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [budget, setBudget] = useState(() => {
    return localStorage.getItem("pocket_budget") || "5000000"
  })
  const [budgetSaved, setBudgetSaved] = useState(false)

  // Current month spent
  const now = new Date()
  const thisMonthSpent = expenses
    .filter((e) => {
      if (e.type === "income") return false
      const [y, m] = e.date.split("-").map(Number)
      return y === now.getFullYear() && m === now.getMonth() + 1
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const budgetNum = Number(budget) || 1
  const budgetPercent = Math.min(100, Math.round((thisMonthSpent / budgetNum) * 100))

  // Update display name
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSavingName(true)
    try {
      await updateProfile(user, { displayName: name.trim() })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingName(false)
    }
  }

  // Save budget
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("pocket_budget", budget)
    setBudgetSaved(true)
    setTimeout(() => setBudgetSaved(false), 2500)
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert("No expenses to export.")
      return
    }

    const headers = ["ID", "Type", "Date", "Time", "Category", "Item", "Amount", "Note"]
    const rows = expenses.map((e) => [
      e.id,
      e.type || "expense",
      e.date,
      e.time,
      `"${e.categoryName}"`,
      `"${e.item.replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.note || "").replace(/"/g, '""')}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `pocket_expenses_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 lg:px-8 lg:py-6">
      {/* Title */}
      <div className="mb-5 lg:mb-7">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 lg:text-2xl">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          Manage your profile, preferences, and financial budget
        </p>
      </div>

      <div className="space-y-4 lg:space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs lg:p-6">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 lg:pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 lg:h-9 lg:w-9 lg:rounded-xl">
              <UserIcon className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Profile Details</h2>
              <p className="text-xs text-zinc-400">Update your account display information</p>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="mt-4 space-y-3 lg:mt-5 lg:space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user.email || ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="submit"
                disabled={savingName || !name.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 lg:w-auto lg:px-4 lg:py-2"
              >
                {nameSaved ? <Check className="h-3.5 w-3.5" /> : null}
                {savingName ? "Saving..." : nameSaved ? "Updated!" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Monthly Budget Goal */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs lg:p-6">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 lg:pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 lg:h-9 lg:w-9 lg:rounded-xl">
              <Target className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Monthly Spending Budget</h2>
              <p className="text-xs text-zinc-400">Set a target to keep your spending on track</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 lg:mt-5 lg:space-y-4">
            {/* Budget Progress Bar */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3 lg:p-4">
              <div className="flex flex-col gap-1 text-xs lg:flex-row lg:items-center lg:justify-between">
                <span className="font-medium text-zinc-500">This Month's Spending</span>
                <span className="font-bold text-zinc-900">
                  {formatCurrency(thisMonthSpent)} / {formatCurrency(budgetNum)}
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetPercent >= 100
                      ? "bg-red-500"
                      : budgetPercent > 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-zinc-500">
                {budgetPercent >= 100
                  ? "⚠️ You have exceeded your monthly budget goal!"
                  : `${budgetPercent}% of monthly budget spent.`}
              </p>
            </div>

            <form onSubmit={handleSaveBudget} className="flex flex-col gap-2.5 lg:flex-row">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="5000000"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-8 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                  {activeCurrencyConfig.symbol}
                </span>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 lg:w-auto"
              >
                {budgetSaved ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
                {budgetSaved ? "Saved!" : "Set Budget"}
              </button>
            </form>
          </div>
        </div>

        {/* Currency & Exchange Rates */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs lg:p-6">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 lg:pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 lg:h-9 lg:w-9 lg:rounded-xl">
              <Globe className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Currency & Exchange Rates</h2>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Rates
                </span>
              </div>
              <p className="text-xs text-zinc-400">Choose your display currency with real-time conversion</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 lg:mt-5 lg:space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Display Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 outline-none transition focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Exchange Rate Status banner */}
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-xs border border-zinc-100">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isLoadingRates ? "animate-spin" : ""}`} />
                <span className="text-zinc-600">
                  {currency !== "VND" ? (
                    STATIC_VND_RATES[currency] ? (
                      <>1 {currency} ≈ {new Intl.NumberFormat("vi-VN").format(Math.round(STATIC_VND_RATES[currency]))} ₫</>
                    ) : rates && rates[currency] && rates["VND"] ? (
                      <>1 {currency} ≈ {new Intl.NumberFormat("vi-VN").format(Math.round(rates["VND"] / rates[currency]))} ₫</>
                    ) : (
                      "Loading live rates..."
                    )
                  ) : rates ? (
                    <>1 USD ≈ {new Intl.NumberFormat("vi-VN").format(Math.round(rates["VND"]))} ₫</>
                  ) : (
                    "Loading live rates..."
                  )}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Auto-updated daily via Open Exchange API
              </span>
            </div>
          </div>
        </div>


        {/* Recurring Transactions Shortcut */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 lg:h-9 lg:w-9 lg:rounded-xl">
                <Repeat className="h-4 w-4 lg:h-5 lg:w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Recurring Transactions</h2>
                <p className="text-xs text-zinc-400">
                  Automate monthly rent, salary, bills, and regular subscriptions
                </p>
              </div>
            </div>

            <Link
              to="/recurring"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 lg:w-auto lg:py-2"
            >
              <Repeat className="h-3.5 w-3.5" />
              Manage Schedules &gt;
            </Link>
          </div>
        </div>

        {/* Data Export */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 lg:h-9 lg:w-9 lg:rounded-xl">
                <Download className="h-4 w-4 lg:h-5 lg:w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Export Transactions</h2>
                <p className="text-xs text-zinc-400">
                  Download all your expenses and income as a CSV file
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 lg:w-auto lg:py-2"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Account Session & Sign Out */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Account Session</h2>
              <p className="text-xs text-zinc-400">Sign out of PocketTrack on this browser</p>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 lg:w-auto lg:py-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
