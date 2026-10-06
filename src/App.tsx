import { useCallback, useEffect, useRef, useState } from "react"
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bell,
  ChevronDown,
  Home,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Plus,
  ReceiptText,
  Repeat,
  Settings as SettingsIcon,
  Wallet,
  X,
} from "lucide-react"

import AddExpenseSheet from "./components/AddExpenseSheet"
import TransactionDetailsSheet from "./components/TransactionDetailsSheet"
import StartupSplash from "./components/StartupSplash"
import DashboardSkeleton from "./components/DashboardSkeleton"
import { ThemeToggle } from "./components/ThemeToggle"
import HomePage from "./pages/Home"
import HistoryPage from "./pages/History"
import AnalyticsPage from "./pages/Analytics"
import CategoriesPage from "./pages/Categories"
import RecurringPage from "./pages/Recurring"
import SettingsPage from "./pages/Settings"
import TrashPage from "./pages/Trash"
import LoginPage from "./pages/Login"
import RegisterPage from "./pages/Register"

import { apiRequest } from "./lib/api"
import {
  restoreExpense,
  addExpense,
  updateExpense,
  deleteExpense,
  deleteExpenses,
  fetchExpenses,
  fetchDeletedExpenses,
  restoreExpenses,
} from "./lib/expenses"
import {
  addRecurring,
  updateRecurring,
  deleteRecurring,
  fetchRecurring,
  triggerRecurringImmediately,
} from "./lib/recurring"
import type { Expense, RecurringTransaction } from "./types/expense"
import type { AppUser } from "./types/user"
import { useCurrency } from "./contexts/CurrencyContext"
import { SUPPORTED_CURRENCIES } from "./lib/currency"

function App() {
  const [appReady, setAppReady] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)
  const handleAppReady = useCallback(() => setAppReady(true), [])
  const handleAnimationComplete = useCallback(() => setAnimationComplete(true), [])

  return (
    <>
      <AppContent onAppReady={handleAppReady} />
      <StartupSplash
        visible={!appReady || !animationComplete}
        onAnimationComplete={handleAnimationComplete}
      />
    </>
  )
}

