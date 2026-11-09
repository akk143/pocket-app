import type React from "react"
import type { TransactionType } from "./expense.js"

export interface CustomCategory {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
  createdAt: number
  updatedAt: number
  archivedAt?: number | null
}

export interface CategoryDef {
  id: string
  type: TransactionType
  name: string
  component: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  badgeBg: string
  badgeText: string
  softBg: string
  isCustom?: boolean
  archived?: boolean
}

export interface CreateCategoryPayload {
  name: string
  type: TransactionType
  icon: string
  color: string
}

export interface UpdateCategoryPayload {
  name?: string
  icon?: string
  color?: string
  archived?: boolean
}
