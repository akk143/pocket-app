import type { DocumentReference } from "firebase-admin/firestore"
import { adminDb } from "./firebaseAdmin"
import { ApiError } from "./http"
import { validateNewRecurring } from "./validation"
import type { RecurringTransaction } from "../src/types/expense"

function localDateForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function getLocalTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

function computeNextDate(item: RecurringTransaction, afterDate: string) {
  const [year, month, day] = afterDate.split("-").map(Number)

  if (item.frequency === "daily") {
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    return next.toISOString().slice(0, 10)
  }

  if (item.frequency === "weekly") {
    const current = new Date(Date.UTC(year, month - 1, day))
    let daysToAdd = ((item.dayOfWeek ?? 1) - current.getUTCDay() + 7) % 7
    if (daysToAdd === 0) daysToAdd = 7
    current.setUTCDate(current.getUTCDate() + daysToAdd)
    return current.toISOString().slice(0, 10)
  }

  const nextMonth = new Date(Date.UTC(year, month, 1))
  const daysInNextMonth = new Date(
    Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
  ).getUTCDate()
  nextMonth.setUTCDate(Math.min(item.dayOfMonth ?? 1, daysInNextMonth))
  return nextMonth.toISOString().slice(0, 10)
}

type PostResult = { posted: true; id: string } | { posted: false; reason: "already-posted" | "not-due" }

export async function postRecurring(
  userId: string,
  recurringRef: DocumentReference,
  options: { dueOnly: boolean; now?: Date; manual?: boolean },
): Promise<PostResult> {
  const now = options.now ?? new Date()
  const db = adminDb()

  return db.runTransaction(async (transaction) => {
    const recurringSnapshot = await transaction.get(recurringRef)
    if (!recurringSnapshot.exists) throw new ApiError(404, "Recurring schedule not found")

    const item: RecurringTransaction = {
      ...validateNewRecurring(recurringSnapshot.data()),
      id: recurringSnapshot.id,
    }
    if (item.active === false) throw new ApiError(409, "This recurring schedule is paused")

    const timeZone = item.timeZone || "UTC"
    const today = localDateForTimeZone(now, timeZone)
    if (item.lastRunDate === today) return { posted: false, reason: "already-posted" }
    if (options.dueOnly && item.nextDueDate > today) {
      return { posted: false, reason: "not-due" }
    }

    const expenseId = `recurring_${encodeURIComponent(item.id)}_${today}`
    const expenseRef = db.collection("users").doc(userId).collection("expenses").doc(expenseId)
    const existingExpense = await transaction.get(expenseRef)
    const nextDueDate = computeNextDate(item, today)

    transaction.update(recurringRef, {
      lastRunDate: today,
      nextDueDate,
    })

    if (existingExpense.exists) return { posted: false, reason: "already-posted" }

    transaction.create(expenseRef, {
      type: item.type,
      amount: item.amount,
      ...(item.quantity === undefined ? {} : { quantity: item.quantity }),
      ...(item.unitPrice === undefined ? {} : { unitPrice: item.unitPrice }),
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      item: item.item,
      note: item.note
        ? `${item.note} (${options.manual ? "Manual post" : "Auto-recurring"})`
        : options.manual
          ? "Recurring payment"
          : "Auto-recurring transaction",
      date: today,
      time: getLocalTime(now, timeZone),
      createdAt: now.getTime(),
    })

    return { posted: true, id: expenseId }
  })
}
