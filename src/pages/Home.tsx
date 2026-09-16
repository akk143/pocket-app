import { useState, useMemo } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  MoreVertical,
  Plus,
  
  TrendingUp,
  Zap,
  Sprout,
  BarChart3,
  Calendar,
  Pencil,
  Trash2,
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
import { convertAndFormatCurrency } from "../lib/currency"

interface HomeProps {
  expenses: Expense[]
  userName?: string
  onAddExpense: (categoryId?: string) => void
  onEditExpense?: (expense: Expense) => void
  onDeleteExpense?: (expenseId: string) => void
  onSeedDemoData?: () => void
}

export default function Home({
  expenses,
  userName = "John",
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onSeedDemoData,
}: HomeProps) {
  const { currency, rates } = useCurrency()
  const formatCurrency = (amount: number) => convertAndFormatCurrency(amount, currency, rates)

  const navigate = useNavigate()
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => new Date().getDate())
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
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

  const isUsingFallback = expenses.length === 0

  const activeExpenses = useMemo(() => {
    if (expenses.length > 0) return expenses

    const dateStr = "2026-09-07"
    const yesterdayStr = "2026-09-06"
    return [
      {
        id: "demo-1",
        type: "expense",
        amount: 25000,
        categoryId: "drinks",
        categoryName: "Drinks",
        item: "Vietnamese Coffee",
        note: "Morning coffee",
        date: dateStr,
        time: "8:30 AM",
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: "demo-2",
        type: "expense",
        amount: 100000,
        categoryId: "food",
        categoryName: "Food",
        item: "Lunch",
        note: "With teammates",
        date: dateStr,
        time: "1:00 PM",
        createdAt: Date.now() - 3600000 * 1,
      },
      {
        id: "demo-3",
        type: "expense",
        amount: 30000,
        categoryId: "transportation",
        categoryName: "Transportation",
        item: "Grab",
        note: "",
        date: dateStr,
        time: "12:15 PM",
        createdAt: Date.now() - 3600000 * 1.5,
      },
      {
        id: "demo-4",
        type: "expense",
        amount: 250000,
        categoryId: "shopping",
        categoryName: "Shopping",
        item: "T-Shirt",
        note: "",
        date: yesterdayStr,
        time: "6:00 PM",
        createdAt: Date.now() - 86400000 - 3600000 * 3,
      },
      {
        id: "demo-5",
        type: "expense",
        amount: 45000,
        categoryId: "drinks",
        categoryName: "Drinks",
        item: "Milk Tea",
        note: "",
        date: yesterdayStr,
        time: "5:30 PM",
        createdAt: Date.now() - 86400000 - 3600000 * 4,
      },
    ] as Expense[]
  }, [expenses])

  // Current dates
  const now = new Date()
  const toLocalDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  const monthKey = (date: Date) => toLocalDateKey(date).slice(0, 7)
  const transactionMonthKey = (value: string) => value.slice(0, 7)
  const today = toLocalDateKey(now)
  const thisMonthKey = monthKey(now)
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  // 1. Today's Spending (only expense type)
  const todayExpenses = activeExpenses.filter((e) => {
    if (e.type === "income") return false
    if (isUsingFallback && e.date === "2026-09-07") return true
    const createdDateKey = toLocalDateKey(new Date(e.createdAt))
    return e.date === today || createdDateKey === today
  })
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0)

  // 2. This Month's Spending
  const thisMonthTotal = isUsingFallback
    ? 4850000
    : activeExpenses
        .filter((e) => {
          if (e.type === "income") return false
          const [y, m] = e.date.split("-").map(Number)
          return y === now.getFullYear() && m === now.getMonth() + 1
        })
        .reduce((sum, e) => sum + e.amount, 0)

  // 3. This Year's Spending
  const thisYearTotal = isUsingFallback
    ? 42300000
    : activeExpenses
        .filter((e) => {
          if (e.type === "income") return false
          const now = new Date()
          return Number(e.date.split("-")[0]) === now.getFullYear()
        })
        .reduce((sum, e) => sum + e.amount, 0)

  // Deltas vs previous periods
  const yesterday = toLocalDateKey(new Date(now.getTime() - 86400000))
  const yesterdayExpenses = activeExpenses.filter(
    (e) =>
      e.type !== "income" &&
      (e.date === yesterday || (isUsingFallback && e.date === "2026-09-06"))
  )
  const yesterdayTotal = isUsingFallback
    ? 295000
    : yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0)
  const todayVsYesterdayDiff = yesterdayTotal > 0
    ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
    : null

  const lastMonthExpenses = activeExpenses.filter(
    (e) =>
      e.type !== "income" &&
      transactionMonthKey(e.date) === lastMonthKey
  )
  const lastMonthTotal = isUsingFallback
    ? 5500000
    : lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const monthVsLastMonthDiff = lastMonthTotal > 0
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null

  const lastYear = now.getFullYear() - 1
  const lastYearExpenses = activeExpenses.filter(
    (e) =>
      e.type !== "income" &&
      Number(e.date.split("-")[0]) === lastYear
  )
  const lastYearTotal = isUsingFallback
    ? 39000000
    : lastYearExpenses.reduce((sum, e) => sum + e.amount, 0)
  const yearVsLastYearDiff = lastYearTotal > 0
    ? Math.round(((thisYearTotal - lastYearTotal) / lastYearTotal) * 100)
    : null

  // Budget calculations
  const budgetGoal = useMemo(() => {
    return Number(localStorage.getItem("pocket_budget")) || 5000000
  }, [])
  const budgetSpentPct = Math.round((thisMonthTotal / budgetGoal) * 100)

  // Recent 5 transactions
  const recentExpenses = useMemo(() => {
    return [...activeExpenses].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  }, [activeExpenses])

  // Category Chart Table
  const categoryData = useMemo(() => {
    if (isUsingFallback) {
      return [
        { name: "Food", amount: 1800000, percent: 37, color: "#f97316", id: "food" },
        { name: "Drinks", amount: 650000, percent: 13, color: "#10b981", id: "drinks" },
        { name: "Transportation", amount: 550000, percent: 11, color: "#3b82f6", id: "transportation" },
        { name: "Shopping", amount: 450000, percent: 9, color: "#ec4899", id: "shopping" },
        { name: "Housing", amount: 400000, percent: 8, color: "#8b5cf6", id: "rent" },
        { name: "Other", amount: 1000000, percent: 22, color: "#9ca3af", id: "other" },
      ]
    }

    const catMap: Record<string, number> = {}
    activeExpenses
      .filter((e) => e.type !== "income")
      .forEach((e) => {
        catMap[e.categoryId] = (catMap[e.categoryId] || 0) + e.amount
      })

    const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1

    return Object.entries(catMap)
      .map(([catId, amount]) => {
        const cat = EXPENSE_CATEGORIES.find((c) => c.id === catId)
        return {
          id: catId,
          name: cat?.name || catId,
          amount,
          percent: Math.round((amount / total) * 100),
          color: cat?.color || "#9ca3af",
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [activeExpenses, isUsingFallback])

  // Daily Data for the Month (30 days)
  const dailyBarData = useMemo(() => {
    const selectedMonthKey =
      monthlySpendingTimeframe === "this_month"
        ? thisMonthKey
        : monthlySpendingTimeframe === "last_month"
        ? lastMonthKey
        : null
    const timeframeExpenses =
      isUsingFallback && monthlySpendingTimeframe === "this_month"
        ? activeExpenses
        : activeExpenses.filter(
            (expense) =>
              expense.type !== "income" &&
              (selectedMonthKey === null ||
                transactionMonthKey(expense.date) === selectedMonthKey),
          )

    if (isUsingFallback && monthlySpendingTimeframe === "this_month") {
      const mockAmounts = [
        0, 120000, 150000, 130000, 240000, 180000, 160000, 290000, 140000, 150000,
        170000, 130000, 220000, 250000, 350000, 240000, 190000, 170000, 150000,
        140000, 210000, 190000, 160000, 230000, 200000, 180000, 150000, 120000,
        110000, 140000,
      ]
      return Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        spending: mockAmounts[i] || 100000,
      }))
    }

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
    isUsingFallback,
    lastMonthKey,
    monthlySpendingTimeframe,
    thisMonthKey,
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
      if (isUsingFallback && (selectedCalendarDay === 7 || selectedCalendarDay === 8)) {
        return true
      }
      const createdDateKey = toLocalDateKey(new Date(e.createdAt))
      return e.date === fullDateKey || createdDateKey === fullDateKey
    })
  }, [activeExpenses, calendarViewMonth, selectedCalendarDay, isUsingFallback])

  const isCalendarDayToday =
    calendarViewMonth.getFullYear() === now.getFullYear() &&
    calendarViewMonth.getMonth() === now.getMonth() &&
    selectedCalendarDay === now.getDate()

  const calendarDaySpent = useMemo(() => {
    if (isUsingFallback && (selectedCalendarDay === 8 || selectedCalendarDay === 7)) return 155000
    return selectedDayExpenses
      .filter((e) => e.type !== "income")
      .reduce((s, e) => s + e.amount, 0)
  }, [selectedDayExpenses, selectedCalendarDay, isUsingFallback])

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
    if (isUsingFallback && topSpendingTimeframe === "this_month") {
      return [
        { name: "Food & Drinks", amount: formatCurrency(1800000), percent: "37%", color: "#f97316", icon: EXPENSE_CATEGORIES[0].component },
        { name: "Transportation", amount: formatCurrency(550000), percent: "11%", color: "#10b981", icon: EXPENSE_CATEGORIES[2].component },
        { name: "Shopping", amount: formatCurrency(450000), percent: "9%", color: "#a855f7", icon: EXPENSE_CATEGORIES[3].component },
        { name: "Housing", amount: formatCurrency(400000), percent: "8%", color: "#3b82f6", icon: EXPENSE_CATEGORIES[4].component },
        { name: "Other", amount: formatCurrency(1000000), percent: "21%", color: "#9ca3af", icon: EXPENSE_CATEGORIES[10].component },
      ]
    }

    const selectedMonthKey =
      topSpendingTimeframe === "this_month" ? thisMonthKey : lastMonthKey
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
          amount: formatCurrency(amount),
          percent: `${total ? Math.round((amount / total) * 100) : 0}%`,
          color: category?.color || "#9ca3af",
          icon: category?.component || EXPENSE_CATEGORIES[10].component,
        }
      })
      .sort((a, b) => Number.parseInt(b.percent) - Number.parseInt(a.percent))
  }, [
    activeExpenses,
    isUsingFallback,
    lastMonthKey,
    thisMonthKey,
    topSpendingTimeframe,
    currency,
    rates,
  ])

  return (
    <div className="flex flex-col xl:flex-row">
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6">
        {isUsingFallback && onSeedDemoData && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>Design Preview Active:</strong> Dashboard shows mockup baseline values. Click button to save to your Firestore.
              </span>
            </div>
            <button
              onClick={onSeedDemoData}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white transition hover:bg-emerald-700 shadow-xs"
            >
              Seed Demo Data to Firestore
            </button>
          </div>
        )}

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
              <h1 className="mt-0.5 text-base font-bold text-white">
                Good morning, {userName} 👋
              </h1>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest">Today's Spending</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                {formatCurrency(todayTotal)}
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
                <p className="mt-1.5 text-[11px] text-zinc-500">No spending yesterday</p>
              )}
            </div>
          </div>

          {/* Two compact tiles: This Month + This Year */}
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-xs">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-zinc-500">This Month</span>
              </div>
              <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900">{formatCurrency(thisMonthTotal)}</p>
              {monthVsLastMonthDiff !== null ? (
                <div className={`mt-1 flex items-center gap-0.5 text-[11px] font-medium ${monthVsLastMonthDiff <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {monthVsLastMonthDiff <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  {Math.abs(monthVsLastMonthDiff)}% vs last
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-400">No prev. data</p>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-xs">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-zinc-500">This Year</span>
              </div>
              <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900">{formatCurrency(thisYearTotal)}</p>
              {yearVsLastYearDiff !== null ? (
                <div className={`mt-1 flex items-center gap-0.5 text-[11px] font-medium ${yearVsLastYearDiff <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {yearVsLastYearDiff <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  {Math.abs(yearVsLastYearDiff)}% vs last
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-400">No prev. data</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop / tablet header (sm+) ── */}
        <div className="hidden sm:block">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Good morning, {userName} 👋
              </h1>
              <p className="mt-1 text-xs font-medium text-zinc-500">
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
          <section className="grid gap-4 sm:grid-cols-3">
            {/* Today's Spending */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-zinc-500">Today's Spending</span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
                {formatCurrency(todayTotal)}
              </p>
              {todayVsYesterdayDiff !== null ? (
                <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${todayVsYesterdayDiff <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {todayVsYesterdayDiff <= 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  {Math.abs(todayVsYesterdayDiff)}% vs. yesterday
                </div>
              ) : (
                <div className="mt-2 text-xs font-medium text-zinc-400">No data yesterday</div>
              )}
            </div>

            {/* This Month */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-zinc-500">This Month</span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
                {formatCurrency(thisMonthTotal)}
              </p>
              {monthVsLastMonthDiff !== null ? (
                <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${monthVsLastMonthDiff <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {monthVsLastMonthDiff <= 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  {Math.abs(monthVsLastMonthDiff)}% vs. last month
                </div>
              ) : (
                <div className="mt-2 text-xs font-medium text-zinc-400">No data last month</div>
              )}
            </div>

            {/* This Year */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-zinc-500">This Year</span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
                {formatCurrency(thisYearTotal)}
              </p>
              {yearVsLastYearDiff !== null ? (
                <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${yearVsLastYearDiff <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {yearVsLastYearDiff <= 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  {Math.abs(yearVsLastYearDiff)}% vs. last year
                </div>
              ) : (
                <div className="mt-2 text-xs font-medium text-zinc-400">No data last year</div>
              )}
            </div>
          </section>
        </div>


        {/* ── Budget Health & Financial Insight ── */}
        <section className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 sm:grid-cols-2">
          {/* Budget Widget */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs sm:p-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-zinc-900">Monthly Budget Goal</span>
              </div>
              <span className="font-bold text-zinc-900">
                {formatCurrency(thisMonthTotal)} / {formatCurrency(budgetGoal)}
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
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
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{budgetSpentPct}% spent</span>
              <span>
                {budgetGoal > thisMonthTotal
                  ? `${formatCurrency(budgetGoal - thisMonthTotal)} remaining`
                  : "Over budget"}
              </span>
            </div>
          </div>

          {/* Financial Insight Card */}
          <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-[#f0fdf4] p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900">Spending Insight</p>
                <p className="mt-0.5 text-[11px] text-zinc-600 leading-relaxed">
                  Food & Drinks accounts for {categoryData[0]?.percent || 37}% of your spending this month.
                </p>
              </div>
            </div>
            <Link
              to="/analytics"
              className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Analyze &gt;
            </Link>
          </div>
        </section>

        {/* Monthly Spending + Spending by Category */}
        <section className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
          {/* Monthly Spending Chart */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
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
                onChange={(e) => setMonthlySpendingTimeframe(e.target.value as any)}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 outline-none transition focus:border-emerald-500 cursor-pointer shadow-2xs"
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
                    tick={{ fill: "#a1a1aa", fontSize: 10 }}
                    ticks={[1, 5, 10, 15, 20, 25, 30]}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 10 }}
                    tickFormatter={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
                    domain={[0, 400000]}
                    ticks={[0, 100000, 200000, 300000, 400000]}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), "Spending"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e4e4e7",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    }}
                    cursor={{ fill: "#f4f4f5" }}
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
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Spending by Category
                </h2>
                <p className="text-xs text-zinc-400">
                  {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col items-center gap-2 sm:mt-4 sm:gap-3 sm:flex-row sm:justify-between">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-40 sm:w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={60}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold text-zinc-900 whitespace-nowrap">
                    {formatCurrency(thisMonthTotal)}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400">
                    Total
                  </span>
                </div>
              </div>

              {/* Category list */}
              <div className="w-full min-w-0 flex-1 space-y-2 text-xs">
                {categoryData.slice(0, 6).map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between gap-2 text-zinc-700"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-zinc-800 truncate" title={cat.name}>
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="font-medium text-zinc-600 whitespace-nowrap">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className="w-7 text-right font-medium text-zinc-400">
                        {cat.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Recent Expenses Table */}
        <section className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 text-zinc-400" />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Recent Expenses & Income
                  </h2>
                  <p className="text-xs text-zinc-400">Your latest transactions</p>
                </div>
              </div>

              <Link
                to="/history"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View all &gt;
              </Link>
            </div>


            <div className="hidden border-b border-zinc-100 px-5 py-2.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wider sm:grid sm:grid-cols-[90px_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_28px] sm:items-center sm:gap-3">
              <span>Date</span>
              <span>Item</span>
              <span>Category</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            <div className="divide-y divide-zinc-100">
              {recentExpenses.map((expense) => {
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
                    className="relative grid grid-cols-[70px_minmax(0,1fr)_auto_24px] items-center gap-2 px-3 py-3 sm:grid-cols-[90px_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_28px] sm:gap-3 sm:px-5 sm:py-3.5 hover:bg-zinc-50/50 transition"
                  >
                    {/* Date */}
                    <div className="min-w-0 text-xs font-semibold text-zinc-600 truncate">
                      {formatRecentDate(expense.date)}
                    </div>

                    {/* Item with Icon and ellipsis truncation */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: color + "18" }}
                      >
                        {Icon && <Icon className="h-4 w-4" style={{ color }} />}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-900 truncate" title={expense.item}>
                        {expense.item}
                      </span>
                    </div>

                    {/* Category */}
                    <div className="hidden sm:block">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                            : cat?.badgeBg || "bg-zinc-100"
                        } ${isIncome ? "" : cat?.badgeText || "text-zinc-700"}`}
                      >
                        {cat?.name || expense.categoryName}
                      </span>
                    </div>

                    {/* Amount */}
                    <div
                      className={`whitespace-nowrap text-right text-xs font-semibold sm:text-sm ${
                        isIncome ? "text-emerald-600" : "text-zinc-900"
                      }`}
                    >
                      {isIncome ? `+ ${formatCurrency(expense.amount)}` : formatCurrency(expense.amount)}
                    </div>

                    <div className="relative text-right">
                      <button
                        type="button"
                        onClick={() => setOpenActionMenuId(isMenuOpen ? null : expense.id)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg z-30">
                          {onEditExpense && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null)
                                onEditExpense(expense)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              <Pencil className="h-3 w-3 text-zinc-400" />
                              Edit
                            </button>
                          )}
                          {onDeleteExpense && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null)
                                if (confirm(`Delete "${expense.item}"?`)) {
                                  onDeleteExpense(expense.id)
                                }
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Add */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Quick Add</h2>
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
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 transition hover:border-zinc-200 hover:bg-white hover:shadow-xs active:scale-95"
                  >
                    <div
                      className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-700">
                      {item.name}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate("/categories")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-zinc-500" />
              More Categories
            </button>
          </div>
        </section>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col gap-5 border-l border-zinc-200 bg-white p-5 xl:flex xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
            <button
              type="button"
              onClick={prevCalendarMonth}
              className="rounded-md p-1 hover:bg-zinc-100 text-zinc-400"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarViewMonth)}
            </span>
            <button
              type="button"
              onClick={nextCalendarMonth}
              className="rounded-md p-1 hover:bg-zinc-100 text-zinc-400"
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
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day's Summary */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-900">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-zinc-500" />
              <span>
                {isCalendarDayToday || (isUsingFallback && (selectedCalendarDay === 8 || selectedCalendarDay === 7))
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
              <span className="text-zinc-500">Expenses</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-900">
                {formatCurrency(calendarDaySpent)}{" "}
                <ArrowUpRight className="h-3 w-3 text-red-500" />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Income</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-900">
                {calendarDayIncome > 0 ? (
                  <>
                    {formatCurrency(calendarDayIncome)}{" "}
                    <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                  </>
                ) : (
                  `${formatCurrency(0)} —`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2 font-medium">
              <span className="text-zinc-700">Net</span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  calendarDayNet >= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {formatCurrency(Math.abs(calendarDayNet))}
                {calendarDayNet >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Top Spending Items */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
              Top Spending Items
            </div>
            <select
              value={topSpendingTimeframe}
              onChange={(e) => setTopSpendingTimeframe(e.target.value as "this_month" | "last_month")}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 outline-none"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {topSpendingItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <BarChart3 className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="text-xs font-medium text-zinc-500">No spending yet</p>
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
                      <span className="font-medium text-zinc-800 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right shrink-0 ml-2">
                      <span className="font-medium text-zinc-700">{item.amount}</span>
                      <span className="text-[10px] text-zinc-400">{item.percent}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-2.5">
            <Sprout className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-xs font-medium text-zinc-800 leading-relaxed">
                "Small changes in your spending habits can create big results over time."
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
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
