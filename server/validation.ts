import { TRANSACTION_CATEGORIES } from "../src/constants/categories"
import type {
  Expense,
  RecurringFrequency,
  RecurringTransaction,
  TransactionType,
} from "../src/types/expense"
import { ApiError, assertAllowedFields } from "./http"

const TRANSACTION_FIELDS = [
  "type",
  "amount",
  "quantity",
  "unitPrice",
  "categoryId",
  "categoryName",
  "item",
  "note",
  "date",
  "time",
  "createdAt",
  "deletedAt",
] as const

const RECURRING_FIELDS = [
  "type",
  "amount",
  "quantity",
  "unitPrice",
  "categoryId",
  "categoryName",
  "item",
  "note",
  "frequency",
  "dayOfMonth",
  "dayOfWeek",
  "lastRunDate",
  "nextDueDate",
  "active",
  "createdAt",
  "timeZone",
] as const

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/
const INPUT_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const CATEGORIES = new Map(TRANSACTION_CATEGORIES.map((category) => [category.id, category]))

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function normalizeTransactionTime(value: unknown): string {
  if (typeof value !== "string") throw new ApiError(400, "Time is invalid")
  if (TIME_PATTERN.test(value)) return value

  const match = value.match(INPUT_TIME_PATTERN)
  if (!match) throw new ApiError(400, "Time is invalid")

  const hours = Number(match[1])
  const hour12 = hours % 12 || 12
  const meridiem = hours < 12 ? "AM" : "PM"
  return `${hour12}:${match[2]} ${meridiem}`
}

function validateMoneyFields(data: Record<string, unknown>) {
  if (
    typeof data.amount !== "number" ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0 ||
    data.amount > 1_000_000_000_000
  ) {
    throw new ApiError(400, "Amount must be a positive supported number")
  }

  if (
    data.quantity !== undefined &&
    (typeof data.quantity !== "number" ||
      !Number.isInteger(data.quantity) ||
      data.quantity < 1 ||
      data.quantity > 100_000)
  ) {
    throw new ApiError(400, "Quantity must be a positive whole number")
  }

  if (
    data.unitPrice !== undefined &&
    (typeof data.unitPrice !== "number" ||
      !Number.isFinite(data.unitPrice) ||
      data.unitPrice <= 0 ||
      data.unitPrice > 1_000_000_000_000)
  ) {
    throw new ApiError(400, "Unit price must be a positive supported number")
  }
  if ((data.quantity === undefined) !== (data.unitPrice === undefined)) {
    throw new ApiError(400, "Quantity and unit price must be provided together")
  }
  if (data.quantity !== undefined) {
    if (
      data.type === "income" && data.quantity !== 1
    ) {
      throw new ApiError(400, "Income transactions must use a single quantity")
    }
    if (Math.abs((data.quantity as number) * (data.unitPrice as number) - (data.amount as number)) > 0.01) {
      throw new ApiError(400, "Amount must match quantity multiplied by unit price")
    }
  }
}

function validateCategory(data: Record<string, unknown>) {
  if (data.type !== "expense" && data.type !== "income") {
    throw new ApiError(400, "Transaction type is invalid")
  }
  if (typeof data.categoryId !== "string" || typeof data.categoryName !== "string") {
    throw new ApiError(400, "A valid category is required")
  }

  const category = CATEGORIES.get(data.categoryId)
  if (!category || category.type !== data.type || category.name !== data.categoryName) {
    throw new ApiError(400, "Category is not valid for this transaction type")
  }
}

function validateText(data: Record<string, unknown>) {
  if (typeof data.item !== "string" || !data.item.trim() || data.item.length > 120) {
    throw new ApiError(400, "Item must contain 1 to 120 characters")
  }
  if (data.note !== undefined && (typeof data.note !== "string" || data.note.length > 500)) {
    throw new ApiError(400, "Note must be 500 characters or fewer")
  }
}

export function validateNewTransaction(value: unknown): Omit<Expense, "id"> {
  if (!isObjectRecord(value)) throw new ApiError(400, "Invalid transaction")
  assertAllowedFields(value, TRANSACTION_FIELDS)
  validateMoneyFields(value)
  validateCategory(value)
  validateText(value)

  if (!isValidDate(value.date)) throw new ApiError(400, "Date must be a valid calendar date")
  const time = normalizeTransactionTime(value.time)
  if (
    typeof value.createdAt !== "number" ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    value.createdAt > Date.now() + 5 * 60 * 1000
  ) {
    throw new ApiError(400, "Creation time is invalid")
  }
  if (value.deletedAt !== undefined && value.deletedAt !== null) {
    throw new ApiError(400, "New transactions cannot be deleted")
  }

  return {
    type: value.type as TransactionType,
    amount: value.amount as number,
    ...(value.quantity === undefined ? {} : { quantity: value.quantity as number }),
    ...(value.unitPrice === undefined ? {} : { unitPrice: value.unitPrice as number }),
    categoryId: value.categoryId as string,
    categoryName: value.categoryName as string,
    item: (value.item as string).trim(),
    note: typeof value.note === "string" ? value.note : "",
    date: value.date,
    time,
    createdAt: value.createdAt,
  }
}

