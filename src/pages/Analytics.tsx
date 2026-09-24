import { useState, useMemo } from "react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronLeft, ChevronRight, } from "lucide-react"
import { Link } from "react-router-dom"
import type { Expense } from "../types/expense"
import { EXPENSE_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"

interface AnalyticsProps {
  expenses: Expense[]
}

type Period = "week" | "month" | "year"

export default function Analytics({ expenses }: AnalyticsProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)

  const [period, setPeriod] = useState<Period>("month")
  const [viewDate, setViewDate] = useState(new Date())

  const periodLabel = useMemo(() => {
    if (period === "year") {
      return String(viewDate.getFullYear())
    }
    if (period === "week") {
      const d = new Date(viewDate)
      const day = d.getDay()
      const diffToMon = (day === 0 ? -6 : 1) - day
      const mon = new Date(d)
      mon.setDate(d.getDate() + diffToMon)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      const monStr = mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const sunStr = sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      return `${monStr} – ${sunStr}`
    }
    return viewDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }, [viewDate, period])

  function prevPeriod() {
    const d = new Date(viewDate)
    if (period === "week") {
      d.setDate(d.getDate() - 7)
    } else if (period === "year") {
      d.setFullYear(d.getFullYear() - 1)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    setViewDate(d)
  }

  function nextPeriod() {
    const d = new Date(viewDate)
    if (period === "week") {
      d.setDate(d.getDate() + 7)
    } else if (period === "year") {
      d.setFullYear(d.getFullYear() + 1)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    setViewDate(d)
  }

  const expensesOnly = useMemo(
    () => expenses.filter((e) => e.type !== "income"),
    [expenses]
  )
  const isUsingFallback = expensesOnly.length === 0

  // Filter expenses matching current period and viewDate
  const periodExpenses = useMemo(() => {
    if (isUsingFallback) return []

    if (period === "year") {
      const targetYear = viewDate.getFullYear()
      return expensesOnly.filter((e) => {
        const [y] = e.date.split("-").map(Number)
        return y === targetYear
      })
    }

    if (period === "week") {
      const d = new Date(viewDate)
      const day = d.getDay()
      const diffToMon = (day === 0 ? -6 : 1) - day
      const mon = new Date(d)
      mon.setDate(d.getDate() + diffToMon)
      mon.setHours(0, 0, 0, 0)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      sun.setHours(23, 59, 59, 999)

      const monTime = mon.getTime()
      const sunTime = sun.getTime()

      return expensesOnly.filter((e) => {
        const [y, m, dt] = e.date.split("-").map(Number)
        const itemTime = new Date(y, m - 1, dt).getTime()
        return itemTime >= monTime && itemTime <= sunTime
      })
    }

    // Default: month
    const targetYear = viewDate.getFullYear()
    const targetMonth = viewDate.getMonth() + 1
    return expensesOnly.filter((e) => {
      const [y, m] = e.date.split("-").map(Number)
      return y === targetYear && m === targetMonth
    })
  }, [expensesOnly, isUsingFallback, period, viewDate])

  const totalSpending = useMemo(() => {
    if (isUsingFallback) {
      if (period === "week") return 1130000
      if (period === "year") return 42300000
      return 4850000
    }
    return periodExpenses.reduce((s, e) => s + e.amount, 0)
  }, [isUsingFallback, period, periodExpenses])

  const avgPerDay = useMemo(() => {
    if (isUsingFallback) {
      if (period === "week") return Math.round(1130000 / 7)
      if (period === "year") return Math.round(42300000 / 365)
      return 161667
    }
    const divisor = period === "week" ? 7 : period === "year" ? 365 : 30
    return Math.round(totalSpending / divisor)
  }, [isUsingFallback, period, totalSpending])

  // Bar chart data dynamically shaped by week, month, or year
  const barData = useMemo(() => {
    if (isUsingFallback) {
      if (period === "week") {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        const mockWeek = [155000, 295000, 140000, 220000, 180000, 90000, 50000]
        return days.map((name, i) => ({
          label: name,
          total: mockWeek[i] || 0,
        }))
      }
      if (period === "year") {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const mockYear = [3200000, 4100000, 3800000, 4500000, 2900000, 3700000, 4200000, 3900000, 4850000, 0, 0, 0]
        return months.map((name, i) => ({
          label: name,
          total: mockYear[i] || 0,
        }))
      }
      const heights = [
        0, 110000, 140000, 130000, 230000, 180000, 160000, 290000, 140000, 150000,
        170000, 130000, 210000, 240000, 360000, 230000, 190000, 170000, 150000,
        140000, 210000, 190000, 160000, 230000, 200000, 180000, 150000, 120000,
        110000, 140000,
      ]
      return Array.from({ length: 30 }, (_, i) => ({
        label: String(i + 1),
        total: heights[i] || 120000,
      }))
    }

    if (period === "week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const map: Record<number, number> = {}
      periodExpenses.forEach((e) => {
        const [y, m, dt] = e.date.split("-").map(Number)
        const itemDate = new Date(y, m - 1, dt)
        const dayIdx = (itemDate.getDay() + 6) % 7
        map[dayIdx] = (map[dayIdx] || 0) + e.amount
      })

      return days.map((name, i) => ({
        label: name,
        total: map[i] || 0,
      }))
    }

    if (period === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const map: Record<number, number> = {}
      periodExpenses.forEach((e) => {
        const m = Number(e.date.split("-")[1])
        if (m) {
          map[m - 1] = (map[m - 1] || 0) + e.amount
        }
      })
      return months.map((name, i) => ({
        label: name,
        total: map[i] || 0,
      }))
    }

    // Month
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
    const map: Record<number, number> = {}
    periodExpenses.forEach((e) => {
      const d = Number(e.date.split("-")[2])
      if (d) map[d] = (map[d] || 0) + e.amount
    })

    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      total: map[i + 1] || 0,
    }))
  }, [isUsingFallback, period, periodExpenses, viewDate])

  // Category Lists
  const categoryBreakdown = useMemo(() => {
    if (isUsingFallback) {
      return [
        { id: "food", name: "Food", amount: 1800000, percent: 37, color: "#f97316" },
        { id: "drinks", name: "Drinks", amount: 650000, percent: 13, color: "#10b981" },
        { id: "transportation", name: "Transportation", amount: 550000, percent: 11, color: "#3b82f6" },
        { id: "shopping", name: "Shopping", amount: 450000, percent: 9, color: "#ec4899" },
        { id: "rent", name: "Housing", amount: 400000, percent: 8, color: "#8b5cf6" },
      ]
    }

    const map: Record<string, number> = {}
    periodExpenses.forEach((e) => {
      map[e.categoryId] = (map[e.categoryId] || 0) + e.amount
    })
    const tot = Object.values(map).reduce((a, b) => a + b, 0) || 1

    return Object.entries(map)
      .map(([catId, amt]) => {
        const cat = EXPENSE_CATEGORIES.find((c) => c.id === catId)
        return {
          id: catId,
          name: cat?.name || catId,
          amount: amt,
          percent: Math.round((amt / tot) * 100),
          color: cat?.color || "#9ca3af",
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [isUsingFallback, periodExpenses])

  const categoryTotalAmount = useMemo(() => {
    if (isUsingFallback) return 155000
    return categoryBreakdown.reduce((sum, c) => sum + c.amount, 0)
  }, [isUsingFallback, categoryBreakdown])

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-8 sm:py-6">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          Analytics
        </h1>
      </div>

      {/* Week / Month / Year */}
      <div className="mb-4 flex items-center justify-center">
        <div className="inline-flex w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xs">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition ${
                period === p
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Period Navigator */}
      <div className="mb-6 flex items-center justify-center gap-4 text-sm font-semibold text-zinc-800">
        <button
          onClick={prevPeriod}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[150px] text-center">{periodLabel}</span>
        <button
          onClick={nextPeriod}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards: Total Spending & Average / day */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs sm:p-5">
          <p className="text-xs font-medium text-zinc-400">Total Spending</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-zinc-900 sm:mt-2 sm:text-2xl">
            {formatCurrency(totalSpending)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs sm:p-5">
          <p className="text-xs font-medium text-zinc-400">Average / day</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-zinc-900 sm:mt-2 sm:text-2xl">
            {formatCurrency(avgPerDay)}
          </p>
        </div>
      </div>

      {/* Daily / Monthly Spending Bar Chart */}
      <div className="mb-4 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:mb-6 sm:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          {period === "year" ? "Monthly Spending" : "Daily Spending"}
        </h2>

        <div className="mt-3 h-44 w-full sm:mt-4 sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                interval={period === "month" ? 4 : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickFormatter={(v) => (v === 0 ? "0" : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`)}
              />
              <Tooltip
                formatter={(value: any) => [formatCurrency(value), "Spending"]}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e4e4e7",
                  fontSize: "12px",
                }}
                cursor={{ fill: "#f4f4f5" }}
              />
              <Bar
                dataKey="total"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                maxBarSize={period === "year" ? 16 : period === "week" ? 24 : 8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending by Category List */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            Spending by Category
          </h2>
          <span className="text-xs font-semibold text-zinc-900">
            {formatCurrency(categoryTotalAmount)}
          </span>
        </div>

        <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
          {categoryBreakdown.map((cat) => {
            const def = EXPENSE_CATEGORIES.find((c) => c.id === cat.id)
            const Icon = def?.component
            return (
              <div key={cat.id} className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9"
                    style={{ backgroundColor: cat.color + "18" }}
                  >
                    {Icon && <Icon className="h-4 w-4" style={{ color: cat.color }} />}
                  </div>
                  <span className="truncate text-sm font-medium text-zinc-800">{cat.name}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <span className="whitespace-nowrap text-xs font-semibold text-zinc-900 sm:text-sm">
                    {formatCurrency(cat.amount)}
                  </span>
                  <span className="w-8 text-right text-xs font-medium text-zinc-400">
                    {cat.percent}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 border-t border-zinc-100 pt-3 text-right">
          <Link
            to="/categories"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View all &gt;
          </Link>
        </div>
      </div>
    </div>
  )
}
