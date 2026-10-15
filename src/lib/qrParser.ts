import type { Expense } from "../types/expense"

export interface QRLineItem {
  name: string
  qty: number
  unitPrice: number
  total: number
}

export interface ParsedQRResult {
  raw: string
  format: "vietqr" | "einvoice" | "json" | "url" | "text" | "unknown"
  formatLabel: string
  amount?: number
  currency?: string
  date?: string // YYYY-MM-DD
  time?: string // HH:MM
  merchant?: string
  item?: string
  note?: string
  reference?: string
  suggestedCategoryId?: string
  isPaymentRequest: boolean
  /** Parsed line items from a structured receipt QR. Max 100 stored. */
  lineItems?: QRLineItem[]
  /** True when the raw QR had more line items than the 100-item cap. */
  lineItemsOverflow?: boolean
  extractedFields: {
    amount: boolean
    date: boolean
    merchant: boolean
    reference: boolean
  }
  parsingNotes: string[]
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  type?: "reference" | "likely"
  matchingExpense?: Expense
  message?: string
}

/**
 * Helper to parse EMVCo Tag-Length-Value (TLV) strings.
 * Each TLV consists of 2-digit tag, 2-digit length, followed by value.
 */
function parseEMVCoTLV(data: string): Record<string, string> {
  const tags: Record<string, string> = {}
  let i = 0
  while (i + 4 <= data.length) {
    const tag = data.substring(i, i + 2)
    const len = parseInt(data.substring(i + 2, i + 4), 10)
    if (isNaN(len) || i + 4 + len > data.length) break
    i += 4
    const val = data.substring(i, i + len)
    tags[tag] = val
    i += len
  }
  return tags
}

/**
 * Suggest a matching category based on merchant or description keywords.
 */
export function suggestCategory(text: string): string | undefined {
  if (!text) return undefined
  const lower = text.toLowerCase()

  // Drinks
  if (
    /coffee|cà phê|cafe|highlands|phúc long|phuc long|the coffee house|starbucks|trà sữa|milk tea|katinat|cheese coffee|gong cha|toco toco|trà|tea|beer|bia|bar|pub/.test(
      lower,
    )
  ) {
    return "drinks"
  }

  // Food
  if (
    /food|restaurant|quán|nhà hàng|cơm|bún|phở|bánh|lunch|dinner|breakfast|ăn uống|kfc|lotteria|mcdonald|jollibee|pizza|bbq|haidilao|buffet|sushi|lẩu|nướng/.test(
      lower,
    )
  ) {
    return "food"
  }

  // Transportation
  if (
    /grab|be\.com|gojek|xanh sm|taxi|mai linh|vinasun|xe buýt|bus|xăng|petrol|gas|vé xe|parking|gửi xe|toll|vé tàu|vé máy bay|airline|vietjet|vietnam airlines/.test(
      lower,
    )
  ) {
    return "transportation"
  }

  // Shopping
  if (
    /mart|siêu thị|supermarket|winmart|coopmart|co\.op|bách hóa|bach hoa|circle k|family mart|gs25|7-eleven|ministop|shopee|lazada|tiki|tiktok shop|uniqlo|zara|h&m|quần áo|store|shop/.test(
      lower,
    )
  ) {
    return "shopping"
  }

  // Housing / Rent
  if (/rent|tiền nhà|phòng trọ|apartment|chung cư|tiền phòng|landlord/.test(lower)) {
    return "rent"
  }

  // Bills & Utilities
  if (
    /bill|hóa đơn|tiền điện|tiền nước|internet|viettel|fpt|vnpt|mobifone|vinaphone|cước|evn|sawaco|wifi/.test(
      lower,
    )
  ) {
    return "bills"
  }

  // Health
  if (
    /pharmacy|nhà thuốc|pharmacity|long châu|an khang|bệnh viện|hospital|clinic|phòng khám|bác sĩ|doctor|thuốc|medicine|nha khoa|dental/.test(
      lower,
    )
  ) {
    return "health"
  }

  // Education
  if (/education|học phí|tuition|sách|book|khóa học|course|school|trường|đại học/.test(lower)) {
    return "education"
  }

  // Entertainment
  if (/movie|cinema|cgv|lotte cinema|bhd|rạp|game|steam|playstation|netflix|spotify|vé xem/.test(lower)) {
    return "entertainment"
  }

  // Technology
  if (/laptop|computer|phone|điện thoại|apple|samsung|tgdd|thế giới di động|fpt shop|cellphones|gearvn/.test(lower)) {
    return "technology"
  }

  return undefined
}