function AppContent({ onAppReady }: { onAppReady: () => void }) {
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sessionError, setSessionError] = useState(false)
  const [accountDataError, setAccountDataError] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [deletedExpenses, setDeletedExpenses] = useState<Expense[]>([])
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null)
  const [transactionSaveState, setTransactionSaveState] = useState<
    "saving" | "saving-recurring" | "updating" | null
  >(null)
  const transactionSaveLock = useRef(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("drinks")
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [headerSearch, setHeaderSearch] = useState("")
  const [toast, setToast] = useState<{
    message: string
    type?: "success" | "info"
    action?: { label: string; onClick: () => void }
  } | null>(null)

  const showToast = (
    message: string,
    type: "success" | "info" = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    setToast({ message, type, action })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!transactionSaveState) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [transactionSaveState])

  useEffect(() => {
    if (!userMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [userMenuOpen])

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      setExpenses([])
      setDeletedExpenses([])
      setRecurringList([])
      navigate("/login", { replace: true })
    }
    window.addEventListener("pockettrack:session-expired", handleSessionExpired)
    return () => window.removeEventListener("pockettrack:session-expired", handleSessionExpired)
  }, [navigate])

  useEffect(() => {
    let active = true
    apiRequest<{ user: AppUser | null }>("/api/auth/session")
      .then(({ user: sessionUser }) => {
        if (active) setUser(sessionUser)
      })
      .catch((error: unknown) => {
        console.error("Session check failed:", error)
        if (active) {
          setUser(null)
          setSessionError(true)
        }
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false)
          onAppReady()
        }
      })
    return () => {
      active = false
    }
  }, [onAppReady])

  useEffect(() => {
    if (!user) return
    let active = true
    setIsDataLoading(true)
    Promise.all([fetchExpenses(), fetchDeletedExpenses(), fetchRecurring()])
      .then(([activeExpenses, deletedExpenses, recurringItems]) => {
        if (!active) return
        setExpenses(activeExpenses)
        setDeletedExpenses(deletedExpenses)
        setRecurringList(recurringItems)
        setAccountDataError(false)
      })
      .catch((error: unknown) => {
        console.error("Account data could not be loaded:", error)
        if (active) setAccountDataError(true)
      })
      .finally(() => {
        if (active) setIsDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  async function handleSaveExpense(
    expense: Omit<Expense, "id">,
    recurring?: Omit<RecurringTransaction, "id">,
  ) {
    if (!user || transactionSaveLock.current) return
    transactionSaveLock.current = true
    setTransactionSaveState("saving")
    let transactionSaved = false
    try {
      const id = await addExpense(expense)
      transactionSaved = true
      setExpenses((current) => [{ ...expense, id }, ...current])
      if (recurring) {
        setTransactionSaveState("saving-recurring")
        try {
          await handleAddRecurring(recurring)
        } catch {
          setAddExpenseOpen(false)
          setEditingExpense(null)
          showToast("Transaction saved, but recurring schedule could not be created.", "info")
          return
        }
      }
      setAddExpenseOpen(false)
      setEditingExpense(null)
      showToast(expense.type === "income" ? "Income saved successfully" : "Expense recorded successfully")
    } catch (error) {
      if (transactionSaved) {
        showToast("Transaction saved, but recurring schedule could not be created.", "info")
        return
      }
      showToast("Failed to save. Check your connection.", "info")
      throw error
    } finally {
      transactionSaveLock.current = false
      setTransactionSaveState(null)
    }
  }

  async function handleUpdateExpense(
    expenseId: string,
    updated: Partial<Omit<Expense, "id">>
  ) {
    if (!user || transactionSaveLock.current) return
    transactionSaveLock.current = true
    setTransactionSaveState("updating")
    try {
      await updateExpense(expenseId, updated)
      setExpenses((current) =>
        current.map((expense) => expense.id === expenseId ? { ...expense, ...updated } : expense),
      )
      setAddExpenseOpen(false)
      setEditingExpense(null)
      showToast("Transaction updated successfully")
    } catch (error) {
      showToast("Update failed. Check your connection.", "info")
      throw error
    } finally {
      transactionSaveLock.current = false
      setTransactionSaveState(null)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!user) return
    try {
      await deleteExpense(expenseId)
      const deletedExpense = expenses.find((expense) => expense.id === expenseId)
      setExpenses((current) => current.filter((expense) => expense.id !== expenseId))
      if (deletedExpense) {
        setDeletedExpenses((current) => [
          { ...deletedExpense, deletedAt: Date.now() },
          ...current.filter((expense) => expense.id !== expenseId),
        ])
      }
      showToast("Transaction moved to Trash", "success", {
        label: "Undo",
        onClick: () => {
          void handleRestoreExpense(expenseId)
        },
      })
    } catch {
      showToast("Delete failed. Check your connection.", "info")
    }
  }

  async function handleBulkDeleteExpenses(expenseIds: string[]) {
    if (!user) return

    let deletedIds: string[]
    try {
      deletedIds = await deleteExpenses(expenseIds)
    } catch {
      showToast("Failed to move transactions to Trash. Check your connection.", "info")
      return
    }
    const movedExpenses = expenses.filter((expense) => deletedIds.includes(expense.id))
    setExpenses((current) => current.filter((expense) => !deletedIds.includes(expense.id)))
    setDeletedExpenses((current) => [
      ...movedExpenses.map((expense) => ({ ...expense, deletedAt: Date.now() })),
      ...current.filter((expense) => !deletedIds.includes(expense.id)),
    ])

    const deletedLabel = `${deletedIds.length} transaction${deletedIds.length === 1 ? "" : "s"} moved to Trash`
    showToast(deletedLabel, "success", {
        label: "Undo",
        onClick: () => {
          void restoreExpenses(deletedIds).then(async (restoredIds) => {
            const restoredCount = restoredIds.length
            const [activeExpenses, deletedExpenses] = await Promise.all([
              fetchExpenses(),
              fetchDeletedExpenses(),
            ])
            setExpenses(activeExpenses)
            setDeletedExpenses(deletedExpenses)
            showToast(`${restoredCount} transaction${restoredCount === 1 ? "" : "s"} restored`)
          }).catch(() => {
            showToast("Could not restore transactions. Please try again.", "info")
          })
        },
      })
  }

  async function handleRestoreExpense(expenseId: string) {
    if (!user) return
    try {
      await restoreExpense(expenseId)
      const [activeExpenses, deletedExpenses] = await Promise.all([
        fetchExpenses(),
        fetchDeletedExpenses(),
      ])
      setExpenses(activeExpenses)
      setDeletedExpenses(deletedExpenses)
      showToast("Transaction restored")
    } catch {
      showToast("Could not restore transaction. Please try again.", "info")
    }
  }

  async function handleAddRecurring(item: Omit<RecurringTransaction, "id">) {
    if (!user) return
    try {
      const id = await addRecurring(item)
      setRecurringList((current) => [{ ...item, id }, ...current])
      showToast("Recurring schedule created")
    } catch (error) {
      showToast("Failed to create recurring schedule.", "info")
      throw error
    }
  }

  async function handleToggleRecurringActive(id: string, active: boolean) {
    if (!user) return
    try {
      await updateRecurring(id, { active })
      setRecurringList((current) =>
        current.map((item) => item.id === id ? { ...item, active } : item),
      )
      showToast(active ? "Recurring schedule resumed" : "Recurring schedule paused")
    } catch (error) {
      showToast("Update failed. Check your connection.", "info")
      throw error
    }
  }

  async function handleDeleteRecurring(id: string) {
    if (!user) return
    try {
      await deleteRecurring(id)
      setRecurringList((current) => current.filter((item) => item.id !== id))
      showToast("Recurring schedule deleted")
    } catch (error) {
      showToast("Delete failed. Check your connection.", "info")
      throw error
    }
  }

  async function handleTriggerRecurringNow(item: RecurringTransaction) {
    if (!user) return
    try {
      await triggerRecurringImmediately(item)
      try {
        const [updatedRecurring, updatedExpenses] = await Promise.all([
          fetchRecurring(),
          fetchExpenses(),
        ])
        setRecurringList(updatedRecurring)
        setExpenses(updatedExpenses)
      } catch (error) {
        console.error("Posted recurring transaction but could not refresh the dashboard:", error)
      }
      showToast(`Recorded: ${item.item}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("Already posted")) {
        showToast("Already posted today — no duplicate created.", "info")
      } else {
        showToast("Failed to record. Check your connection.", "info")
      }
    }
  }

  const closeTransactionDetails = useCallback(() => {
    setViewingExpenseId(null)
  }, [])

  const openExpenseDetails = useCallback((expense: Expense) => {
    if (transactionSaveLock.current) return
    setViewingExpenseId(expense.id)
  }, [])

  const openAddExpense = (categoryId?: string) => {
    if (transactionSaveLock.current) return
    setViewingExpenseId(null)
    setEditingExpense(null)
    if (categoryId) {
      setSelectedCategoryId(categoryId)
    }
    setAddExpenseOpen(true)
  }

  const openEditExpense = (expense: Expense) => {
    if (transactionSaveLock.current) return
    setEditingExpense(expense)
    setAddExpenseOpen(true)
  }

  const viewingExpense = expenses.find((expense) => expense.id === viewingExpenseId) ?? null

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (headerSearch.trim()) {
      navigate(`/history?q=${encodeURIComponent(headerSearch.trim())}`)
    }
  }

  async function handleSignOut() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      })
      setUser(null)
      setExpenses([])
      setDeletedExpenses([])
      setRecurringList([])
      navigate("/login")
    } catch {
      showToast("Could not sign out. Please try again.", "info")
    }
  }

  // Auth loading
  if (authLoading) {
    return null
  }

  if (sessionError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f7f5] px-5 dark:bg-zinc-950">
        <div className="max-w-sm text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            PocketTrack could not connect to its server.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Unauthenticated routes
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Authenticated app
  const displayName = user.displayName || "John Doe"
  const firstName = displayName.split(" ")[0] || "John"
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "JD"

  return (
    <>
    <div
      inert={transactionSaveState !== null}
      className="min-h-screen bg-[#f7f7f5] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <div className="mx-auto flex min-h-screen min-h-dvh max-w-[1600px]">

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:left-[max(0px,calc((100vw-1600px)/2))] lg:overflow-y-auto lg:overscroll-contain">
          <div>
            {/* Logo */}
            <div className="mb-8 flex items-center gap-2.5 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                PocketTrack
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`
                }
              >
                <Home className="h-4 w-4" />
                Home
              </NavLink>

              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`
                }
              >
                <ReceiptText className="h-4 w-4" />
                History
              </NavLink>

              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`
                }
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </NavLink>

              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`
                }
              >
                <LayoutGrid className="h-4 w-4" />
                Categories
              </NavLink>

              <NavLink
                to="/recurring"
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`
                }
              >
                <Repeat className="h-4 w-4" />
                Recurring
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                  }`
                }
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </NavLink>
            </nav>
</div>

          <div className="pt-6 space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-[#f0fdf4] dark:border-emerald-900/50 dark:bg-emerald-500/5 p-4">
              <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-emerald-950 shadow-2xs">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                Better tracking, brighter tomorrow.
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Small steps. Big goals.
              </p>
            </div>

            {/* Version status */}
            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Version 1.0.1</span>
              </div>
              <span>Online</span>
            </div>
          </div>
        </aside>

        <div aria-hidden="true" className="hidden w-64 shrink-0 lg:block" />

        {/* ── Main Content Area ── */}
        <main className="flex min-w-0 flex-1 flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-[max(0.75rem,env(safe-area-inset-left))] pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 min-[360px]:pl-[max(1.25rem,env(safe-area-inset-left))] min-[360px]:pr-[max(1.25rem,env(safe-area-inset-right))] sm:px-8">
            {/* Mobile Logo */}
            <div className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-white lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="max-[359px]:hidden">PocketTrack</span>
            </div>

            {/* Desktop Search Bar */}
            <form onSubmit={handleHeaderSearch} className="hidden max-w-md flex-1 lg:block">
              <div className="relative">
                <input
                  type="text"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Search expenses, items, or categories..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 px-4 py-2 pr-10 text-sm outline-none transition placeholder:text-zinc-400 dark:focus:border-emerald-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900"
                />
                {headerSearch && (
                  <button
                    type="button"
                    onClick={() => setHeaderSearch("")}
                    aria-label="Clear search"
                    title="Clear search"
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              {/* Currency Quick Switcher */}
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 py-1 pl-2 pr-5 text-[11px] font-semibold text-zinc-700 outline-none transition hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 cursor-pointer shadow-2xs appearance-none sm:rounded-xl sm:py-1.5 sm:pl-2.5 sm:pr-6 sm:text-xs"
                  title="Switch Currency"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="dark:bg-zinc-900 dark:text-white">
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 sm:right-1.5 sm:h-3.5 sm:w-3.5" />
              </div>

              {/* Notifications — hidden on mobile to save space */}
              <button
                type="button"
                className="relative hidden rounded-xl p-2 text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 sm:flex"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
              </button>

              {/* Theme toggle */}
              <div className="flex">
                <ThemeToggle compact />
              </div>

              {/* User Profile — always visible */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-emerald-500/20"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-800 text-xs font-semibold text-white">
                    {initials}
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 py-1.5 shadow-xl z-50">
                    <div className="border-b border-zinc-100 dark:border-zinc-800 px-4 py-2">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                        {user.email}
                      </p>
                    </div>

                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <SettingsIcon className="h-3.5 w-3.5 text-zinc-400" />
                      Settings
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleSignOut()
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {accountDataError && !isDataLoading && (
            <div role="alert" className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300 sm:mx-8">
              <p className="font-semibold">Unable to load your spending data.</p>
              <p className="mt-0.5 text-xs font-normal opacity-80">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => {
                  setAccountDataError(false)
                  setIsDataLoading(true)
                  Promise.all([fetchExpenses(), fetchDeletedExpenses(), fetchRecurring()])
                    .then(([activeExpenses, deletedExpenses, recurringItems]) => {
                      setExpenses(activeExpenses)
                      setDeletedExpenses(deletedExpenses)
                      setRecurringList(recurringItems)
                      setAccountDataError(false)
                    })
                    .catch((error: unknown) => {
                      console.error("Retry — account data could not be loaded:", error)
                      setAccountDataError(true)
                    })
                    .finally(() => setIsDataLoading(false))
                }}
                className="mt-3 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition"
              >
                Try again
              </button>
            </div>
          )}

          {/* Page Routing */}
          <div className="flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  isDataLoading ? (
                    <DashboardSkeleton />
                  ) : (
                    <HomePage
                      expenses={expenses}
                      userName={firstName}
                      onAddExpense={openAddExpense}
                      onViewExpense={openExpenseDetails}
                      onDeleteExpense={handleDeleteExpense}
                      
                    />
                  )
                }
              />
              <Route
                path="/history"
                element={
                  <HistoryPage
                    expenses={expenses}
                    trashCount={deletedExpenses.length}
                    onViewExpense={openExpenseDetails}
                    onDeleteExpense={handleDeleteExpense}
                    onBulkDeleteExpenses={handleBulkDeleteExpenses}
                  />
                }
              />
              <Route
                path="/analytics"
                element={<AnalyticsPage expenses={expenses} />}
              />
              <Route
                path="/categories"
                element={
                  <CategoriesPage
                    expenses={expenses}
                    onSelectCategory={(catId) => openAddExpense(catId)}
                    onAddCategory={() => showToast("Custom categories coming in v1.1", "info")}
                    onViewExpense={openExpenseDetails}
                  />
                }
              />
              <Route
                path="/recurring"
                element={
                  <RecurringPage
                    recurringList={recurringList}
                    onAddRecurring={handleAddRecurring}
                    onToggleActive={handleToggleRecurringActive}
                    onDeleteRecurring={handleDeleteRecurring}
                    onTriggerNow={handleTriggerRecurringNow}
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    user={user}
                    expenses={expenses}
                    onSignOut={handleSignOut}
                    onUserUpdated={setUser}
                  />
                }
              />
              <Route
                path="/trash"
                element={
                  <TrashPage
                    deletedExpenses={deletedExpenses}
                    onRestore={handleRestoreExpense}
                    onTrashChanged={async () => {
                      const [activeExpenses, deletedExpenses] = await Promise.all([
                        fetchExpenses(),
                        fetchDeletedExpenses(),
                      ])
                      setExpenses(activeExpenses)
                      setDeletedExpenses(deletedExpenses)
                      showToast("Trash updated")
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] shadow-lg shadow-zinc-900/[0.04] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
        <div className="grid min-h-16 grid-cols-5 items-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-none transition ${
                isActive ? "font-semibold text-emerald-700 dark:text-emerald-400 [&>span]:bg-emerald-50 dark:[&>span]:bg-emerald-500/10" : "font-medium text-zinc-500 dark:text-zinc-500"
              }`
            }
          >
            <span className="mb-0.5 flex h-8 min-w-12 items-center justify-center rounded-2xl text-current transition-colors">
              <Home className="h-[21px] w-[21px]" strokeWidth={2.1} />
            </span>
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-none transition ${
                isActive ? "font-semibold text-emerald-700 dark:text-emerald-400 [&>span]:bg-emerald-50 dark:[&>span]:bg-emerald-500/10" : "font-medium text-zinc-500 dark:text-zinc-500"
              }`
            }
          >
            <span className="mb-0.5 flex h-8 min-w-12 items-center justify-center rounded-2xl text-current transition-colors">
              <ReceiptText className="h-[21px] w-[21px]" strokeWidth={2.1} />
            </span>
            <span>History</span>
          </NavLink>

          



          
          <NavLink
            to="/recurring"
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-none transition ${
                isActive ? "font-semibold text-emerald-700 dark:text-emerald-400 [&>span]:bg-emerald-50 dark:[&>span]:bg-emerald-500/10" : "font-medium text-zinc-500 dark:text-zinc-500"
              }`
            }
          >
            <span className="mb-0.5 flex h-8 min-w-12 items-center justify-center rounded-2xl text-current transition-colors">
              <Repeat className="h-[21px] w-[21px]" strokeWidth={2.1} />
            </span>
            <span>Recurring</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-none transition ${
                isActive ? "font-semibold text-emerald-700 dark:text-emerald-400 [&>span]:bg-emerald-50 dark:[&>span]:bg-emerald-500/10" : "font-medium text-zinc-500 dark:text-zinc-500"
              }`
            }
          >
            <span className="mb-0.5 flex h-8 min-w-12 items-center justify-center rounded-2xl text-current transition-colors">
              <BarChart3 className="h-[21px] w-[21px]" strokeWidth={2.1} />
            </span>
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-none transition ${
                isActive ? "font-semibold text-emerald-700 dark:text-emerald-400 [&>span]:bg-emerald-50 dark:[&>span]:bg-emerald-500/10" : "font-medium text-zinc-500 dark:text-zinc-500"
              }`
            }
          >
            <span className="mb-0.5 flex h-8 min-w-12 items-center justify-center rounded-2xl text-current transition-colors">
              <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={2.1} />
            </span>
            <span>Categories</span>
          </NavLink>

        </div>
      </nav>

      {/* Mobile Floating Add Expense Button */}
      <button
        type="button"
        aria-label="Add expense"
        onClick={() => openAddExpense()}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(env(safe-area-inset-right)+0.75rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95 lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      

      {/* Add / Edit Transaction */}
      <AddExpenseSheet
        open={addExpenseOpen}
        isSaving={transactionSaveState !== null}
        defaultCategoryId={selectedCategoryId}
        initialExpense={editingExpense}
        onClose={() => {
          if (transactionSaveLock.current) return
          setAddExpenseOpen(false)
          setEditingExpense(null)
        }}
        onSave={handleSaveExpense}
        onUpdate={handleUpdateExpense}
      />
      {viewingExpense && !addExpenseOpen && (
        <TransactionDetailsSheet
          expense={viewingExpense}
          onClose={closeTransactionDetails}
          onEdit={openEditExpense}
          onDelete={handleDeleteExpense}
        />
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-auto lg:translate-x-0">
          <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          {toast.message}
          </div>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick()
                setToast(null)
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-emerald-300 transition hover:bg-white/10 hover:text-emerald-200"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
    {transactionSaveState && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-white/65 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:bg-zinc-950/70"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-zinc-200/80 bg-white/95 px-6 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/95 sm:px-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <span className="mb-5 text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            PocketTrack
          </span>
          <LoaderCircle
            className="mb-5 h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {transactionSaveState === "updating" ? "Updating transaction..." : "Saving transaction..."}
          </p>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {transactionSaveState === "saving-recurring"
              ? "Setting up recurring schedule..."
              : "Please wait a moment."}
          </p>
        </div>
      </div>
    )}
    </>
  )
}

export default App
