import { useState, useMemo } from "react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { Expense } from "../types/expense"
import { EXPENSE_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency } from "../lib/currency"
import { useTheme } from "../hooks/useTheme"

interface AnalyticsProps {
  expenses: Expense[]
}

type Period = "week" | "month" | "year"

export default function Analytics({ expenses }: AnalyticsProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

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

  // Filter expenses matching current period and viewDate
  const periodExpenses = useMemo(() => {
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
  }, [expensesOnly, period, viewDate])

  const totalSpending = useMemo(() => {
    return periodExpenses.reduce((s, e) => s + e.amount, 0)
  }, [periodExpenses])

  const avgPerDay = useMemo(() => {
    const divisor = period === "week" ? 7 : period === "year" ? 365 : 30
    return Math.round(totalSpending / divisor)
  }, [period, totalSpending])

  // Bar chart data dynamically shaped by week, month, or year
  const barData = useMemo(() => {
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
  }, [period, periodExpenses, viewDate])

  // Category Lists
  const categoryBreakdown = useMemo(() => {
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
  }, [periodExpenses])

  const categoryTotalAmount = useMemo(() => {
    return categoryBreakdown.reduce((sum, c) => sum + c.amount, 0)
  }, [categoryBreakdown])

  const chartTooltipStyle = isDark
    ? { borderRadius: "12px", border: "1px solid #3f3f46", background: "#18181b", color: "#fafafa", fontSize: "12px" }
    : { borderRadius: "12px", border: "1px solid #e4e4e7", background: "#fff", color: "#09090b", fontSize: "12px" }

  const chartCursorStyle = isDark ? { fill: "#27272a" } : { fill: "#f4f4f5" }
  const axisTickColor = isDark ? "#71717a" : "#a1a1aa"

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-8 sm:py-6">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
          Analytics
        </h1>
      </div>

      {/* Week / Month / Year */}
      <div className="mb-4 flex items-center justify-center">
        <div className="inline-flex w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 shadow-2xs">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl py-2 text-xs font-semibold capitalize transition sm:min-h-0 ${
                period === p
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Period Navigator */}
      <div className="mb-6 flex items-center justify-center gap-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        <button
          type="button"
          onClick={prevPeriod}
          aria-label="Previous analytics period"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 sm:h-8 sm:w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 text-center sm:min-w-[150px]">{periodLabel}</span>
        <button
          type="button"
          onClick={nextPeriod}
          aria-label="Next analytics period"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 sm:h-8 sm:w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards: Total Spending & Average / day */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-xs sm:p-5">
          <p className="text-xs font-medium text-zinc-400">Total Spending</p>
          <p className="mt-1 break-words text-[clamp(1rem,5vw,1.5rem)] font-bold tracking-tight text-zinc-900 dark:text-white sm:mt-2 sm:text-2xl">
            {formatCurrency(totalSpending)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-xs sm:p-5">
          <p className="text-xs font-medium text-zinc-400">Average / day</p>
          <p className="mt-1 break-words text-[clamp(1rem,5vw,1.5rem)] font-bold tracking-tight text-zinc-900 dark:text-white sm:mt-2 sm:text-2xl">
            {formatCurrency(avgPerDay)}
          </p>
        </div>
      </div>

      {/* Daily / Monthly Spending Bar Chart */}
      <div className="mb-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:mb-6 sm:p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          {period === "year" ? "Monthly Spending" : "Daily Spending"}
        </h2>

        {periodExpenses.length === 0 ? (
          <div className="mt-3 flex h-44 items-center justify-center text-center text-sm text-zinc-400 sm:mt-4 sm:h-52 dark:text-zinc-500">
            No spending recorded for this {period}.
          </div>
        ) : (
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
                  tick={{ fill: axisTickColor, fontSize: 10 }}
                  interval={period === "month" ? 4 : 0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: axisTickColor, fontSize: 10 }}
                  tickFormatter={(v) => (v === 0 ? "0" : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`)}
                />
                <Tooltip
                  formatter={(value: unknown) => [formatCurrency(Number(value) || 0), "Spending"]}
                  contentStyle={chartTooltipStyle}
                  cursor={chartCursorStyle}
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
        )}
      </div>

      {/* Spending by Category List */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Spending by Category
          </h2>
          <span className="break-words text-right text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(categoryTotalAmount)}
          </span>
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No category spending recorded for this {period}.
          </p>
        ) : (
          <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
            {categoryBreakdown.map((cat) => {
            const def = EXPENSE_CATEGORIES.find((c) => c.id === cat.id)
            const Icon = def?.component
            return (
              <div key={cat.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9"
                    style={{ backgroundColor: cat.color + "18" }}
                  >
                    {Icon && <Icon className="h-4 w-4" style={{ color: cat.color }} />}
                  </div>
                  <span className="line-clamp-2 min-w-0 break-words text-sm font-medium text-zinc-800 dark:text-zinc-200">{cat.name}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <span className="max-w-24 break-words text-right text-[11px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100 sm:max-w-none sm:whitespace-nowrap sm:text-sm">
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
        )}

        <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-3 text-right">
          <Link
            to="/categories"
            className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
