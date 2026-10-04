import { useTheme } from "../hooks/useTheme"
import { useState, useMemo } from "react"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Plus,
  
  TrendingUp,
  Zap,
  Sprout,
  BarChart3,
  Calendar,
  Target,
  Lightbulb,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Link, useNavigate } from "react-router-dom"
import type { Expense } from "../types/expense"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { convertAndFormatCurrency, compactFormatCurrency } from "../lib/currency"
import ConfirmDialog from "../components/ConfirmDialog"
import FinancialSummaryCard from "../components/FinancialSummaryCard"
import TransactionActionsMenu from "../components/TransactionActionsMenu"

interface HomeProps {
  expenses: Expense[]
  userName?: string
  onAddExpense: (categoryId?: string) => void
  onViewExpense?: (expense: Expense) => void
  onDeleteExpense?: (expenseId: string) => void | Promise<void>
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthKey(date: Date): string {
  return toLocalDateKey(date).slice(0, 7)
}

function transactionMonthKey(value: string): string {
  return value.slice(0, 7)
}

function getWeeklySpendingTrend(expenses: Expense[], dateKey: string): number[] {
  const weeklyTotals = Array<number>(7).fill(0)
  const [year, month, day] = dateKey.split("-").map(Number)
  const todayUtc = Date.UTC(year, month - 1, day)

  expenses.forEach((expense) => {
    if (expense.type === "income") return
    const [expenseYear, expenseMonth, expenseDay] = expense.date.split("-").map(Number)
    const expenseUtc = Date.UTC(expenseYear, expenseMonth - 1, expenseDay)
    const daysAgo = Math.floor((todayUtc - expenseUtc) / 86400000)
    if (daysAgo < 0 || daysAgo >= 49) return

    const weekIndex = 6 - Math.floor(daysAgo / 7)
    weeklyTotals[weekIndex] += expense.amount
  })

  return weeklyTotals
}

function formatCategoryPercent(percent: number): string {
  if (percent < 0.1) return "<0.1%"
  if (percent < 10) return `${Number(percent.toFixed(1))}%`
  return `${Math.round(percent)}%`
}

function MonthlySpendingComparison({
  values,
  difference,
  yearTotal,
  compact = false,
}: {
  values: number[]
  difference: number | null
  yearTotal?: string
  compact?: boolean
}) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => ({
    x: 2 + (index * 96) / Math.max(values.length - 1, 1),
    y: 27 - ((value - min) / range) * 22,
  }))
  const path = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ")
  const lastPoint = points[points.length - 1]
  const isHigher = difference !== null && difference > 0
  const isLower = difference !== null && difference < 0
  const TrendArrow = isHigher ? ArrowUpRight : ArrowDownRight
  const tone = isHigher
    ? "text-emerald-700 dark:text-emerald-400"
    : isLower
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-500 dark:text-zinc-400"
  const stroke = isHigher ? "#047857" : isLower ? "#dc2626" : "#71717a"

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <svg
          aria-label="Spending over the last seven weeks"
          className={`h-6 shrink-0 ${compact ? "w-[3.75rem] sm:w-[5.5rem]" : "w-[5.5rem]"}`}
          role="img"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          {lastPoint && (
            <>
              <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill={stroke} opacity="0.16" />
              <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill={stroke} />
            </>
          )}
        </svg>
        {difference === null ? (
          <span className="whitespace-nowrap text-[10px] font-medium text-zinc-400">
            No comparison
          </span>
        ) : (
          <span className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-semibold tabular-nums ${tone}`}>
            <TrendArrow className="h-3 w-3" strokeWidth={2.5} />
            {Math.abs(difference)}%
          </span>
        )}
      </div>
      <div className={`mt-1 flex min-w-0 items-center text-[10px] leading-4 text-zinc-500 dark:text-zinc-400 ${yearTotal ? "justify-between gap-2" : ""}`}>
        <span className="whitespace-nowrap">vs. Last Month</span>
        {yearTotal && (
          <span className="whitespace-nowrap">
            Year total <span className="font-medium text-zinc-700 dark:text-zinc-300">{yearTotal}</span>
          </span>
        )}
      </div>
    </div>
  )
}


export default function Home({
  expenses,
  userName = "John",
  onAddExpense,
  onViewExpense,
  onDeleteExpense,
}: HomeProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)
  const formatCompact = (amount: number) => compactFormatCurrency(amount, currency, rates)

  const navigate = useNavigate()
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => new Date().getDate())
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [expensePendingDeletion, setExpensePendingDeletion] = useState<Expense | null>(null)
  const [monthlySpendingTimeframe, setMonthlySpendingTimeframe] = useState<"this_month" | "last_month" | "all_time">("this_month")
  const [topSpendingTimeframe, setTopSpendingTimeframe] = useState<"this_month" | "last_month">("this_month")

  const prevCalendarMonth = () => {
    const d = new Date(calendarViewMonth)
    d.setMonth(d.getMonth() - 1)
    setCalendarViewMonth(d)
  }

  const nextCalendarMonth = () => {
    const d = new Date(calendarViewMonth)
    d.setMonth(d.getMonth() + 1)
    setCalendarViewMonth(d)
  }

  const activeExpenses = expenses

  const now = new Date()
  const today = toLocalDateKey(now)
  const currentMonthKey = monthKey(now)
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const todayExpenses = activeExpenses.filter((e) => {
    if (e.type === "income") return false
    return e.date === today
  })
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0)

  const thisMonthTotal = activeExpenses
    .filter((e) => {
      if (e.type === "income") return false
      const [y, m] = e.date.split("-").map(Number)
      return y === now.getFullYear() && m === now.getMonth() + 1
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const thisYearTotal = activeExpenses
    .filter((e) => {
      if (e.type === "income") return false
      return Number(e.date.split("-")[0]) === now.getFullYear()
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const thisMonthIncome = activeExpenses
    .filter((e) => {
      if (e.type !== "income") return false
      const [y, m] = e.date.split("-").map(Number)
      return y === now.getFullYear() && m === now.getMonth() + 1
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const thisYearIncome = activeExpenses
    .filter((e) => {
      if (e.type !== "income") return false
      return Number(e.date.split("-")[0]) === now.getFullYear()
    })
    .reduce((sum, e) => sum + e.amount, 0)
  const thisMonthNet = thisMonthIncome - thisMonthTotal

  const yesterday = toLocalDateKey(new Date(now.getTime() - 86400000))
  const yesterdayExpenses = activeExpenses.filter(
    (e) => e.type !== "income" && e.date === yesterday,
  )
  const yesterdayTotal = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0)
  const todayVsYesterdayDiff = yesterdayTotal > 0
    ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
    : null

  const lastMonthExpenses = activeExpenses.filter(
    (e) =>
      e.type !== "income" &&
      transactionMonthKey(e.date) === lastMonthKey
  )
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const monthVsLastMonthDiff = lastMonthTotal > 0
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null

  const weeklySpendingTrend = getWeeklySpendingTrend(activeExpenses, today)

  // Budget calculations — read fresh every render so Settings changes reflect immediately
  const budgetGoal = Number(localStorage.getItem("pocket_budget")) || 5000000
  const budgetSpentPct = Math.round((thisMonthTotal / budgetGoal) * 100)

  // Recent 5 transactions
  const recentExpenses = useMemo(() => {
    return [...activeExpenses].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  }, [activeExpenses])

  // Current-month spending by category
  const categoryTotals: Record<string, number> = {}
  activeExpenses
    .filter((e) => e.type !== "income" && e.amount > 0 && transactionMonthKey(e.date) === currentMonthKey)
    .forEach((e) => {
      categoryTotals[e.categoryId] = (categoryTotals[e.categoryId] || 0) + e.amount
    })

  const categoryTotal = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)
  const categoryData = Object.entries(categoryTotals)
    .map(([categoryId, amount]) => {
      const category = EXPENSE_CATEGORIES.find((item) => item.id === categoryId)
      return {
        id: categoryId,
        name: category?.name || categoryId,
        amount,
        percent: categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0,
        color: category?.color || "#9ca3af",
      }
    })
    .sort((a, b) => b.amount - a.amount)

  const visibleCategoryData = categoryData.slice(0, 4)
  const remainingCategories = categoryData.slice(4)
  if (remainingCategories.length > 0) {
    const otherAmount = remainingCategories.reduce((sum, category) => sum + category.amount, 0)
    visibleCategoryData.push({
      id: "other",
      name: "Other",
      amount: otherAmount,
      percent: categoryTotal > 0 ? (otherAmount / categoryTotal) * 100 : 0,
      color: "#9ca3af",
    })
  }

  const dailyBarData = useMemo(() => {
    const curDate = new Date()
    const curMonthKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}`
    const prevMonthDate = new Date(curDate.getFullYear(), curDate.getMonth() - 1, 1)
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`

    const selectedMonthKey =
      monthlySpendingTimeframe === "this_month"
        ? curMonthKey
        : monthlySpendingTimeframe === "last_month"
        ? prevMonthKey
        : null
    const timeframeExpenses = activeExpenses.filter(
      (expense) =>
        expense.type !== "income" &&
        (selectedMonthKey === null ||
          transactionMonthKey(expense.date) === selectedMonthKey),
    )

    const daysInMonth =
      selectedMonthKey === null
        ? 31
        : new Date(
            Number(selectedMonthKey.slice(0, 4)),
            Number(selectedMonthKey.slice(5, 7)),
            0,
          ).getDate()
    const map: Record<number, number> = {}
    timeframeExpenses.forEach((e) => {
        const parts = e.date.split("-")
        const day = Number(parts[2])
        if (day) {
          map[day] = (map[day] || 0) + e.amount
        }
      })

    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      spending: map[i + 1] || 0,
    }))
  }, [
    activeExpenses,
    monthlySpendingTimeframe,
  ])

  const calendarDaysInMonth = new Date(
    calendarViewMonth.getFullYear(),
    calendarViewMonth.getMonth() + 1,
    0
  ).getDate()

  const selectedDayExpenses = useMemo(() => {
    const targetMonthStr = monthKey(calendarViewMonth)
    const dayStr = String(selectedCalendarDay).padStart(2, "0")
    const fullDateKey = `${targetMonthStr}-${dayStr}`
    return activeExpenses.filter((e) => {
      const createdDateKey = toLocalDateKey(new Date(e.createdAt))
      return e.date === fullDateKey || createdDateKey === fullDateKey
    })
  }, [activeExpenses, calendarViewMonth, selectedCalendarDay])

  const isCalendarDayToday =
    calendarViewMonth.getFullYear() === now.getFullYear() &&
    calendarViewMonth.getMonth() === now.getMonth() &&
    selectedCalendarDay === now.getDate()

  const calendarDaySpent = useMemo(() => {
    return selectedDayExpenses
      .filter((e) => e.type !== "income")
      .reduce((s, e) => s + e.amount, 0)
  }, [selectedDayExpenses])

  const calendarDayIncome = useMemo(() => {
    return selectedDayExpenses
      .filter((e) => e.type === "income")
      .reduce((s, e) => s + e.amount, 0)
  }, [selectedDayExpenses])

  const calendarDayNet = calendarDayIncome - calendarDaySpent

  const quickAddCategories = [
    { id: "food", name: "Food", icon: EXPENSE_CATEGORIES[0].component, color: "#ea580c", bg: "bg-orange-50" },
    { id: "drinks", name: "Drinks", icon: EXPENSE_CATEGORIES[1].component, color: "#16a34a", bg: "bg-emerald-50" },
    { id: "transportation", name: "Transport", icon: EXPENSE_CATEGORIES[2].component, color: "#2563eb", bg: "bg-blue-50" },
    { id: "shopping", name: "Shopping", icon: EXPENSE_CATEGORIES[3].component, color: "#db2777", bg: "bg-pink-50" },
    { id: "rent", name: "Housing", icon: EXPENSE_CATEGORIES[4].component, color: "#7c3aed", bg: "bg-purple-50" },
    { id: "bills", name: "Bills", icon: EXPENSE_CATEGORIES[5].component, color: "#d97706", bg: "bg-amber-50" },
    { id: "entertainment", name: "Entertainment", icon: EXPENSE_CATEGORIES[6].component, color: "#4f46e5", bg: "bg-indigo-50" },
    { id: "education", name: "Education", icon: EXPENSE_CATEGORIES[7].component, color: "#0284c7", bg: "bg-cyan-50" },
    { id: "health", name: "Health", icon: EXPENSE_CATEGORIES[8].component, color: "#dc2626", bg: "bg-red-50" },
  ]

  const topSpendingItems = useMemo(() => {
    const curDate = new Date()
    const curMonthKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}`
    const prevMonthDate = new Date(curDate.getFullYear(), curDate.getMonth() - 1, 1)
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`

    const selectedMonthKey =
      topSpendingTimeframe === "this_month" ? curMonthKey : prevMonthKey
    const totals = activeExpenses
      .filter(
        (expense) =>
          expense.type !== "income" &&
          transactionMonthKey(expense.date) === selectedMonthKey,
      )
      .reduce<Record<string, number>>((result, expense) => {
        result[expense.categoryId] =
          (result[expense.categoryId] || 0) + expense.amount
        return result
      }, {})
    const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0)

    return Object.entries(totals)
      .map(([categoryId, amount]) => {
        const category = EXPENSE_CATEGORIES.find((item) => item.id === categoryId)
        return {
          name: category?.name || categoryId,
          amount: compactFormatCurrency(amount, currency, rates),
          percent: `${total ? Math.round((amount / total) * 100) : 0}%`,
          color: category?.color || "#9ca3af",
          icon: category?.component || EXPENSE_CATEGORIES[10].component,
        }
      })
      .sort((a, b) => Number.parseInt(b.percent) - Number.parseInt(a.percent))
  }, [
    activeExpenses,
    topSpendingTimeframe,
    currency,
    rates,
  ])

  return (
    <div className="flex min-w-0 flex-col xl:flex-row">
      <div className="min-w-0 flex-1 px-4 py-4 sm:px-8 sm:py-6">
        {/* ── Mobile Hero: greeting + today's spending ── */}
        <div className="sm:hidden mb-4">
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900 px-5 pt-5 pb-6 shadow-md">
            {/* Decorative circle */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -right-2 top-8 h-16 w-16 rounded-full bg-emerald-500/20" />

            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest">
                {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(now)}
              </p>
              <h1 className="mt-0.5 break-words text-base font-bold text-white">
                Good morning, {userName} 👋
              </h1>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest">Today's Spending</p>
              <p className="mt-1.5 break-words text-[clamp(1.75rem,10vw,2.25rem)] font-extrabold tracking-tight text-white tabular-nums">
                {formatCompact(todayTotal)}
              </p>
              {todayVsYesterdayDiff !== null ? (
                <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${todayVsYesterdayDiff <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {todayVsYesterdayDiff <= 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(todayVsYesterdayDiff)}% vs. yesterday
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">No spending yesterday</p>
              )}
            </div>
          </div>

          {/* Two compact tiles: This Month + This Year */}
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div className="min-w-0 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 dark:bg-purple-900/20 dark:text-purple-400">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">This Month</span>
              </div>
              <p className="mt-2 whitespace-nowrap text-[clamp(0.875rem,5vw,1.25rem)] font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">{formatCompact(thisMonthTotal)}</p>
              <div className="mt-1">
                <MonthlySpendingComparison
                  values={weeklySpendingTrend}
                  difference={monthVsLastMonthDiff}
                  compact
                />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                  thisMonthNet >= 0
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                }`}>
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Net Flow</span>
              </div>
              <p className={`mt-2 break-words text-[clamp(0.875rem,5vw,1.25rem)] font-bold tracking-tight tabular-nums ${
                thisMonthNet >= 0 ? "text-zinc-900 dark:text-white" : "text-red-600 dark:text-red-400"
              }`}>
                {thisMonthNet >= 0 ? "+" : ""}{formatCompact(thisMonthNet)}
              </p>
              <p className={`mt-1 text-[11px] font-medium ${
                thisMonthNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}>
                {thisMonthNet >= 0 ? "Savings on track" : "Over spending"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Desktop / tablet header (sm+) ── */}
        <div className="hidden sm:block">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white dark:text-white">
                Good morning, {userName} 👋
              </h1>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
                {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(now)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddExpense()}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>

          {/* ── Stat Cards (desktop only) ── */}
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <FinancialSummaryCard
              title="Today's spending"
              amountCompact={formatCompact(todayTotal)}
              amountFull={formatCurrency(todayTotal)}
              trendNode={
                todayVsYesterdayDiff !== null ? (
                  <span className={`font-medium ${todayVsYesterdayDiff <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {Math.abs(todayVsYesterdayDiff)}% {todayVsYesterdayDiff <= 0 ? "lower" : "higher"} than yesterday
                  </span>
                ) : (
                  <span>No data yesterday</span>
                )
              }
            />

            <FinancialSummaryCard
              title="Monthly spending"
              amountCompact={formatCompact(thisMonthTotal)}
              amountFull={formatCurrency(thisMonthTotal)}
              trendNode={
                <MonthlySpendingComparison
                  values={weeklySpendingTrend}
                  difference={monthVsLastMonthDiff}
                  yearTotal={formatCompact(thisYearTotal)}
                />
              }
            />

            <FinancialSummaryCard
              title="Monthly income"
              amountCompact={formatCompact(thisMonthIncome)}
              amountFull={formatCurrency(thisMonthIncome)}
              amountColorClass="text-emerald-600 dark:text-emerald-400"
              trendNode={
                <div className="flex justify-between gap-2">
                  <span>Year total</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatCompact(thisYearIncome)}</span>
                </div>
              }
            />

            <FinancialSummaryCard
              title="Monthly net"
              amountCompact={(thisMonthNet > 0 ? "+" : "") + formatCompact(thisMonthNet)}
              amountFull={(thisMonthNet > 0 ? "+" : "") + formatCurrency(thisMonthNet)}
              amountColorClass={thisMonthNet >= 0 ? "text-zinc-900 dark:text-white" : "text-red-600 dark:text-red-400"}
              trendNode={
                <span className={`font-medium ${thisMonthNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {thisMonthNet > 0
                    ? "More income than spending"
                    : thisMonthNet < 0
                    ? "More spending than income"
                    : "Income equals spending"}
                </span>
              }
            />
          </section>
        </div>


        {/* ── Budget Health & Financial Insight ── */}
        <section className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 sm:grid-cols-2">
          {/* Budget Widget */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3.5 shadow-xs sm:p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Target className="h-4 w-4 shrink-0 text-purple-600" />
                <span className="min-w-0 break-words font-semibold text-zinc-900 dark:text-white dark:text-white">Monthly Budget Goal</span>
              </div>
              <span className="break-words font-bold text-zinc-900 dark:text-white dark:text-white sm:text-right">
                {formatCurrency(thisMonthTotal)} / {formatCurrency(budgetGoal)}
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetSpentPct >= 100
                    ? "bg-red-500"
                    : budgetSpentPct > 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, budgetSpentPct)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
              <span>{budgetSpentPct}% spent</span>
              <span>
                {budgetGoal > thisMonthTotal
                  ? `${formatCurrency(budgetGoal - thisMonthTotal)} remaining`
                  : "Over budget"}
              </span>
            </div>
          </div>

          {/* Financial Insight Card */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-[#f0fdf4] dark:border-emerald-900/50 dark:bg-emerald-500/5 p-3.5 sm:p-4 dark:border-emerald-900/50 dark:bg-emerald-500/5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 dark:text-emerald-400 dark:bg-zinc-800 dark:text-emerald-400 shadow-2xs dark:bg-zinc-800 dark:text-emerald-400">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white dark:text-white">Spending Insight</p>
                <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed dark:text-zinc-400">
                  {categoryData[0]
                    ? `${categoryData[0].name} is your top category at ${formatCategoryPercent(categoryData[0].percent)} this month.`
                    : "No spending recorded yet."}
                </p>
              </div>
            </div>
            <Link
              to="/analytics"
              className="flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:text-emerald-400"
            >
              Analyze <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Monthly Spending + Spending by Category */}
        <section className="mt-5 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-2">
          {/* Monthly Spending Chart */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Monthly Spending
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {monthlySpendingTimeframe === "this_month"
                    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now)
                    : monthlySpendingTimeframe === "last_month"
                    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(now.getFullYear(), now.getMonth() - 1, 1))
                    : "All Time"}
                </p>
              </div>

              <select
                value={monthlySpendingTimeframe}
                onChange={(e) => setMonthlySpendingTimeframe(e.target.value as "this_month" | "last_month" | "all_time")}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none transition focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="all_time">All Time</option>
              </select>
            </div>

            <div className="mt-4 h-44 w-full sm:mt-5 sm:h-52 outline-none focus:outline-none [&_*]:outline-none select-none">
              <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                <BarChart
                  data={dailyBarData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  style={{ outline: "none" }}
                >
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? "#71717a" : "#a1a1aa", fontSize: 10 }}
                    ticks={[1, 5, 10, 15, 20, 25, 30]}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? "#71717a" : "#a1a1aa", fontSize: 10 }}
                    tickFormatter={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
                    domain={[0, 400000]}
                    ticks={[0, 100000, 200000, 300000, 400000]}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), "Spending"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e4e4e7",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    }}
                    cursor={isDark ? { fill: "#27272a" } : { fill: "#f4f4f5" }}
                  />
                  <Bar
                    dataKey="spending"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending by Category */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Spending by Category
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-400">Total spent</p>
                <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {formatCompact(categoryData.reduce((sum, category) => sum + category.amount, 0))}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {visibleCategoryData.length > 0 ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={visibleCategoryData}
                          dataKey="amount"
                          nameKey="name"
                          innerRadius={38}
                          outerRadius={58}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {visibleCategoryData.map((category) => (
                            <Cell key={category.id} fill={category.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="max-w-[88px] truncate text-xs font-bold tabular-nums text-zinc-900 dark:text-white" title={formatCurrency(categoryTotal)}>
                        {formatCompact(categoryTotal)}
                      </span>
                      <span className="text-[10px] text-zinc-400">Total</span>
                    </div>
                  </div>
                  <div className="w-full min-w-0 flex-1 space-y-2">
                    {visibleCategoryData.map((category) => (
                      <div key={category.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="line-clamp-2 min-w-0 break-words font-medium text-zinc-800 dark:text-zinc-200" title={category.name}>
                            {category.name}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 tabular-nums">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300" title={formatCurrency(category.amount)}>
                            {formatCompact(category.amount)}
                          </span>
                          <span className="w-10 text-right text-zinc-400">
                            {formatCategoryPercent(category.percent)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-zinc-400">
                  No spending recorded this month.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Recent Expenses Table */}
        <section className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <Clock3 className="h-4 w-4 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Recent Expenses & Income
                  </h2>
                  <p className="text-xs text-zinc-400">Your latest transactions</p>
                </div>
              </div>

              <Link
                to="/history"
                className="flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-400"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>


            <div className="hidden border-b border-zinc-100 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:border-zinc-800 2xl:grid 2xl:grid-cols-[5rem_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.9fr)_2.75rem] 2xl:items-center 2xl:gap-3">
              <span>Date</span>
              <span>Item</span>
              <span>Category</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentExpenses.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-zinc-400 sm:px-5">
                  No transactions yet.
                </p>
              ) : recentExpenses.map((expense) => {
                const isIncome = expense.type === "income"
                const activeCats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                const cat = activeCats.find((c) => c.id === expense.categoryId)
                const Icon = cat?.component
                const color = cat?.color || (isIncome ? "#10b981" : "#9ca3af")
                const isMenuOpen = openActionMenuId === expense.id

                // Clean date label without time
                const formatRecentDate = (d: string) => {
                  if (d === today) return "Today"
                  if (d === yesterday) return "Yesterday"
                  const parts = d.split("-").map(Number)
                  if (parts.length === 3) {
                    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                      new Date(parts[0], parts[1] - 1, parts[2])
                    )
                  }
                  return d
                }

                return (
                  <div
                    key={expense.id}
                    className="relative grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-2 px-3 py-3 transition sm:gap-3 sm:px-5 sm:py-3.5 2xl:grid-cols-[5rem_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.9fr)_2.75rem]"
                  >
                    {onViewExpense && (
                      <button
                        type="button"
                        onClick={() => onViewExpense(expense)}
                        aria-label={`View transaction details for ${expense.item}`}
                        className="absolute inset-0 z-0 cursor-pointer rounded-xl text-left transition-colors hover:bg-emerald-50/40 active:bg-emerald-50 dark:hover:bg-emerald-500/5 dark:active:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                      />
                    )}
                    {/* Date */}
                    <div className="pointer-events-none relative z-10 hidden min-w-0 truncate text-xs font-semibold text-zinc-600 dark:text-zinc-400 2xl:block">
                      {formatRecentDate(expense.date)}
                    </div>

                    {/* Item with Icon and ellipsis truncation */}
                    <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: color + "18" }}
                      >
                        {Icon && <Icon className="h-4 w-4" style={{ color }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-xs font-semibold text-zinc-900 dark:text-white sm:line-clamp-2 sm:whitespace-normal sm:break-words sm:text-sm">
                          {expense.item}
                        </span>
                        <span
                          title={cat?.name || expense.categoryName}
                          className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400 2xl:hidden"
                        >
                          {formatRecentDate(expense.date)} · {cat?.name || expense.categoryName}
                        </span>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="pointer-events-none relative z-10 hidden min-w-0 2xl:block">
                      <span
                        title={cat?.name || expense.categoryName}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50"
                            : cat?.badgeBg || "bg-zinc-100 dark:bg-zinc-800"
                        } ${isIncome ? "" : cat?.badgeText || "text-zinc-700 dark:text-zinc-300"} max-w-full truncate`}
                      >
                        {cat?.name || expense.categoryName}
                      </span>
                    </div>

                    {/* Amount */}
                    <div
                      className={`pointer-events-none relative z-10 whitespace-nowrap text-right text-xs font-semibold tabular-nums sm:text-sm ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-white"
                      }`}
                      title={isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                    >
                      {isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                    </div>

                    <div className="relative z-20">
                      <TransactionActionsMenu
                        itemName={expense.item}
                        open={isMenuOpen}
                        onOpenChange={(open) => setOpenActionMenuId(open ? expense.id : null)}
                        onViewDetails={onViewExpense ? () => onViewExpense(expense) : undefined}
                        onDelete={onDeleteExpense ? () => setExpensePendingDeletion(expense) : undefined}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
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

          {/* Quick Add */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Quick Add</h2>
                <p className="text-xs text-zinc-400">Add a new expense in seconds</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {quickAddCategories.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onAddExpense(item.id)}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-800/50 p-3 transition hover:border-zinc-200 hover:bg-white dark:hover:border-zinc-700 dark:hover:bg-zinc-800 hover:shadow-xs active:scale-95"
                  >
                    <div
                      className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      {item.name}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate("/categories")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              More Categories
            </button>
          </div>
        </section>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col gap-5 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 p-5 xl:flex xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
        <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <button
              type="button"
              onClick={prevCalendarMonth}
              className="rounded-md p-1 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarViewMonth)}
            </span>
            <button
              type="button"
              onClick={nextCalendarMonth}
              className="rounded-md p-1 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-medium text-zinc-400">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: calendarDaysInMonth }, (_, idx) => {
              const day = idx + 1
              const isSelected = selectedCalendarDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedCalendarDay(day)}
                  className={`flex items-center justify-center rounded-full py-1 text-xs font-medium transition ${
                    isSelected
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day's Summary */}
        <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-white">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span>
                {isCalendarDayToday
                  ? "Today's Summary"
                  : `${new Intl.DateTimeFormat("en-US", { month: "short" }).format(calendarViewMonth)} ${selectedCalendarDay} Summary`}
              </span>
            </div>
            <span className="text-[10px] font-normal text-zinc-400">
              {selectedDayExpenses.length} items
            </span>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Expenses</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white" title={formatCurrency(calendarDaySpent)}>
                {formatCompact(calendarDaySpent)}{" "}
                <ArrowUpRight className="h-3 w-3 text-red-500 dark:text-red-400" />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Income</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white" title={formatCurrency(calendarDayIncome)}>
                {calendarDayIncome > 0 ? (
                  <>
                    {formatCompact(calendarDayIncome)}{" "}
                    <ArrowDownRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </>
                ) : (
                  `${formatCurrency(0)} —`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800 font-medium">
              <span className="text-zinc-700 dark:text-zinc-300">Net</span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  calendarDayNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                }`}
                title={formatCurrency(calendarDayNet)}
              >
                {formatCompact(Math.abs(calendarDayNet))}
                {calendarDayNet >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-red-500 dark:text-red-400" />
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Top Spending Items */}
        <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Top Spending Items
            </div>
            <select
              value={topSpendingTimeframe}
              onChange={(e) => setTopSpendingTimeframe(e.target.value as "this_month" | "last_month")}
              className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 outline-none"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {topSpendingItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <BarChart3 className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No spending yet</p>
                <p className="text-[11px] text-zinc-400">
                  {topSpendingTimeframe === "last_month" ? "No expenses recorded last month." : "Add your first expense to see trends."}
                </p>
              </div>
            ) : (
              topSpendingItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: item.color + "18" }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                      </div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right shrink-0 ml-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.amount}</span>
                      <span className="text-[10px] text-zinc-400">{item.percent}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 dark:bg-emerald-500/5 p-4">
          <div className="flex items-start gap-2.5">
            <Sprout className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                "Small changes in your spending habits can create big results over time."
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Keep going!
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
