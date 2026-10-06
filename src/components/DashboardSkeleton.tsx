/**
 * DashboardSkeleton
 *
 * Pure presentational component — no data fetching, no business logic.
 * Mirrors the layout of Home.tsx so the page structure stays identical
 * while Firestore data is being loaded for the first time.
 *
 * Usage:
 *   {isDataLoading ? <DashboardSkeleton /> : <HomePage ... />}
 */

// ── Primitive skeleton atoms ─────────────────────────────────────────────────

/** A pulsing rectangle — the core building block. */
function Bone({
  className = "",
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`}
      style={style}
    />
  )
}

/** A pulsing circle (for icons / avatars). */
function BoneCircle({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  )
}

// ── Section skeletons ─────────────────────────────────────────────────────────

/** Mobile hero card (dark background, greeting + today's spending) */
function MobileHeroSkeleton() {
  return (
    <div className="sm:hidden mb-4">
      {/* Dark hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-800 dark:bg-zinc-800 px-5 pt-5 pb-6">
        <Bone className="mb-1 h-2.5 w-20 rounded-full bg-zinc-700" />
        <Bone className="mt-1 h-5 w-40 rounded-full bg-zinc-700" />

        <div className="mt-4">
          <Bone className="h-2.5 w-24 rounded-full bg-zinc-700" />
          <Bone className="mt-2 h-10 w-36 rounded-xl bg-zinc-700" />
          <Bone className="mt-2 h-3 w-28 rounded-full bg-zinc-700" />
        </div>
      </div>

      {/* Two compact tiles below hero */}
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="min-w-0 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-1.5">
              <BoneCircle className="h-6 w-6" />
              <Bone className="h-2.5 w-16 rounded-full" />
            </div>
            <Bone className="mt-2 h-6 w-24 rounded-xl" />
            <div className="mt-2 flex items-center gap-2">
              {/* Mini sparkline placeholder */}
              <Bone className="h-6 w-14 rounded-md" />
              <Bone className="h-3 w-10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Desktop/tablet header: greeting + "Add Expense" button */
function DesktopHeaderSkeleton() {
  return (
    <div className="hidden sm:block">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <Bone className="h-7 w-56 rounded-xl" />
          <Bone className="mt-1.5 h-3 w-36 rounded-full" />
        </div>
        {/* Add Expense button placeholder */}
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  )
}

/** Four financial summary stat cards (desktop only, sm+) */
function StatCardsSkeleton() {
  return (
    <section className="hidden sm:grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex h-full flex-col rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900"
        >
          {/* Label */}
          <Bone className="h-3 w-24 rounded-full" />

          {/* Amount — large number */}
          <div className="mt-3 mb-1">
            <Bone className="h-7 w-32 rounded-xl" />
          </div>

          {/* Trend area */}
          <div className="mt-auto pt-4 space-y-1.5">
            <div className="flex items-center gap-2">
              {/* Mini sparkline */}
              <Bone className="h-6 w-16 rounded-md" />
              <Bone className="h-3 w-12 rounded-full" />
            </div>
            <Bone className="h-2.5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </section>
  )
}

/** Budget progress + Financial Insight two-column row */
function BudgetAndInsightSkeleton() {
  return (
    <section className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 sm:grid-cols-2">
      {/* Budget widget */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3.5 shadow-xs sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BoneCircle className="h-4 w-4" />
            <Bone className="h-3 w-32 rounded-full" />
          </div>
          <Bone className="h-3 w-36 rounded-full" />
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="animate-pulse h-full w-[42%] rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Bone className="h-2.5 w-16 rounded-full" />
          <Bone className="h-2.5 w-24 rounded-full" />
        </div>
      </div>

      {/* Financial insight card */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-3.5 sm:p-4">
        <div className="flex min-w-0 items-start gap-3">
          <BoneCircle className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <Bone className="h-3 w-24 rounded-full" />
            <Bone className="mt-1.5 h-2.5 w-full rounded-full" />
            <Bone className="mt-1 h-2.5 w-3/4 rounded-full" />
          </div>
        </div>
        <Bone className="shrink-0 h-3 w-16 rounded-full" />
      </div>
    </section>
  )
}

/** Monthly Spending bar chart + Spending by Category pie chart */
function ChartsSkeleton() {
  return (
    <section className="mt-5 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-2">
      {/* Monthly Spending bar chart */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <Bone className="h-4 w-36 rounded-lg" />
            <Bone className="mt-1 h-3 w-24 rounded-full" />
          </div>
          {/* Timeframe select */}
          <Bone className="h-7 w-24 rounded-xl" />
        </div>

        {/* Bar chart area — 31 tiny bars */}
        <div className="mt-5 h-44 w-full sm:h-52 flex items-end gap-[2px] px-1">
          {Array.from({ length: 31 }, (_, i) => {
            // Vary heights to look like real spend data
            const heights = [30, 55, 20, 70, 45, 80, 35, 25, 60, 90, 40,
                             65, 50, 75, 30, 85, 45, 55, 20, 70, 35, 80,
                             60, 40, 95, 50, 30, 65, 45, 75, 55]
            const h = heights[i % heights.length]
            return (
              <div
                key={i}
                aria-hidden="true"
                className="animate-pulse flex-1 rounded-t-sm bg-zinc-200 dark:bg-zinc-700/60"
                style={{ height: `${h}%` }}
              />
            )
          })}
        </div>
        {/* X-axis tick placeholders */}
        <div className="mt-1 flex justify-between px-1">
          {[1, 5, 10, 15, 20, 25, 30].map((d) => (
            <Bone key={d} className="h-2 w-4 rounded-full" />
          ))}
        </div>
      </div>

      {/* Spending by Category — pie + legend */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BoneCircle className="h-4 w-4" />
            <div>
              <Bone className="h-4 w-40 rounded-lg" />
              <Bone className="mt-1 h-3 w-24 rounded-full" />
            </div>
          </div>
          <div className="text-right">
            <Bone className="h-2.5 w-12 rounded-full ml-auto" />
            <Bone className="mt-1 h-4 w-16 rounded-lg ml-auto" />
          </div>
        </div>

        {/* Pie donut placeholder + legend rows */}
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          {/* Donut */}
          <div className="relative h-32 w-32 shrink-0">
            <div className="animate-pulse absolute inset-0 rounded-full border-[14px] border-zinc-200 dark:border-zinc-700" />
            <div className="animate-pulse absolute inset-[14px] rounded-full bg-white dark:bg-zinc-900" />
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
              <Bone className="h-3 w-12 rounded-full" />
              <Bone className="h-2.5 w-8 rounded-full" />
            </div>
          </div>

          {/* Legend rows */}
          <div className="w-full min-w-0 flex-1 space-y-2.5">
            {[72, 56, 48, 40].map((w) => (
              <div key={w} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <BoneCircle className="h-2 w-2 shrink-0" />
                  <Bone className={`h-3 w-${w === 72 ? "28" : w === 56 ? "20" : w === 48 ? "16" : "14"} rounded-full`} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Bone className="h-3 w-10 rounded-full" />
                  <Bone className="h-3 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Single recent transaction row skeleton */
function TransactionRowSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
      {/* Icon + name / sub-label */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Bone className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Bone className="h-3.5 w-36 rounded-full" />
          <Bone className="mt-1.5 h-2.5 w-24 rounded-full" />
        </div>
      </div>

      {/* Amount */}
      <Bone className="h-4 w-16 rounded-full" />

      {/* Action menu dot */}
      <BoneCircle className="h-7 w-7 justify-self-end" />
    </div>
  )
}

/** Recent Expenses section + Quick Add panel (two-column on lg) */
function RecentAndQuickAddSkeleton() {
  return (
    <section className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
      {/* Recent Expenses table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <BoneCircle className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <Bone className="h-4 w-44 rounded-lg" />
              <Bone className="mt-1 h-3 w-32 rounded-full" />
            </div>
          </div>
          <Bone className="h-3 w-16 rounded-full" />
        </div>

        {/* 5 transaction rows */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {[0, 1, 2, 3, 4].map((i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Quick Add panel */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <BoneCircle className="h-4 w-4" />
          <div>
            <Bone className="h-4 w-24 rounded-lg" />
            <Bone className="mt-1 h-3 w-40 rounded-full" />
          </div>
        </div>

        {/* 3×3 category grid */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse flex flex-col items-center justify-center rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 p-3 gap-1.5"
            >
              <Bone className="h-8 w-8 rounded-lg" />
              <Bone className="h-2.5 w-12 rounded-full" />
            </div>
          ))}
        </div>

        {/* "More Categories" button */}
        <Bone className="mt-4 h-9 w-full rounded-xl" />
      </div>
    </section>
  )
}

// ── Right sidebar skeleton (xl+) ──────────────────────────────────────────────

/** Calendar widget */
function CalendarSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <BoneCircle className="h-6 w-6" />
        <Bone className="h-3 w-28 rounded-full" />
        <BoneCircle className="h-6 w-6" />
      </div>

      {/* Day-of-week headers */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <Bone key={d} className="mx-auto h-2.5 w-5 rounded-full" />
        ))}
      </div>

      {/* Day cells — 35 cells for a 5-week month */}
      <div className="mt-2 grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <BoneCircle key={i} className="mx-auto h-7 w-7" />
        ))}
      </div>
    </div>
  )
}

/** Selected Day Summary widget */
function DaySummarySkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BoneCircle className="h-4 w-4" />
          <Bone className="h-3 w-28 rounded-full" />
        </div>
        <Bone className="h-3 w-12 rounded-full" />
      </div>

      {/* Expense / Income / Net rows */}
      <div className="mt-3 space-y-2.5">
        {["Expenses", "Income", "Net"].map((label) => (
          <div key={label} className={`flex items-center justify-between ${label === "Net" ? "pt-2 border-t border-zinc-100 dark:border-zinc-800" : ""}`}>
            <Bone className="h-3 w-16 rounded-full" />
            <Bone className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Top Spending Items widget */
function TopSpendingSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BoneCircle className="h-3.5 w-3.5" />
          <Bone className="h-3 w-28 rounded-full" />
        </div>
        <Bone className="h-7 w-24 rounded-lg" />
      </div>

      {/* 4–5 category rows */}
      <div className="mt-3 space-y-3">
        {[80, 64, 56, 44].map((w) => (
          <div key={w} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Bone className="h-7 w-7 rounded-lg shrink-0" />
              <Bone className={`h-3 w-${w === 80 ? "24" : w === 64 ? "20" : w === 56 ? "16" : "14"} rounded-full`} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <Bone className="h-3 w-12 rounded-full" />
              <Bone className="h-2.5 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Motivational quote card (always in sidebar) */
function QuoteCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 p-4">
      <div className="flex items-start gap-2.5">
        <BoneCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <Bone className="h-3 w-full rounded-full" />
          <Bone className="mt-1.5 h-3 w-4/5 rounded-full" />
          <Bone className="mt-3 h-3 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your dashboard…"
      aria-busy="true"
      className="flex min-w-0 flex-col xl:flex-row"
    >
      {/* ── Main column ── */}
      <div className="min-w-0 flex-1 px-4 py-4 sm:px-8 sm:py-6">
        {/* Mobile hero */}
        <MobileHeroSkeleton />

        {/* Desktop header */}
        <DesktopHeaderSkeleton />

        {/* Stat cards */}
        <StatCardsSkeleton />

        {/* Budget + Insight */}
        <BudgetAndInsightSkeleton />

        {/* Charts */}
        <ChartsSkeleton />

        {/* Recent transactions + Quick Add */}
        <RecentAndQuickAddSkeleton />
      </div>

      {/* ── Right sidebar (xl only) ── */}
      <aside className="hidden w-80 shrink-0 flex-col gap-5 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 xl:flex xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
        <CalendarSkeleton />
        <DaySummarySkeleton />
        <TopSpendingSkeleton />
        <QuoteCardSkeleton />
      </aside>
    </div>
  )
}