export function validateTransactionPatch(
  current: Omit<Expense, "id">,
  patch: unknown,
): Partial<Omit<Expense, "id">> {
  if (!isObjectRecord(patch)) throw new ApiError(400, "Invalid transaction update")
  assertAllowedFields(patch, TRANSACTION_FIELDS.filter((field) => field !== "createdAt" && field !== "deletedAt"))
  const merged = { ...current, ...patch }
  validateMoneyFields(merged)
  validateCategory(merged)
  validateText(merged)
  if (!isValidDate(merged.date)) throw new ApiError(400, "Date must be a valid calendar date")
  const time = normalizeTransactionTime(merged.time)
  return {
    ...patch,
    ...(patch.time === undefined ? {} : { time }),
  } as Partial<Omit<Expense, "id">>
}

function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function validateNewRecurring(value: unknown): Omit<RecurringTransaction, "id"> {
  if (!isObjectRecord(value)) throw new ApiError(400, "Invalid recurring schedule")
  assertAllowedFields(value, RECURRING_FIELDS)
  validateMoneyFields(value)
  validateCategory(value)
  validateText(value)

  if (
    value.frequency !== "daily" &&
    value.frequency !== "weekly" &&
    value.frequency !== "monthly"
  ) {
    throw new ApiError(400, "Recurring frequency is invalid")
  }
  if (!isValidDate(value.nextDueDate)) throw new ApiError(400, "Next due date is invalid")
  if (value.active !== undefined && typeof value.active !== "boolean") {
    throw new ApiError(400, "Active status is invalid")
  }
  if (value.dayOfMonth !== undefined &&
    (!Number.isInteger(value.dayOfMonth) || (value.dayOfMonth as number) < 1 || (value.dayOfMonth as number) > 31)) {
    throw new ApiError(400, "Day of month must be from 1 to 31")
  }
  if (value.dayOfWeek !== undefined &&
    (!Number.isInteger(value.dayOfWeek) || (value.dayOfWeek as number) < 0 || (value.dayOfWeek as number) > 6)) {
    throw new ApiError(400, "Day of week is invalid")
  }
  if (value.lastRunDate !== undefined && !isValidDate(value.lastRunDate)) {
    throw new ApiError(400, "Last run date is invalid")
  }
  if (
    typeof value.createdAt !== "number" ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    value.createdAt > Date.now() + 5 * 60 * 1000
  ) {
    throw new ApiError(400, "Creation time is invalid")
  }
  if (value.timeZone !== undefined && !validTimeZone(value.timeZone)) {
    throw new ApiError(400, "Time zone is invalid")
  }

  return {
    type: value.type as TransactionType,
    amount: value.amount as number,
    ...(value.quantity === undefined ? {} : { quantity: value.quantity as number }),
    ...(value.unitPrice === undefined ? {} : { unitPrice: value.unitPrice as number }),
    categoryId: value.categoryId as string,
    categoryName: value.categoryName as string,
    item: (value.item as string).trim(),
    note: typeof value.note === "string" ? value.note : "",
    frequency: value.frequency as RecurringFrequency,
    ...(value.dayOfMonth === undefined ? {} : { dayOfMonth: value.dayOfMonth as number }),
    ...(value.dayOfWeek === undefined ? {} : { dayOfWeek: value.dayOfWeek as number }),
    ...(value.lastRunDate === undefined ? {} : { lastRunDate: value.lastRunDate as string }),
    nextDueDate: value.nextDueDate,
    active: value.active !== false,
    createdAt: value.createdAt,
    timeZone: validTimeZone(value.timeZone) ? value.timeZone : "UTC",
  }
}

export function validateRecurringPatch(
  current: Omit<RecurringTransaction, "id">,
  patch: unknown,
): Partial<Omit<RecurringTransaction, "id">> {
  if (!isObjectRecord(patch)) throw new ApiError(400, "Invalid recurring schedule update")
  assertAllowedFields(patch, RECURRING_FIELDS.filter((field) => field !== "createdAt"))
  const merged = { ...current, ...patch }
  validateNewRecurring(merged)
  return patch as Partial<Omit<RecurringTransaction, "id">>
}
