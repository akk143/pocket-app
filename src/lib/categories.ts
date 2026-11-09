import type {
  CreateCategoryPayload,
  CustomCategory,
  UpdateCategoryPayload,
} from "../types/category"
import { apiRequest } from "./api"

export async function fetchCustomCategories(): Promise<CustomCategory[]> {
  const result = await apiRequest<{ categories: CustomCategory[] }>("/api/categories")
  return result.categories
}

export async function createCustomCategory(
  payload: CreateCategoryPayload,
): Promise<CustomCategory> {
  const result = await apiRequest<{ category: CustomCategory }>("/api/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return result.category
}

export async function updateCustomCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<CustomCategory> {
  const result = await apiRequest<{ category: CustomCategory }>(
    `/api/categories/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  )
  return result.category
}

export async function deleteCustomCategory(id: string): Promise<void> {
  await apiRequest(`/api/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
