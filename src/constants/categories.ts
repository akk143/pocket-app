import type React from "react"
import {
  Utensils,
  Coffee,
  Car,
  ShoppingBag,
  Home,
  Receipt,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Laptop,
  Package,
  Briefcase,
  TrendingUp,
  Gift,
  Tag,
  Banknote,
  Pizza,
  Wine,
  Beer,
  Apple,
  Cake,
  IceCream,
  Plane,
  Bus,
  Train,
  Bike,
  Fuel,
  Ship,
  ShoppingCart,
  Store,
  Shirt,
  Sparkles,
  Smile,
  Baby,
  Dog,
  Cat,
  Flower2,
  Zap,
  Droplets,
  Wifi,
  Phone,
  ShieldCheck,
  Wrench,
  Hammer,
  Flame,
  Film,
  Tv,
  Music,
  Ticket,
  Camera,
  Headphones,
  Dumbbell,
  Pill,
  Stethoscope,
  Activity,
  Book,
  FileText,
  Lightbulb,
  Building,
  Wallet,
  CreditCard,
  Coins,
  PiggyBank,
  Landmark,
  Award,
  DollarSign,
} from "lucide-react"
import type { CategoryDef, CustomCategory } from "../types/category.js"

export type { CategoryDef, CustomCategory }

export type CategoryIconComponent = React.ComponentType<{
  className?: string
  style?: React.CSSProperties
}>

