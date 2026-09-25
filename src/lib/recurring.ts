import { TRANSACTION_CATEGORIES } from "../constants/categories"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { addExpense } from "./expenses"
import type { RecurringTransaction, RecurringFrequency, Expense } from "../types/expense"

// Firestore path: users/{userId}/recurring/{recurringId}

export function subscribeToRecurring(
  userId: string,
  onData: (items: RecurringTransaction[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, "users", userId, "recurring"),
    orderBy("createdAt", "desc"),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const items: RecurringTransaction[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<RecurringTransaction, "id">
        return {
          id: d.id,
          type: data.type || "expense",
          amount: data.amount || 0,
          categoryId: data.categoryId || "bills",
          categoryName: data.categoryName || "Bills",
          item: data.item || "",
          note: data.note || "",
          frequency: data.frequency || "monthly",
          dayOfMonth: data.dayOfMonth ?? 1,
          dayOfWeek: data.dayOfWeek ?? 1,
          lastRunDate: data.lastRunDate,
          nextDueDate: data.nextDueDate || new Date().toISOString().split("T")[0],
          active: data.active !== false,
          createdAt: data.createdAt || Date.now(),
        }
      })
      onData(items)
    },
    (err) => onError(err),
  )
}

function validateTransactionCategory(type: string, categoryId: string) {
  if (!categoryId) return;
  const cat = TRANSACTION_CATEGORIES.find(c => c.id === categoryId);
  if (cat && cat.type !== type) {
    throw new Error(`Category ${categoryId} is not allowed for transaction type ${type}`);
  }
}

export async function addRecurring(
  userId: string,
  item: Omit<RecurringTransaction, "id">,
): Promise<string> {
  validateTransactionCategory(item.type || "expense", item.categoryId);
  const ref = await addDoc(
    collection(db, "users", userId, "recurring"),
    {
      ...item,
      active: item.active !== false,
      createdAt: item.createdAt || Date.now(),
    },
  )
  return ref.id
}

export async function updateRecurring(
  userId: string,
  id: string,
  data: Partial<Omit<RecurringTransaction, "id">>,
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "recurring", id), data)
}

export async function deleteRecurring(
  userId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "recurring", id))
}

// Calculate next due date
export function computeNextDueDate(
  frequency: RecurringFrequency,
  dayOfMonth: number = 1,
  dayOfWeek: number = 1,
  afterDateStr?: string,
): string {
  const baseDate = afterDateStr ? new Date(afterDateStr) : new Date()

  if (frequency === "daily") {
    const next = new Date(baseDate)
    next.setDate(next.getDate() + 1)
    return next.toISOString().split("T")[0]
  }

  if (frequency === "weekly") {
    const next = new Date(baseDate)
    const currentDay = next.getDay()
    let daysToAdd = (dayOfWeek - currentDay + 7) % 7
    if (daysToAdd === 0) daysToAdd = 7
    next.setDate(next.getDate() + daysToAdd)
    return next.toISOString().split("T")[0]
  }

  // Monthly
  const currentYear = baseDate.getFullYear()
  const currentMonth = baseDate.getMonth()
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1)
  const daysInNextMonth = new Date(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth() + 1,
    0,
  ).getDate()
  const validDay = Math.min(dayOfMonth, daysInNextMonth)
  nextMonthDate.setDate(validDay)
  return nextMonthDate.toISOString().split("T")[0]
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Process due recurring transactions and auto-post them
export async function checkAndProcessDueRecurring(
  userId: string,
  recurringList: RecurringTransaction[],
): Promise<Expense[]> {
  const todayStr = getLocalDateString()
  const postedExpenses: Expense[] = []

  for (const item of recurringList) {
    if (!item.active) continue

    // Check if nextDueDate has arrived
    if (item.nextDueDate <= todayStr) {
      // Prevent duplicate generation for same date
      if (item.lastRunDate === todayStr) continue

      const expenseToCreate: Omit<Expense, "id"> = {
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        item: item.item,
        note: item.note ? `${item.note} (Auto-recurring)` : "Auto-recurring transaction",
        date: todayStr,
        time: "08:00 AM",
        createdAt: Date.now(),
      }

      const newId = await addExpense(userId, expenseToCreate)
      postedExpenses.push({ id: newId, ...expenseToCreate })

      // Advance next due date
      const newNextDueDate = computeNextDueDate(
        item.frequency,
        item.dayOfMonth,
        item.dayOfWeek,
        todayStr,
      )

      await updateRecurring(userId, item.id, {
        lastRunDate: todayStr,
        nextDueDate: newNextDueDate,
      })
    }
  }

  return postedExpenses
}

// Manual immediate trigger of a recurring item ("Post Now")
export async function triggerRecurringImmediately(
  userId: string,
  item: RecurringTransaction,
): Promise<Expense> {
  const todayStr = getLocalDateString()
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`

  const expenseToCreate: Omit<Expense, "id"> = {
    type: item.type,
    amount: item.amount,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    item: item.item,
    note: item.note ? `${item.note} (Manual post)` : "Recurring payment",
    date: todayStr,
    time: timeStr,
    createdAt: Date.now(),
  }

  const newId = await addExpense(userId, expenseToCreate)

  // Advance next due date if posting today matches or is past nextDueDate
  const newNextDueDate = computeNextDueDate(
    item.frequency,
    item.dayOfMonth,
    item.dayOfWeek,
    todayStr,
  )

  await updateRecurring(userId, item.id, {
    lastRunDate: todayStr,
    nextDueDate: newNextDueDate,
  })

  return { id: newId, ...expenseToCreate }
}
