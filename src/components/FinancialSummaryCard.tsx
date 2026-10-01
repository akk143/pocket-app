import type { ReactNode } from "react"

interface FinancialSummaryCardProps {
  title: string
  amountCompact: string
  amountFull: string
  amountColorClass?: string
  trendNode?: ReactNode
}

export default function FinancialSummaryCard({
  title,
  amountCompact,
  amountFull,
  amountColorClass = "text-zinc-900 dark:text-white",
  trendNode,
}: FinancialSummaryCardProps) {
  // Separate currency/sign prefix from numbers for better hierarchy
  const firstDigitIdx = amountCompact.search(/\d/)
  let prefix = ""
  let value = amountCompact

  if (firstDigitIdx > 0) {
    prefix = amountCompact.substring(0, firstDigitIdx)
    value = amountCompact.substring(firstDigitIdx)
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      {/* Label */}
      <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>

      {/* Amount */}
      <div className="mt-2 mb-1" title={amountFull}>
        <p
          className={`whitespace-nowrap tabular-nums tracking-tight ${amountColorClass}`}
          style={{ fontSize: "clamp(18px, 1.8vw, 26px)", lineHeight: 1.15, fontWeight: 600 }}
        >
          {prefix && (
            <span className="mr-0.5 inline-block text-[0.58em] font-medium opacity-60">
              {prefix}
            </span>
          )}
          {value}
        </p>
      </div>

      {/* Trend / Footer */}
      <div className="mt-auto min-w-0 pt-3 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
        {trendNode}
      </div>
    </div>
  )
}