/**
 * Standardize extracted date into YYYY-MM-DD format if valid.
 */
function standardizeDate(val: string): string | undefined {
  if (!val) return undefined
  const trimmed = val.trim()

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00.000Z`)
    if (!isNaN(d.getTime())) return trimmed
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0")
    const month = dmyMatch[2].padStart(2, "0")
    const year = dmyMatch[3]
    const iso = `${year}-${month}-${day}`
    const d = new Date(`${iso}T00:00:00.000Z`)
    if (!isNaN(d.getTime())) return iso
  }

  // YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (ymdMatch) {
    const year = ymdMatch[1]
    const month = ymdMatch[2].padStart(2, "0")
    const day = ymdMatch[3].padStart(2, "0")
    const iso = `${year}-${month}-${day}`
    const d = new Date(`${iso}T00:00:00.000Z`)
    if (!isNaN(d.getTime())) return iso
  }

  return undefined
}

/**
 * Standardize extracted time into HH:MM (24-hour format) for form inputs.
 */
function standardizeTime(val: string): string | undefined {
  if (!val) return undefined
  const match24 = val.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (match24) {
    return `${match24[1].padStart(2, "0")}:${match24[2]}`
  }

  const match12 = val.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const meridiem = match12[3].toUpperCase()
    if (meridiem === "PM" && hours !== 12) hours += 12
    if (meridiem === "AM" && hours === 12) hours = 0
    return `${String(hours).padStart(2, "0")}:${match12[2]}`
  }

  return undefined
}

/**
 * Primary QR parser function.
 * Decodes recognized formats: VietQR/EMVCo, E-Invoice, JSON, Receipt URLs, and Plain Text.
 */
export function parseQRCode(rawText: string): ParsedQRResult {
  const trimmed = rawText.trim()
  const parsingNotes: string[] = []

  // ──────────────────────────────────────────────────────────────────────────
  // 1. VietQR / EMVCo Merchant-Presented Mode QR
  // Starts with tag 00 length 02 value 01 ("000201...")
  // ──────────────────────────────────────────────────────────────────────────
  if (trimmed.startsWith("000201") && trimmed.length >= 20) {
    const tlv = parseEMVCoTLV(trimmed)
    if (tlv["00"] === "01") {
      let amount: number | undefined
      if (tlv["54"]) {
        const parsedAmt = parseFloat(tlv["54"])
        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          amount = parsedAmt
          parsingNotes.push(`Amount extracted: ${new Intl.NumberFormat("vi-VN").format(amount)} VND`)
        }
      }

      // Currency (Tag 53: 704 = VND, 840 = USD)
      const currencyCode = tlv["53"] === "840" ? "USD" : "VND"

      // Merchant Name (Tag 59)
      const merchant = tlv["59"]?.trim() || undefined
      if (merchant) {
        parsingNotes.push(`Merchant: ${merchant}`)
      }

      // Additional Data (Tag 62)
      let description: string | undefined
      let reference: string | undefined
      if (tlv["62"]) {
        const sub62 = parseEMVCoTLV(tlv["62"])
        // Subtag 08 = Purpose of transaction (transfer message / invoice item)
        if (sub62["08"]) {
          description = sub62["08"].trim()
        }
        // Subtag 01 = Bill Number, Subtag 05 = Reference Label
        reference = sub62["01"]?.trim() || sub62["05"]?.trim() || undefined
      }

      const item = description || merchant || "VietQR Payment"
      const suggestedCategoryId = suggestCategory(`${merchant || ""} ${description || ""}`)

      const noteParts: string[] = []
      if (reference) {
        noteParts.push(`Ref: ${reference}`)
      }
      if (merchant && description && merchant !== description) {
        noteParts.push(`Merchant: ${merchant}`)
      }
      if (tlv["60"]) {
        noteParts.push(`City: ${tlv["60"].trim()}`)
      }
      noteParts.push("Scanned via VietQR")

      return {
        raw: trimmed,
        format: "vietqr",
        formatLabel: "VietQR Payment Request",
        amount,
        currency: currencyCode,
        merchant,
        item,
        note: noteParts.join(" · "),
        reference,
        suggestedCategoryId,
        isPaymentRequest: true, // Crucial: VietQR is a payment request, NOT proof of payment
        extractedFields: {
          amount: amount !== undefined,
          date: false, // VietQR standard does not contain transaction date
          merchant: !!merchant,
          reference: !!reference,
        },
        parsingNotes: [
          ...parsingNotes,
          "Note: This is a VietQR payment request. Confirm your actual payment before saving.",
        ],
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Structured JSON Receipt
  // ──────────────────────────────────────────────────────────────────────────
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed)
      if (typeof obj === "object" && obj !== null) {
        // Amount
        const rawAmt = obj.amount ?? obj.total ?? obj.totalAmount ?? obj.tongTien ?? obj.soTien ?? obj.price
        let amount: number | undefined
        if (typeof rawAmt === "number" && rawAmt > 0) {
          amount = rawAmt
        } else if (typeof rawAmt === "string") {
          const num = parseFloat(rawAmt.replace(/[^\d.]/g, ""))
          if (!isNaN(num) && num > 0) amount = num
        }

        // Currency
        const currency = typeof obj.currency === "string" ? obj.currency.toUpperCase() : "VND"

        // Date & Time
        const rawDate = obj.date ?? obj.transactionDate ?? obj.ngay ?? obj.ngayLap ?? obj.time
        const date = typeof rawDate === "string" ? standardizeDate(rawDate) : undefined

        const rawTime = obj.time ?? obj.gio
        const time = typeof rawTime === "string" ? standardizeTime(rawTime) : undefined

        // Merchant & Item
        const merchant = typeof obj.merchant === "string" ? obj.merchant.trim() : typeof obj.store === "string" ? obj.store.trim() : undefined
        const item = typeof obj.item === "string" ? obj.item.trim() : typeof obj.description === "string" ? obj.description.trim() : merchant || "Receipt Expense"

        // Reference
        const reference = typeof obj.ref === "string" ? obj.ref.trim() : typeof obj.reference === "string" ? obj.reference.trim() : typeof obj.invoiceNo === "string" ? obj.invoiceNo.trim() : undefined

        const suggestedCategoryId = suggestCategory(`${merchant || ""} ${item || ""}`)

        const noteParts: string[] = []
        if (reference) noteParts.push(`Ref: ${reference}`)
        if (typeof obj.note === "string" && obj.note.trim()) noteParts.push(obj.note.trim())

        if (amount) parsingNotes.push(`Amount extracted: ${amount}`)
        if (date) parsingNotes.push(`Date extracted: ${date}`)
        if (merchant) parsingNotes.push(`Merchant: ${merchant}`)

        // ── Line Items ───────────────────────────────────────────────────────
        // Recognized array keys: items, products, sanPham, hangHoa, lineItems
        const rawItems: unknown[] | undefined =
          Array.isArray(obj.items) ? obj.items :
          Array.isArray(obj.products) ? obj.products :
          Array.isArray(obj.sanPham) ? obj.sanPham :
          Array.isArray(obj.hangHoa) ? obj.hangHoa :
          Array.isArray(obj.lineItems) ? obj.lineItems :
          undefined

        const LINE_ITEM_CAP = 100
        let lineItems: QRLineItem[] | undefined
        let lineItemsOverflow = false

        if (rawItems && rawItems.length > 0) {
          lineItemsOverflow = rawItems.length > LINE_ITEM_CAP
          const slice = rawItems.slice(0, LINE_ITEM_CAP)
          lineItems = slice.map((entry): QRLineItem => {
            if (typeof entry !== "object" || entry === null) {
              return { name: String(entry), qty: 1, unitPrice: 0, total: 0 }
            }
            const e = entry as Record<string, unknown>
            // Support compact single-letter keys (n/q/p/u/t) for small QR payloads
            const name = String(
              e.name ?? e.n ?? e.ten ?? e.item ?? e.description ?? e.sanPham ?? ""
            ).trim() || "Item"
            const qty = Number(e.qty ?? e.q ?? e.quantity ?? e.soLuong ?? e.sl ?? 1)
            const up = Number(e.unitPrice ?? e.u ?? e.p ?? e.price ?? e.donGia ?? e.gia ?? e.unit_price ?? 0)
            const tot = Number(e.total ?? e.t ?? e.thanhTien ?? e.subtotal ?? e.amount ?? qty * up)
            return {
              name,
              qty: isNaN(qty) || qty <= 0 ? 1 : qty,
              unitPrice: isNaN(up) ? 0 : up,
              total: isNaN(tot) ? 0 : tot,
            }
          })

          // If top-level amount is missing, sum line item totals
          if (!amount && lineItems.length > 0) {
            const summed = lineItems.reduce((s, li) => s + li.total, 0)
            if (summed > 0) {
              amount = summed
              parsingNotes.push(`Total inferred from ${lineItems.length} line items: ${new Intl.NumberFormat("vi-VN").format(summed)}`)
            }
          }
          parsingNotes.push(
            `${lineItems.length} line item${lineItems.length !== 1 ? "s" : ""} parsed${lineItemsOverflow ? ` (showing first ${LINE_ITEM_CAP} of ${rawItems.length})` : ""}`
          )
        }
        // ────────────────────────────────────────────────────────────────────

        return {
          raw: trimmed,
          format: "json",
          formatLabel: "Digital Receipt (JSON)",
          amount,
          currency,
          date,
          time,
          merchant,
          item,
          note: noteParts.join(" · "),
          reference,
          suggestedCategoryId,
          isPaymentRequest: false,
          lineItems,
          lineItemsOverflow,
          extractedFields: {
            amount: amount !== undefined,
            date: date !== undefined,
            merchant: !!merchant,
            reference: !!reference,
          },
          parsingNotes,
        }
      }
    } catch {
      // Fall through if invalid JSON
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Vietnam E-Invoice (Thông tư 78 Delimited Format)
  // Common formats:
  // Format A: MST;KHHD;SHD;NgayLap;TongTien;MaCQT
  // Format B: key=value pairs separated by semicolon or pipe
  // ──────────────────────────────────────────────────────────────────────────
  if (trimmed.includes(";") || trimmed.includes("|")) {
    const separator = trimmed.includes(";") ? ";" : "|"
    const parts = trimmed.split(separator).map((p) => p.trim())

    // Check if it's key=value format (e.g. MST=...|SHD=...|TONG=...)
    const isKeyValue = parts.some((p) => p.includes("="))
    if (isKeyValue) {
      const kvMap: Record<string, string> = {}
      parts.forEach((p) => {
        const [k, ...v] = p.split("=")
        if (k && v.length) kvMap[k.trim().toUpperCase()] = v.join("=").trim()
      })

      const rawAmount = kvMap["TONG"] ?? kvMap["TONGTIEN"] ?? kvMap["TG_TT"] ?? kvMap["AMOUNT"] ?? kvMap["TOTAL"]
      let amount: number | undefined
      if (rawAmount) {
        const num = parseFloat(rawAmount.replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) amount = num
      }

      const rawDate = kvMap["NGAY"] ?? kvMap["NGAYLAP"] ?? kvMap["DATE"]
      const date = rawDate ? standardizeDate(rawDate) : undefined

      const reference = kvMap["SHD"] ?? kvMap["HD_SO"] ?? kvMap["SOHD"] ?? kvMap["INV"]
      const merchant = kvMap["TEN"] ?? kvMap["DONVI"] ?? kvMap["MST"] ? `Invoice MST: ${kvMap["MST"]}` : undefined
      const item = kvMap["NOIDUNG"] ?? kvMap["ITEM"] ?? merchant ?? "E-Invoice Payment"

      if (amount || reference || date) {
        const noteParts: string[] = []
        if (reference) noteParts.push(`Invoice No: ${reference}`)
        if (kvMap["MST"]) noteParts.push(`Tax ID: ${kvMap["MST"]}`)
        noteParts.push("Thông tư 78 E-Invoice")

        return {
          raw: trimmed,
          format: "einvoice",
          formatLabel: "Electronic Invoice (Thông tư 78)",
          amount,
          currency: "VND",
          date,
          merchant,
          item,
          note: noteParts.join(" · "),
          reference,
          suggestedCategoryId: suggestCategory(item),
          isPaymentRequest: false,
          extractedFields: {
            amount: amount !== undefined,
            date: date !== undefined,
            merchant: !!merchant,
            reference: !!reference,
          },
          parsingNotes: [
            ...(amount ? [`Total amount extracted: ${new Intl.NumberFormat("vi-VN").format(amount)} VND`] : []),
            ...(date ? [`Invoice date: ${date}`] : []),
            ...(reference ? [`Invoice reference: ${reference}`] : []),
          ],
        }
      }
    }

    // Positional semicolon format: MST;KHHD;SHD;NgayLap;TongTien;...
    // Usually parts[0] is 10-14 digit Tax ID (MST)
    if (parts.length >= 4 && /^\d{10,14}$/.test(parts[0])) {
      const mst = parts[0]
      const shd = parts[2] // Invoice number
      const date = standardizeDate(parts[3])
      let amount: number | undefined
      if (parts[4]) {
        const num = parseFloat(parts[4].replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) amount = num
      }

      const noteParts: string[] = []
      if (shd) noteParts.push(`Invoice No: ${shd}`)
      noteParts.push(`Tax ID: ${mst}`)
      noteParts.push("Hóa đơn điện tử")

      return {
        raw: trimmed,
        format: "einvoice",
        formatLabel: "Electronic Invoice (Hóa đơn điện tử)",
        amount,
        currency: "VND",
        date,
        merchant: `Tax ID: ${mst}`,
        item: `E-Invoice (${shd || mst})`,
        note: noteParts.join(" · "),
        reference: shd || mst,
        suggestedCategoryId: "bills",
        isPaymentRequest: false,
        extractedFields: {
          amount: amount !== undefined,
          date: date !== undefined,
          merchant: true,
          reference: !!shd,
        },
        parsingNotes: [
          ...(amount ? [`Total amount extracted: ${new Intl.NumberFormat("vi-VN").format(amount)} VND`] : []),
          ...(date ? [`Invoice date: ${date}`] : []),
          `Tax ID: ${mst}`,
        ],
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Web Receipt URL with query parameters
  // e.g. https://...?amount=150000&merchant=Starbucks&date=2026-10-15
  // ──────────────────────────────────────────────────────────────────────────
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      const params = url.searchParams

      const rawAmount =
        params.get("amount") ||
        params.get("total") ||
        params.get("sum") ||
        params.get("tien") ||
        params.get("price")
      let amount: number | undefined
      if (rawAmount) {
        const num = parseFloat(rawAmount.replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) amount = num
      }

      const rawDate = params.get("date") || params.get("ngay")
      const date = rawDate ? standardizeDate(rawDate) : undefined

      const merchant = params.get("merchant") || params.get("store") || params.get("vendor") || params.get("shop") || undefined
      const item = params.get("item") || params.get("desc") || params.get("description") || merchant || "Web Receipt"
      const reference = params.get("ref") || params.get("inv") || params.get("bill") || params.get("id") || undefined

      if (amount || merchant || reference) {
        const noteParts: string[] = []
        if (reference) noteParts.push(`Ref: ${reference}`)
        noteParts.push(`Host: ${url.hostname}`)

        return {
          raw: trimmed,
          format: "url",
          formatLabel: "Web Receipt Link",
          amount,
          currency: params.get("currency")?.toUpperCase() || "VND",
          date,
          merchant,
          item,
          note: noteParts.join(" · "),
          reference,
          suggestedCategoryId: suggestCategory(`${merchant || ""} ${item}`),
          isPaymentRequest: false,
          extractedFields: {
            amount: amount !== undefined,
            date: date !== undefined,
            merchant: !!merchant,
            reference: !!reference,
          },
          parsingNotes: [
            ...(amount ? [`Amount extracted: ${amount}`] : []),
            `Receipt Domain: ${url.hostname}`,
          ],
        }
      }

      // URL without parsed payment parameters
      return {
        raw: trimmed,
        format: "url",
        formatLabel: "Web URL",
        item: `Payment/Receipt link (${url.hostname})`,
        note: `Scanned URL: ${url.hostname}`,
        isPaymentRequest: false,
        extractedFields: {
          amount: false,
          date: false,
          merchant: false,
          reference: false,
        },
        parsingNotes: [
          `Scanned link to ${url.hostname}`,
          "No structured payment or amount parameters found in this URL.",
        ],
      }
    } catch {
      // Invalid URL syntax
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Line-by-line Key-Value Plain Text
  // e.g.:
  // Total: 250000
  // Date: 2026-10-15
  // Merchant: Highlands Coffee
  // ──────────────────────────────────────────────────────────────────────────
  const lines = trimmed.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length > 1) {
    let amount: number | undefined
    let date: string | undefined
    let merchant: string | undefined
    let item: string | undefined
    let reference: string | undefined

    for (const line of lines) {
      const matchAmt = line.match(/^(?:total|amount|tổng|số tiền|tong tien)[:=]\s*([^\n\r]+)/i)
      if (matchAmt) {
        const num = parseFloat(matchAmt[1].replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) amount = num
      }

      const matchDate = line.match(/^(?:date|ngày|ngay)[:=]\s*([^\n\r]+)/i)
      if (matchDate) {
        date = standardizeDate(matchDate[1])
      }

      const matchMerchant = line.match(/^(?:merchant|store|cửa hàng|nhà hàng|vendor)[:=]\s*([^\n\r]+)/i)
      if (matchMerchant) {
        merchant = matchMerchant[1].trim()
      }

      const matchItem = line.match(/^(?:item|mặt hàng|description|nội dung)[:=]\s*([^\n\r]+)/i)
      if (matchItem) {
        item = matchItem[1].trim()
      }

      const matchRef = line.match(/^(?:ref|reference|so hoa don|invoice|bill)[:=]\s*([^\n\r]+)/i)
      if (matchRef) {
        reference = matchRef[1].trim()
      }
    }

    if (amount || merchant || item || reference) {
      const finalItem = item || merchant || "Scanned Receipt"
      return {
        raw: trimmed,
        format: "text",
        formatLabel: "Plain Text Receipt",
        amount,
        currency: "VND",
        date,
        merchant,
        item: finalItem,
        note: reference ? `Ref: ${reference}` : "Scanned from receipt text",
        reference,
        suggestedCategoryId: suggestCategory(`${merchant || ""} ${finalItem}`),
        isPaymentRequest: false,
        extractedFields: {
          amount: amount !== undefined,
          date: date !== undefined,
          merchant: !!merchant,
          reference: !!reference,
        },
        parsingNotes: [
          ...(amount ? [`Amount extracted: ${amount}`] : []),
          ...(date ? [`Date extracted: ${date}`] : []),
        ],
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Unrecognized QR Content
  // ──────────────────────────────────────────────────────────────────────────
  return {
    raw: trimmed,
    format: "unknown",
    formatLabel: "Unrecognized QR Code",
    item: "",
    note: "",
    isPaymentRequest: false,
    extractedFields: {
      amount: false,
      date: false,
      merchant: false,
      reference: false,
    },
    parsingNotes: [
      "Could not detect standard VietQR, invoice, or receipt fields.",
      "Please enter the transaction details manually.",
    ],
  }
}

/**
 * Checks if a parsed QR transaction matches an existing expense.
 * Prevents duplicate imports based on reference number or date+amount+item matching.
 */
export function checkDuplicateExpense(
  parsed: ParsedQRResult,
  expenses: Expense[],
  baseVndAmount?: number,
): DuplicateCheckResult {
  if (!expenses || expenses.length === 0) {
    return { isDuplicate: false }
  }

  // 1. Check exact reference match (bill number, invoice number, etc.)
  if (parsed.reference && parsed.reference.length >= 3) {
    const ref = parsed.reference.toLowerCase()
    const matchByRef = expenses.find((e) => {
      if (e.deletedAt) return false
      const noteLower = (e.note || "").toLowerCase()
      const itemLower = (e.item || "").toLowerCase()
      return noteLower.includes(ref) || itemLower.includes(ref)
    })

    if (matchByRef) {
      return {
        isDuplicate: true,
        type: "reference",
        matchingExpense: matchByRef,
        message: `A transaction with reference "${parsed.reference}" was already recorded on ${matchByRef.date} (${new Intl.NumberFormat("vi-VN").format(matchByRef.amount)} ₫).`,
      }
    }
  }

  // 2. Check likely duplicate by amount + date + similar name
  const checkAmount = baseVndAmount ?? parsed.amount
  if (checkAmount && checkAmount > 0 && parsed.date) {
    const matchByDateAmount = expenses.find((e) => {
      if (e.deletedAt) return false
      if (e.date !== parsed.date) return false
      // Exact amount match in VND
      if (Math.abs(e.amount - checkAmount) > 1) return false

      // Check name similarity
      const itemA = (e.item || "").toLowerCase().trim()
      const itemB = (parsed.item || parsed.merchant || "").toLowerCase().trim()
      if (!itemB) return true // same date and same exact amount
      return (
        itemA.includes(itemB) ||
        itemB.includes(itemA) ||
        e.categoryId === parsed.suggestedCategoryId
      )
    })

    if (matchByDateAmount) {
      return {
        isDuplicate: true,
        type: "likely",
        matchingExpense: matchByDateAmount,
        message: `You already recorded a ${new Intl.NumberFormat("vi-VN").format(matchByDateAmount.amount)} ₫ transaction for "${matchByDateAmount.item}" on ${matchByDateAmount.date}.`,
      }
    }
  }

  return { isDuplicate: false }
}
