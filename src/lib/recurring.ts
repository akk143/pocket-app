import type { RecurringTransaction } from "../types/expense"
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
