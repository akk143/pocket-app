import { useState, useMemo } from "react"
import { usePaginatedContent } from "../hooks/usePaginatedContent"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Minus,
} from "lucide-react"
import { Link } from "react-router-dom"
import type { Expense } from "../types/expense"
import { findCategory } from "../constants/categories"
import type { CustomCategory } from "../constants/categories"
import { useCurrency } from "../contexts/CurrencyContext"
import { compactFormatCurrency, convertAndFormatCurrency } from "../lib/currency"
import { useTheme } from "../hooks/useTheme"

interface AnalyticsProps {
  expenses: Expense[]
  customCategories?: CustomCategory[]
}

type Period = "week" | "month" | "year"

// ─── Date helpers ────────────────────────────────────────────────────────────

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function getWeekBounds(anchor: Date): [Date, Date] {
  const day = anchor.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(anchor)
  mon.setDate(anchor.getDate() + diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return [mon, sun]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function daysInYear(y: number): number {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365
}

function periodDayCount(period: Period, viewDate: Date): number {
  if (period === "week") return 7
  if (period === "year") return daysInYear(viewDate.getFullYear())
  return daysInMonth(viewDate.getFullYear(), viewDate.getMonth() + 1)
}

function filterByPeriod(list: Expense[], period: Period, anchor: Date): Expense[] {
  if (period === "year") {
    const y = anchor.getFullYear()
    return list.filter((e) => Number(e.date.slice(0, 4)) === y)
  }
  if (period === "week") {
    const [mon, sun] = getWeekBounds(anchor)
    const monT = mon.getTime()
    const sunT = sun.getTime()
    return list.filter((e) => {
      const t = parseLocalDate(e.date).getTime()
      return t >= monT && t <= sunT
    })
  }
  const y = anchor.getFullYear()
  const m = anchor.getMonth() + 1
  return list.filter((e) => {
    const [ey, em] = e.date.split("-").map(Number)
    return ey === y && em === m
  })
}

function prevPeriodAnchor(period: Period, anchor: Date): Date {
  const d = new Date(anchor)
  if (period === "week") {
    d.setDate(d.getDate() - 7)
  } else if (period === "year") {
    d.setFullYear(d.getFullYear() - 1)
  } else {
    const prevMonth = anchor.getMonth() - 1
    const prevYear = prevMonth < 0 ? anchor.getFullYear() - 1 : anchor.getFullYear()
    const normMonth = ((prevMonth % 12) + 12) % 12
    const lastDay = daysInMonth(prevYear, normMonth + 1)
    d.setFullYear(prevYear)
    d.setMonth(normMonth)
    d.setDate(Math.min(anchor.getDate(), lastDay))
  }
  return d
}

function safeDivide(n: number, d: number) {
  return d ? n / d : 0
}

function yFmt(v: number): string {
  if (v === 0) return "0"
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(Math.round(v))
}

// ─── Stat tile for the 5-metric strip ────────────────────────────────────────

function StatCard({
  label,
  value,
  fullValue,
  sub,
  accent = "neutral",
  className = "",
}: {
  label: string
  value: string
  fullValue?: string
  sub?: React.ReactNode
  accent?: "red" | "green" | "neutral"
  className?: string
}) {
  const valueColor =
    accent === "red"
      ? "text-red-500 dark:text-red-400"
      : accent === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-zinc-900 dark:text-white"

  return (
    <div
      className={`flex min-w-0 flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 sm:p-4 ${className}`}
    >
      <span className="truncate text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <div className="my-1.5 min-w-0" title={fullValue}>
        <span className={`break-words text-lg font-bold tracking-tight tabular-nums sm:text-xl ${valueColor}`}>
          {value}
        </span>
      </div>
      <div className="truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
        {sub}
      </div>
    </div>
  )
}

function Delta({
  pct,
  invert = false,
}: {
  pct: number | null
  invert?: boolean
}) {
  if (pct === null)
    return <span className="text-[11px] text-zinc-400 dark:text-zinc-500">—</span>
  const up = pct > 0
  const good = invert ? !up : up
  const Icon = pct === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
        pct === 0
          ? "text-zinc-400 dark:text-zinc-500"
          : good
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400"
      }`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── Day-of-week heatmap cell ─────────────────────────────────────────────────

function heatColor(ratio: number, isDark: boolean): string {
  // 0 → muted, 1 → full green
  if (ratio === 0) return isDark ? "#27272a" : "#f4f4f5"
  const intensity = Math.round(ratio * 255)
  // blend from zinc-100 (#f4f4f5) to emerald-500 (#10b981)
  const r = Math.round(244 - ratio * (244 - 16))
  const g = Math.round(244 - ratio * (244 - 185))
  const b = Math.round(245 - ratio * (245 - 129))
  void intensity
  return `rgb(${r},${g},${b})`
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Analytics({ expenses, customCategories = [] }: AnalyticsProps) {
  const { currency, rates } = useCurrency()
  const fmt = (v: number) => convertAndFormatCurrency(v, currency, rates)
  const fmtC = (v: number) => compactFormatCurrency(v, currency, rates)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [period, setPeriod] = useState<Period>("month")
  const [viewDate, setViewDate] = useState(new Date())

  // Composite key: animates when either period or view date changes
  const analyticsNavKey = `${period}-${viewDate.getFullYear()}-${viewDate.getMonth()}-${viewDate.getDate()}`
  const { contentKey: analyticsKey, animClass: analyticsAnim } = usePaginatedContent(analyticsNavKey)

  const tooltipStyle = isDark
    ? { borderRadius: "10px", border: "1px solid #3f3f46", background: "#18181b", color: "#fafafa", fontSize: "12px" }
    : { borderRadius: "10px", border: "1px solid #e4e4e7", background: "#fff", color: "#09090b", fontSize: "12px" }
  const cursorStyle = isDark ? { fill: "#27272a" } : { fill: "#f4f4f5" }
  const tickColor = isDark ? "#52525b" : "#a1a1aa"
  const gridColor = isDark ? "#27272a" : "#f4f4f5"

  // ── Period nav ──────────────────────────────────────────────────────────────
  function prevPeriod() {
    setViewDate((d) => {
      const n = new Date(d)
      if (period === "week") n.setDate(d.getDate() - 7)
      else if (period === "year") n.setFullYear(d.getFullYear() - 1)
      else n.setMonth(d.getMonth() - 1)
      return n
    })
  }
  function nextPeriod() {
    setViewDate((d) => {
      const n = new Date(d)
      if (period === "week") n.setDate(d.getDate() + 7)
      else if (period === "year") n.setFullYear(d.getFullYear() + 1)
      else n.setMonth(d.getMonth() + 1)
      return n
    })
  }

  const periodLabel = useMemo(() => {
    if (period === "year") return String(viewDate.getFullYear())
    if (period === "week") {
      const [mon, sun] = getWeekBounds(viewDate)
      return `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    }
    return viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }, [viewDate, period])

  // ── Split ───────────────────────────────────────────────────────────────────
  const allExp = useMemo(() => expenses.filter((e) => e.type !== "income"), [expenses])
  const allInc = useMemo(() => expenses.filter((e) => e.type === "income"), [expenses])

  // current period
  const pExp = useMemo(() => filterByPeriod(allExp, period, viewDate), [allExp, period, viewDate])
  const pInc = useMemo(() => filterByPeriod(allInc, period, viewDate), [allInc, period, viewDate])

  // previous period
  const prevAnchor = useMemo(() => prevPeriodAnchor(period, viewDate), [period, viewDate])
  const ppExp = useMemo(() => filterByPeriod(allExp, period, prevAnchor), [allExp, period, prevAnchor])
  const ppInc = useMemo(() => filterByPeriod(allInc, period, prevAnchor), [allInc, period, prevAnchor])

  const totalExp = useMemo(() => pExp.reduce((s, e) => s + e.amount, 0), [pExp])
  const totalInc = useMemo(() => pInc.reduce((s, e) => s + e.amount, 0), [pInc])
  const netFlow = totalInc - totalExp
  const totalDays = periodDayCount(period, viewDate)

  const ppTotalExp = useMemo(() => ppExp.reduce((s, e) => s + e.amount, 0), [ppExp])
  const ppTotalInc = useMemo(() => ppInc.reduce((s, e) => s + e.amount, 0), [ppInc])

  const pctChange = (c: number, p: number) => (p === 0 ? null : ((c - p) / p) * 100)
  const expDelta = pctChange(totalExp, ppTotalExp)
  const incDelta = pctChange(totalInc, ppTotalInc)

  const activeDays = useMemo(() => new Set(pExp.map((e) => e.date)).size, [pExp])
  const avgPerActiveDay = activeDays > 0 ? safeDivide(totalExp, activeDays) : 0
  const avgPerPeriodDay = safeDivide(totalExp, totalDays)

  // ── Cumulative area chart data ──────────────────────────────────────────────
  const areaData = useMemo(() => {
    if (period === "week") {
      const [mon] = getWeekBounds(viewDate)
      const eMap: Record<number, number> = {}
      const iMap: Record<number, number> = {}
      pExp.forEach((e) => { const i = (parseLocalDate(e.date).getDay() + 6) % 7; eMap[i] = (eMap[i] || 0) + e.amount })
      pInc.forEach((e) => { const i = (parseLocalDate(e.date).getDay() + 6) % 7; iMap[i] = (iMap[i] || 0) + e.amount })
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      let cumExp = 0, cumInc = 0
      return days.map((name, i) => {
        const date = new Date(mon); date.setDate(mon.getDate() + i)
        cumExp += eMap[i] || 0
        cumInc += iMap[i] || 0
        return { label: `${name} ${date.getDate()}`, short: name, exp: cumExp, inc: cumInc, dailyExp: eMap[i] || 0, dailyInc: iMap[i] || 0 }
      })
    }
    if (period === "year") {
      const eMap: Record<number, number> = {}
      const iMap: Record<number, number> = {}
      pExp.forEach((e) => { const m = Number(e.date.split("-")[1]) - 1; eMap[m] = (eMap[m] || 0) + e.amount })
      pInc.forEach((e) => { const m = Number(e.date.split("-")[1]) - 1; iMap[m] = (iMap[m] || 0) + e.amount })
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      let cumExp = 0, cumInc = 0
      return months.map((name, i) => {
        cumExp += eMap[i] || 0
        cumInc += iMap[i] || 0
        return { label: name, short: name, exp: cumExp, inc: cumInc, dailyExp: eMap[i] || 0, dailyInc: iMap[i] || 0 }
      })
    }
    // month
    const y = viewDate.getFullYear(), m = viewDate.getMonth() + 1
    const dim = daysInMonth(y, m)
    const eMap: Record<number, number> = {}
    const iMap: Record<number, number> = {}
    pExp.forEach((e) => { const d = Number(e.date.split("-")[2]); if (d) eMap[d] = (eMap[d] || 0) + e.amount })
    pInc.forEach((e) => { const d = Number(e.date.split("-")[2]); if (d) iMap[d] = (iMap[d] || 0) + e.amount })
    let cumExp = 0, cumInc = 0
    return Array.from({ length: dim }, (_, i) => {
      cumExp += eMap[i + 1] || 0
      cumInc += iMap[i + 1] || 0
      return { label: String(i + 1), short: String(i + 1), exp: cumExp, inc: cumInc, dailyExp: eMap[i + 1] || 0, dailyInc: iMap[i + 1] || 0 }
    })
  }, [period, pExp, pInc, viewDate])

  const hasAreaData = areaData.some((d) => d.exp > 0 || d.inc > 0)

  // ── Category breakdown (ranked table) ──────────────────────────────────────
  const catBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number; prevAmount: number }> = {}
    pExp.forEach((e) => {
      if (!map[e.categoryId]) map[e.categoryId] = { amount: 0, count: 0, prevAmount: 0 }
      map[e.categoryId].amount += e.amount
      map[e.categoryId].count += 1
    })
    ppExp.forEach((e) => {
      if (!map[e.categoryId]) map[e.categoryId] = { amount: 0, count: 0, prevAmount: 0 }
      map[e.categoryId].prevAmount += e.amount
    })
    const tot = Object.values(map).reduce((s, v) => s + v.amount, 0) || 0
    return Object.entries(map)
      .map(([id, { amount, count, prevAmount }]) => {
        const cat = findCategory(id, customCategories, { type: "expense" })
        return {
          id,
          name: cat.name ?? id,
          amount,
          count,
          prevAmount,
          pct: tot > 0 ? (amount / tot) * 100 : 0,
          delta: pctChange(amount, prevAmount),
          color: cat.color ?? "#9ca3af",
          component: cat.component,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [pExp, ppExp, customCategories])

  const catTotal = catBreakdown.reduce((s, c) => s + c.amount, 0)

  // ── Daily spend bar (for heatmap-style mini bars) ──────────────────────────
  const dailyBars = useMemo(() => {
    if (period !== "month") return []
    const y = viewDate.getFullYear(), m = viewDate.getMonth() + 1
    const dim = daysInMonth(y, m)
    const map: Record<number, number> = {}
    pExp.forEach((e) => { const d = Number(e.date.split("-")[2]); if (d) map[d] = (map[d] || 0) + e.amount })
    const maxVal = Math.max(...Object.values(map), 1)
    return Array.from({ length: dim }, (_, i) => ({
      d: i + 1,
      v: map[i + 1] || 0,
      ratio: (map[i + 1] || 0) / maxVal,
    }))
  }, [period, pExp, viewDate])

  // ── Day-of-week spend pattern (for all periods) ───────────────────────────
  const dowPattern = useMemo(() => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const totals = Array(7).fill(0)
    const counts = Array(7).fill(0)
    pExp.forEach((e) => {
      const dow = (parseLocalDate(e.date).getDay() + 6) % 7
      totals[dow] += e.amount
      counts[dow] += 1
    })
    const maxTotal = Math.max(...totals, 1)
    return dayNames.map((name, i) => ({
      name,
      total: totals[i],
      avg: counts[i] > 0 ? totals[i] / counts[i] : 0,
      count: counts[i],
      ratio: totals[i] / maxTotal,
    }))
  }, [pExp])

  // ── Top items ranked table ─────────────────────────────────────────────────
  const topItems = useMemo(() => {
    const map: Record<string, { catId: string; catName: string; amount: number; count: number }> = {}
    pExp.forEach((e) => {
      const key = e.item.trim()
      if (!key) return
      if (!map[key]) map[key] = { catId: e.categoryId, catName: e.categoryName, amount: 0, count: 0 }
      map[key].amount += e.amount
      map[key].count += 1
    })
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [pExp])

  // ── Income sources ─────────────────────────────────────────────────────────
  const incBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    pInc.forEach((e) => { map[e.categoryId] = (map[e.categoryId] || 0) + e.amount })
    const tot = Object.values(map).reduce((s, v) => s + v, 0) || 0
    return Object.entries(map)
      .map(([id, amount]) => {
        const cat = findCategory(id, customCategories, { type: "income" })
        return {
          id,
          name: cat.name ?? id,
          amount,
          pct: tot > 0 ? (amount / tot) * 100 : 0,
          color: cat.color ?? "#10b981",
          component: cat.component,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [pInc, customCategories])

  // ── Prior period comparison bar data ──────────────────────────────────────
  const compData = useMemo(() => {
    const prevD = prevPeriodAnchor(period, viewDate)
    const curLabel = period === "week" ? "This week" : period === "year" ? String(viewDate.getFullYear()) : viewDate.toLocaleDateString("en-US", { month: "short" })
    const prevLabel = period === "week" ? "Last week" : period === "year" ? String(prevD.getFullYear()) : prevD.toLocaleDateString("en-US", { month: "short" })
    return [
      { label: prevLabel, exp: ppTotalExp, inc: ppTotalInc },
      { label: curLabel, exp: totalExp, inc: totalInc },
    ]
  }, [period, viewDate, totalExp, totalInc, ppTotalExp, ppTotalInc])

  // ── Largest single expense ─────────────────────────────────────────────────
  const largestTx = useMemo(() => [...pExp].sort((a, b) => b.amount - a.amount)[0] ?? null, [pExp])

  // ── Savings rate ───────────────────────────────────────────────────────────
  const savingsRate = totalInc > 0 ? Math.max(0, ((totalInc - totalExp) / totalInc) * 100) : null

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 px-3.5 py-4 min-[400px]:px-4 lg:px-8 lg:py-6">

      {/* ── Header row ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white lg:text-xl">
            Analytics
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            Deep-dive into your financial patterns
          </p>
        </div>

        {/* Period tabs + navigator — side by side in one row */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Week / Month / Year tabs */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            {(["week", "month", "year"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition sm:px-3 ${
                  period === p
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* ◀ November 2026 ▶ — beside the tabs */}
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevPeriod}
              aria-label="Previous period"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[100px] text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 sm:min-w-[120px]">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={nextPeriod}
              aria-label="Next period"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div key={analyticsKey} className={`${analyticsAnim} min-w-0 w-full`}>
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
        <StatCard
          label="Total Expenses"
          value={fmtC(totalExp)}
          fullValue={fmt(totalExp)}
          accent={totalExp > 0 ? "red" : "neutral"}
          sub={
            expDelta !== null ? (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${expDelta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {expDelta <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                {Math.abs(expDelta).toFixed(1)}% <span className="font-normal text-zinc-400 dark:text-zinc-500">vs prior {period}</span>
              </span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">No prior period</span>
            )
          }
        />
        <StatCard
          label="Total Income"
          value={fmtC(totalInc)}
          fullValue={fmt(totalInc)}
          accent={totalInc > 0 ? "green" : "neutral"}
          sub={
            incDelta !== null ? (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${incDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {incDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(incDelta).toFixed(1)}% <span className="font-normal text-zinc-400 dark:text-zinc-500">vs prior {period}</span>
              </span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">No prior period</span>
            )
          }
        />
        <StatCard
          label="Net Cash Flow"
          value={(netFlow >= 0 ? "+" : "") + fmtC(netFlow)}
          fullValue={fmt(netFlow)}
          accent={netFlow >= 0 ? "green" : "red"}
          sub={
            totalInc > 0 && savingsRate !== null ? (
              <span className={`font-semibold ${savingsRate > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                {savingsRate.toFixed(0)}% <span className="font-normal text-zinc-400 dark:text-zinc-500">savings rate</span>
              </span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">Income − Expenses</span>
            )
          }
        />
        <StatCard
          label="Avg / Active Day"
          value={fmtC(avgPerActiveDay)}
          fullValue={fmt(avgPerActiveDay)}
          accent="neutral"
          sub={
            <span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{activeDays}</span> of {totalDays} days active
            </span>
          }
        />
        <StatCard
          label="Avg / Period Day"
          value={fmtC(avgPerPeriodDay)}
          fullValue={fmt(avgPerPeriodDay)}
          accent="neutral"
          className="col-span-2 sm:col-span-1"
          sub={
            <span>
              Across all <span className="font-semibold text-zinc-700 dark:text-zinc-300">{totalDays}</span> days
            </span>
          }
        />
      </div>

      {/* ── Cumulative Spend Area Chart ── */}
      <div className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Cumulative Spending vs. Income
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              Running total throughout the {period}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-red-400 opacity-80" /> Expenses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-emerald-500 opacity-80" /> Income
            </span>
          </div>
        </div>

        {!hasAreaData ? (
          <div className="flex h-52 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
            No transactions recorded for this {period}.
          </div>
        ) : (
          <div className="h-52 w-full min-w-0 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="short"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  interval={period === "month" ? 4 : 0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={yFmt}
                  width={48}
                />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => [fmt(Number(v) || 0), name === "exp" ? "Expenses" : "Income"]}
                  labelFormatter={(l) => areaData.find((d) => d.short === l)?.label ?? l}
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: isDark ? "#52525b" : "#d4d4d8", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="inc" stroke="#10b981" strokeWidth={1.5} fill="url(#gInc)" dot={false} />
                <Area type="monotone" dataKey="exp" stroke="#ef4444" strokeWidth={1.5} fill="url(#gExp)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Two-column: Category Table + Period Comparison ── */}
      <div className="mb-5 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">

        {/* Category ranked table */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3.5 py-3.5 dark:border-zinc-800 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Category Breakdown</h2>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                {catBreakdown.length} categories · {pExp.length} transactions
              </p>
            </div>
            <Link to="/categories"
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {catBreakdown.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
              No expenses this {period}.
            </div>
          ) : (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {/* Table header */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 sm:grid-cols-[minmax(0,1fr)_80px_64px_56px_56px] sm:px-4">
                <span>Category</span>
                <span className="text-right">Amount</span>
                <span className="hidden text-right sm:block">Txns</span>
                <span className="hidden text-right sm:block">Share</span>
                <span className="text-right">Δ Prev</span>
              </div>
              {catBreakdown.map((cat) => {
                const Icon = cat.component
                return (
                  <div key={cat.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3.5 py-2.5 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 sm:grid-cols-[minmax(0,1fr)_80px_64px_56px_56px] sm:px-4">
                    {/* Category name + bar */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: cat.color + "20" }}>
                          {Icon && <Icon className="h-3.5 w-3.5" style={{ color: cat.color }} />}
                        </div>
                        <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          {cat.name}
                        </span>
                      </div>
                      <div className="mt-1.5 ml-8 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                    {/* Amount + mobile sub */}
                    <div className="min-w-[70px] text-right sm:min-w-0">
                      <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100" title={fmt(cat.amount)}>
                        {fmtC(cat.amount)}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 sm:hidden">
                        {cat.pct.toFixed(0)}% · {cat.count} {cat.count === 1 ? "txn" : "txns"}
                      </div>
                    </div>
                    <span className="hidden text-right text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                      {cat.count}
                    </span>
                    <span className="hidden text-right text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:block">
                      {cat.pct.toFixed(1)}%
                    </span>
                    <div className="flex justify-end">
                      <Delta pct={cat.delta} invert />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold sm:px-4">
                <span className="text-zinc-500 dark:text-zinc-400">Total</span>
                <span className="text-zinc-900 dark:text-white">{fmt(catTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Period comparison + income summary */}
        <div className="flex min-w-0 flex-col gap-4">

          {/* Comparison bars */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Period Comparison</h2>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">Current vs. previous</p>

            {compData.every((d) => d.exp === 0 && d.inc === 0) ? (
              <div className="flex h-32 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">No prior data</div>
            ) : (
              <div className="mt-4 h-36 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }} barGap={4}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: tickColor, fontSize: 10 }} tickFormatter={yFmt} width={44} />
                    <Tooltip
                      formatter={(v: unknown, n: unknown) => [fmt(Number(v) || 0), n === "exp" ? "Expenses" : "Income"]}
                      contentStyle={tooltipStyle}
                      cursor={cursorStyle}
                    />
                    <Bar dataKey="exp" name="exp" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="inc" name="inc" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Delta row */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Expense change</p>
                <Delta pct={expDelta} invert />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Income change</p>
                <Delta pct={incDelta} />
              </div>
            </div>
          </div>

          {/* Income sources card */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Income Sources</h2>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmtC(totalInc)}</span>
            </div>

            {incBreakdown.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">No income this {period}.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {incBreakdown.map((cat) => {
                  const Icon = cat.component
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: cat.color + "20" }}>
                        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: cat.color }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-zinc-900 dark:text-zinc-100">{fmtC(cat.amount)}</span>
                        </div>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Day-of-Week Spend Pattern ── */}
      <div className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Spending Pattern by Day of Week
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            Total and average spend per weekday this {period}
          </p>
        </div>

        {pExp.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">No data.</div>
        ) : (
          <div className="flex items-end gap-1.5 sm:gap-2">
            {dowPattern.map((d) => (
              <div key={d.name} className="flex flex-1 min-w-0 flex-col items-center gap-1.5">
                {/* Heat bar */}
                <div className="relative w-full" style={{ height: "64px" }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all"
                    style={{
                      height: d.total > 0 ? `${Math.max(8, d.ratio * 100)}%` : "4px",
                      backgroundColor: d.total > 0 ? heatColor(d.ratio, isDark) : (isDark ? "#27272a" : "#f4f4f5"),
                    }}
                  />
                </div>
                {/* Amount */}
                <div className="w-full min-w-0 text-center">
                  <p className="truncate text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums leading-tight">
                    {d.total > 0 ? fmtC(d.total) : "—"}
                  </p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500">{d.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Month daily heatmap (month view only) ── */}
      {period === "month" && dailyBars.length > 0 && (
        <div className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Daily Spending Heatmap</h2>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                Intensity shows relative spend per day
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: heatColor(0, isDark) }} />
              <span>None</span>
              <span className="ml-1 h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: heatColor(1, isDark) }} />
              <span>High</span>
            </div>
          </div>
          <div className="grid grid-cols-[repeat(7,1fr)] gap-1 sm:gap-1.5">
            {/* Offset for start of month */}
            {Array.from({ length: (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {dailyBars.map(({ d, v, ratio }) => (
              <div key={d} title={`Day ${d}: ${fmt(v)}`} className="group relative min-w-0">
                <div
                  className="flex aspect-square items-center justify-center rounded-md text-[9px] font-medium transition-transform hover:scale-110"
                  style={{
                    backgroundColor: heatColor(ratio, isDark),
                    color: ratio > 0.5 ? "#fff" : isDark ? "#a1a1aa" : "#71717a",
                  }}
                >
                  {d}
                </div>
                {/* tooltip */}
                {v > 0 && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold shadow-md dark:border-zinc-700 dark:bg-zinc-800 group-hover:block">
                    {fmt(v)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Items ranked table ── */}
      <div className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3.5 py-3.5 dark:border-zinc-800 sm:px-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Top Spending Items</h2>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">Ranked by total amount · exact item names</p>
          </div>
          <Link to="/history"
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
            History <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {topItems.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
            No items recorded this {period}.
          </div>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            <div className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 sm:grid-cols-[24px_minmax(0,1fr)_80px_48px_52px] sm:px-4">
              <span>#</span>
              <span>Item</span>
              <span className="text-right">Total</span>
              <span className="hidden text-right sm:block">Txns</span>
              <span className="hidden text-right sm:block">Share</span>
            </div>
            {topItems.map((item, idx) => {
              const pct = totalExp > 0 ? (item.amount / totalExp) * 100 : 0
              const cat = findCategory(item.catId, customCategories, { type: "expense", name: item.catName })
              return (
                <div key={item.name} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 px-3.5 py-2.5 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 sm:grid-cols-[24px_minmax(0,1fr)_80px_48px_52px] sm:px-4">
                  <span className="text-center text-[11px] font-bold text-zinc-300 dark:text-zinc-600">{idx + 1}</span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200" title={item.name}>
                      {item.name}
                    </span>
                    {cat && (
                      <span
                        className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                        style={{ backgroundColor: (cat.color || "#10b981") + "20", color: cat.color || "#10b981" }}
                      >
                        {cat.name}
                      </span>
                    )}
                  </div>
                  {/* Total + mobile sub */}
                  <div className="min-w-[65px] text-right sm:min-w-0">
                    <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100" title={fmt(item.amount)}>
                      {fmtC(item.amount)}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 sm:hidden">
                      {pct.toFixed(0)}% · {item.count} {item.count === 1 ? "txn" : "txns"}
                    </div>
                  </div>
                  <span className="hidden text-right text-xs text-zinc-500 dark:text-zinc-400 sm:block">{item.count}</span>
                  <span className="hidden text-right text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:block">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Facts strip ── */}
      {pExp.length > 0 && (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Quick Facts</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">

            <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Transactions</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{pExp.length}</span>
            </div>

            <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Active days</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{activeDays} / {totalDays}</span>
            </div>

            {largestTx && (
              <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Largest item</span>
                <span className="ml-2 truncate text-right font-semibold text-zinc-900 dark:text-white" title={largestTx.item}>
                  {largestTx.item || "—"}
                </span>
              </div>
            )}

            {largestTx && (
              <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Largest amount</span>
                <span className="ml-2 truncate text-right font-semibold text-zinc-900 dark:text-white">{fmtC(largestTx.amount)}</span>
              </div>
            )}

            {catBreakdown[0] && (
              <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Top category</span>
                <span className="ml-2 truncate text-right font-semibold text-zinc-900 dark:text-white">{catBreakdown[0].name}</span>
              </div>
            )}

            {catBreakdown[0] && (
              <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Top share</span>
                <span className="ml-2 font-semibold text-zinc-900 dark:text-white">{catBreakdown[0].pct.toFixed(1)}%</span>
              </div>
            )}

            <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Categories used</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{catBreakdown.length}</span>
            </div>

            {savingsRate !== null && totalInc > 0 && (
              <div className="flex min-w-0 items-center justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800">
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Savings rate</span>
                <span className={`font-semibold ${savingsRate > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {savingsRate.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
