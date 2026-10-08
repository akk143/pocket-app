import type { RecurringTransaction } from "../types/expense.js"
import { apiRequest } from "./api"

export async function addRecurring(
  item: Omit<RecurringTransaction, "id">,
): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/recurring", {
    method: "POST",
    body: JSON.stringify(item),
  })
  return result.id
}

export async function updateRecurring(
  id: string,
  data: Partial<Omit<RecurringTransaction, "id">>,
): Promise<void> {
  await apiRequest(`/api/recurring/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteRecurring(
  id: string,
): Promise<void> {
  await apiRequest(`/api/recurring/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function fetchRecurring(): Promise<RecurringTransaction[]> {
  const result = await apiRequest<{ recurring: RecurringTransaction[] }>("/api/recurring")
  return result.recurring
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function computeNextDueDate(
  frequency: "daily" | "weekly" | "monthly",
  fromDate: string,
  dayOfMonth?: number,
  dayOfWeek?: number,
): string {
  const [year, month, day] = fromDate.split("-").map(Number)

  if (frequency === "daily") {
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    return next.toISOString().slice(0, 10)
  }

  if (frequency === "weekly") {
    const current = new Date(Date.UTC(year, month - 1, day))
    const targetDay = dayOfWeek ?? current.getUTCDay()
    let daysToAdd = (targetDay - current.getUTCDay() + 7) % 7
    if (daysToAdd === 0) daysToAdd = 7
    current.setUTCDate(current.getUTCDate() + daysToAdd)
    return current.toISOString().slice(0, 10)
  }

  const nextMonth = new Date(Date.UTC(year, month, 1))
  const daysInNextMonth = new Date(
    Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
  ).getUTCDate()
  nextMonth.setUTCDate(Math.min(dayOfMonth ?? day, daysInNextMonth))
  return nextMonth.toISOString().slice(0, 10)
}

export async function triggerRecurringImmediately(
  item: RecurringTransaction,
): Promise<string> {
  const result = await apiRequest<{ id: string }>(
    `/api/recurring/${encodeURIComponent(item.id)}/post`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  )
  return result.id
}
