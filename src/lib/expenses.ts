import type { Expense } from "../types/expense"
import { apiRequest } from "./api"

export async function fetchExpenses(): Promise<Expense[]> {
  const result = await apiRequest<{ transactions: Expense[] }>("/api/transactions")
  return result.transactions
}

export async function fetchDeletedExpenses(): Promise<Expense[]> {
  const result = await apiRequest<{ transactions: Expense[] }>("/api/transactions/trash")
  return result.transactions
}

export async function addExpense(expense: Omit<Expense, "id">): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(expense),
  })
  return result.id
}

export async function updateExpense(
  expenseId: string,
  data: Partial<Omit<Expense, "id">>,
): Promise<void> {
  await apiRequest(`/api/transactions/${encodeURIComponent(expenseId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiRequest(`/api/transactions/${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
  })
}

export async function deleteExpenses(expenseIds: string[]): Promise<string[]> {
  const result = await apiRequest<{ movedIds: string[] }>("/api/transactions/bulk-trash", {
    method: "POST",
    body: JSON.stringify({ ids: expenseIds }),
  })
  return result.movedIds
}

export async function restoreExpense(expenseId: string): Promise<void> {
  await apiRequest(`/api/transactions/${encodeURIComponent(expenseId)}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function restoreExpenses(expenseIds: string[]): Promise<string[]> {
  const result = await apiRequest<{ restoredIds: string[] }>("/api/transactions/bulk-restore", {
    method: "POST",
    body: JSON.stringify({ ids: expenseIds }),
  })
  return result.restoredIds
}

export async function permanentlyDeleteExpense(expenseId: string): Promise<void> {
  await apiRequest(`/api/transactions/${encodeURIComponent(expenseId)}/permanent`, {
    method: "DELETE",
  })
}

export async function permanentlyDeleteExpenses(expenseIds: string[]): Promise<number> {
  const result = await apiRequest<{ deletedCount: number }>("/api/transactions/bulk-permanent", {
    method: "POST",
    body: JSON.stringify({ ids: expenseIds }),
  })
  return result.deletedCount
}

export async function emptyTrash(): Promise<number> {
  const result = await apiRequest<{ deletedCount: number }>("/api/transactions/trash", {
    method: "DELETE",
  })
  return result.deletedCount
}