export const CATEGORY_ICONS: Record<string, CategoryIconComponent> = {
  // Built-in defaults
  Utensils,
  Coffee,
  Car,
  ShoppingBag,
  Home,
  Receipt,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Laptop,
  Package,
  Briefcase,
  TrendingUp,
  Gift,
  Tag,
  Banknote,

  // Food & Dining
  Pizza,
  Wine,
  Beer,
  Apple,
  Cake,
  IceCream,

  // Travel & Transport
  Plane,
  Bus,
  Train,
  Bike,
  Fuel,
  Ship,

  // Shopping & Life
  ShoppingCart,
  Store,
  Shirt,
  Sparkles,
  Smile,
  Baby,
  Dog,
  Cat,
  Flower2,

  // Home & Bills
  Zap,
  Droplets,
  Wifi,
  Phone,
  ShieldCheck,
  Wrench,
  Hammer,
  Flame,

  // Entertainment
  Film,
  Tv,
  Music,
  Ticket,
  Camera,
  Headphones,

  // Health & Sports
  Dumbbell,
  Pill,
  Stethoscope,
  Activity,

  // Work & Education
  Book,
  FileText,
  Lightbulb,
  Building,

  // Finance & Income
  Wallet,
  CreditCard,
  Coins,
  PiggyBank,
  Landmark,
  Award,
  DollarSign,
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as readonly string[]

export const CATEGORY_COLORS = [
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#10b981", // emerald
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#a855f7", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#64748b", // slate
  "#71717a", // zinc
] as const

export const EXPENSE_CATEGORIES: readonly CategoryDef[] = [
  {
    type: "expense",
    id: "food",
    name: "Food",
    component: Utensils,
    color: "#f97316", // orange
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    softBg: "bg-orange-50 text-orange-600",
  },
  {
    type: "expense",
    id: "drinks",
    name: "Drinks",
    component: Coffee,
    color: "#10b981", // emerald
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    softBg: "bg-emerald-50 text-emerald-600",
  },
  {
    type: "expense",
    id: "transportation",
    name: "Transportation",
    component: Car,
    color: "#3b82f6", // blue
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    softBg: "bg-blue-50 text-blue-600",
  },
  {
    type: "expense",
    id: "shopping",
    name: "Shopping",
    component: ShoppingBag,
    color: "#ec4899",
    badgeBg: "bg-pink-50",
    badgeText: "text-pink-700",
    softBg: "bg-pink-50 text-pink-600",
  },
  {
    type: "expense",
    id: "rent",
    name: "Housing",
    component: Home,
    color: "#8b5cf6",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    softBg: "bg-purple-50 text-purple-600",
  },
  {
    type: "expense",
    id: "bills",
    name: "Bills & Services",
    component: Receipt,
    color: "#f59e0b",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    softBg: "bg-amber-50 text-amber-600",
  },
  {
    type: "expense",
    id: "entertainment",
    name: "Entertainment",
    component: Gamepad2,
    color: "#6366f1",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    softBg: "bg-indigo-50 text-indigo-600",
  },
  {
    type: "expense",
    id: "education",
    name: "Education",
    component: GraduationCap,
    color: "#06b6d4",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-700",
    softBg: "bg-cyan-50 text-cyan-600",
  },
  {
    type: "expense",
    id: "health",
    name: "Health",
    component: HeartPulse,
    color: "#ef4444",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    softBg: "bg-red-50 text-red-600",
  },
  {
    type: "expense",
    id: "technology",
    name: "Technology",
    component: Laptop,
    color: "#64748b",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    softBg: "bg-slate-50 text-slate-600",
  },
  {
    type: "expense",
    id: "other",
    name: "Other",
    component: Package,
    color: "#9ca3af",
    badgeBg: "bg-zinc-100",
    badgeText: "text-zinc-700",
    softBg: "bg-zinc-100 text-zinc-600",
  },
] as const

export const INCOME_CATEGORIES: readonly CategoryDef[] = [
  {
    type: "income",
    id: "salary",
    name: "Salary",
    component: Briefcase,
    color: "#10b981",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    softBg: "bg-emerald-50 text-emerald-600",
  },
  {
    type: "income",
    id: "freelance",
    name: "Freelance",
    component: Laptop,
    color: "#3b82f6",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    softBg: "bg-blue-50 text-blue-600",
  },
  {
    type: "income",
    id: "investments",
    name: "Investments",
    component: TrendingUp,
    color: "#8b5cf6",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    softBg: "bg-purple-50 text-purple-600",
  },
  {
    type: "income",
    id: "gift",
    name: "Gift",
    component: Gift,
    color: "#ec4899",
    badgeBg: "bg-pink-50",
    badgeText: "text-pink-700",
    softBg: "bg-pink-50 text-pink-600",
  },
  {
    type: "income",
    id: "sales",
    name: "Sales",
    component: Tag,
    color: "#f59e0b",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    softBg: "bg-amber-50 text-amber-600",
  },
  {
    type: "income",
    id: "other_income",
    name: "Other Income",
    component: Banknote,
    color: "#14b8a6",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    softBg: "bg-teal-50 text-teal-600",
  },
] as const

export const TRANSACTION_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function toCategoryDef(custom: CustomCategory): CategoryDef {
  const IconComponent = CATEGORY_ICONS[custom.icon] ?? Tag
  const isArchived = Boolean(custom.archivedAt)
  return {
    id: custom.id,
    type: custom.type,
    name: custom.name,
    component: IconComponent,
    color: custom.color || "#10b981",
    badgeBg: "bg-zinc-100 dark:bg-zinc-800",
    badgeText: "text-zinc-700 dark:text-zinc-300",
    softBg: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    isCustom: true,
    archived: isArchived,
  }
}

export function getCombinedCategories(
  customCategories: CustomCategory[] = [],
  options: { includeArchived?: boolean } = {},
): {
  expense: CategoryDef[]
  income: CategoryDef[]
  all: CategoryDef[]
} {
  const filteredCustom = options.includeArchived
    ? customCategories
    : customCategories.filter((c) => !c.archivedAt)

  const customDefs = filteredCustom.map(toCategoryDef)
  const expenseCustom = customDefs.filter((c) => c.type === "expense")
  const incomeCustom = customDefs.filter((c) => c.type === "income")

  const expense: CategoryDef[] = [...EXPENSE_CATEGORIES, ...expenseCustom]
  const income: CategoryDef[] = [...INCOME_CATEGORIES, ...incomeCustom]
  const all: CategoryDef[] = [...expense, ...income]

  return { expense, income, all }
}

export function findCategory(
  categoryId: string,
  customCategories: CustomCategory[] = [],
  fallback?: { type?: "expense" | "income"; name?: string },
): CategoryDef {
  const custom = customCategories.find((c) => c.id === categoryId)
  if (custom) return toCategoryDef(custom)

  const builtIn = TRANSACTION_CATEGORIES.find((c) => c.id === categoryId)
  if (builtIn) return builtIn

  // Fallback for deleted/unknown category
  const isIncome = fallback?.type === "income"
  return {
    id: categoryId,
    type: fallback?.type || "expense",
    name: fallback?.name || (isIncome ? "Income" : "Expense"),
    component: isIncome ? Banknote : Package,
    color: isIncome ? "#10b981" : "#9ca3af",
    badgeBg: "bg-zinc-100 dark:bg-zinc-800",
    badgeText: "text-zinc-700 dark:text-zinc-300",
    softBg: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    isCustom: true,
  }
}
