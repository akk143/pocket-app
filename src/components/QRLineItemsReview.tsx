import { Package } from "lucide-react"
import type { QRLineItem } from "../lib/qrParser"

interface QRLineItemsReviewProps {
  merchant?: string
  date?: string
  lineItems: QRLineItem[]
  lineItemsOverflow?: boolean
  totalAmount?: number
  currency: string
}

const fmt = new Intl.NumberFormat("vi-VN")

function fmtAmt(n: number, currency: string) {
  if (currency === "VND") return `${fmt.format(Math.round(n))} ₫`
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

export default function QRLineItemsReview({
  merchant,
  date,
  lineItems,
  lineItemsOverflow,
  totalAmount,
  currency,
}: QRLineItemsReviewProps) {
  if (!lineItems || lineItems.length === 0) return null

  const computedTotal = lineItems.reduce((s, li) => s + li.total, 0)
  const displayTotal = totalAmount && totalAmount > 0 ? totalAmount : computedTotal

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 overflow-hidden">
      {/* Receipt header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-700/60 px-3 py-2">
        <Package className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">
          {merchant ? `${merchant} — ` : ""}
          {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
          {lineItemsOverflow ? " (first 100 shown)" : ""}
        </span>
        {date && (
          <span className="ml-auto shrink-0 text-[10px] text-zinc-400">{date}</span>
        )}
      </div>

      {/* Scrollable item list — max 240 px (~6 rows visible, rest scrolls) */}
      <div className="max-h-60 overflow-y-auto overscroll-contain divide-y divide-zinc-100 dark:divide-zinc-700/50">
        {lineItems.map((li, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-1.5"
          >
            <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-800 dark:text-zinc-200">
              {li.name}
            </span>
            <span className="shrink-0 text-[10px] text-zinc-400">
              {li.qty > 1 ? `×${li.qty}` : ""}
            </span>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
              {li.total > 0
                ? fmtAmt(li.total, currency)
                : li.unitPrice > 0
                  ? fmtAmt(li.unitPrice * li.qty, currency)
                  : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Overflow notice */}
      {lineItemsOverflow && (
        <div className="border-t border-zinc-100 dark:border-zinc-700/60 px-3 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          QR capacity reached — only the first 100 of the full product list are shown. The receipt total is still correct.
        </div>
      )}

      {/* Total row */}
      <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          Receipt Total
        </span>
        <span className="text-[13px] font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
          {fmtAmt(displayTotal, currency)}
        </span>
      </div>

      {/* Info footer */}
      <div className="border-t border-zinc-100 dark:border-zinc-700/60 px-3 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
        Saved as one expense · items recorded in the note
      </div>
    </div>
  )
}
