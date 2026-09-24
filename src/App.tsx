import { useEffect, useState } from "react"
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import {
  BarChart3,
  Bell,
  ChevronDown,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Plus,
  ReceiptText,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Wallet,
} from "lucide-react"

import AddExpenseSheet from "./components/AddExpenseSheet"
import HomePage from "./pages/Home"
import HistoryPage from "./pages/History"
import AnalyticsPage from "./pages/Analytics"
import CategoriesPage from "./pages/Categories"
import RecurringPage from "./pages/Recurring"
import SettingsPage from "./pages/Settings"
import TrashPage from "./pages/Trash"
import LoginPage from "./pages/Login"
import RegisterPage from "./pages/Register"

import { auth } from "./lib/firebase"
import {
  subscribeToExpenses,
  subscribeToDeletedExpenses,
  restoreExpense,
  addExpense,
  updateExpense,
  deleteExpense,
} from "./lib/expenses"
import {
  subscribeToRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
  checkAndProcessDueRecurring,
  triggerRecurringImmediately,
} from "./lib/recurring"
import type { Expense, RecurringTransaction } from "./types/expense"
import { useCurrency } from "./contexts/CurrencyContext"
import { SUPPORTED_CURRENCIES } from "./lib/currency"

function App() {
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [trashCount, setTrashCount] = useState(0)
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([])
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("drinks")
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [headerSearch, setHeaderSearch] = useState("")
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("pocket_dark") === "true"
  })
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

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  // Firestore expense listener (only when signed in)
  useEffect(() => {
    if (!user) {
      setExpenses([])
      return
    }

    const unsub = subscribeToExpenses(
      user.uid,
      (data) => setExpenses(data),
      (err) => console.error("Firestore error:", err),
    )

    return unsub
  }, [user])

  useEffect(() => {
    if (!user) {
      setTrashCount(0)
      return
    }

    return subscribeToDeletedExpenses(
      user.uid,
      (deletedExpenses) => setTrashCount(deletedExpenses.length),
      (err) => console.error("Trash count error:", err),
    )
  }, [user])

  // Dark mode toggle
  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem("pocket_dark", String(next))
    if (next) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // Save new expense
  async function handleSaveExpense(expense: Expense) {
    if (!user) return
    try {
      const { id: _id, ...data } = expense
      await addExpense(user.uid, data)
      showToast(expense.type === "income" ? "Income saved successfully" : "Expense recorded successfully")
    } catch {
      showToast("Failed to save. Check your connection.", "info")
    }
  }

  // Update existing expense in Firestore 
  async function handleUpdateExpense(
    expenseId: string,
    updated: Partial<Omit<Expense, "id">>
  ) {
    if (!user) return
    try {
      await updateExpense(user.uid, expenseId, updated)
      setEditingExpense(null)
      showToast("Transaction updated successfully")
    } catch {
      showToast("Update failed. Check your connection.", "info")
    }
  }

  // Delete expense from Firestore
  async function handleDeleteExpense(expenseId: string) {
    if (!user) return
    try {
      await deleteExpense(user.uid, expenseId)
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

  async function handleRestoreExpense(expenseId: string) {
    if (!user) return
    try {
      await restoreExpense(user.uid, expenseId)
      showToast("Transaction restored")
    } catch {
      showToast("Could not restore transaction. Please try again.", "info")
    }
  }

  // Firestore recurring listener and auto-processor
  useEffect(() => {
    if (!user) {
      setRecurringList([])
      return
    }

    const unsub = subscribeToRecurring(
      user.uid,
      (items) => {
        setRecurringList(items)
        // Auto-process due recurring items
        checkAndProcessDueRecurring(user.uid, items).then((posted) => {
          if (posted.length > 0) {
            showToast(`Auto-recorded ${posted.length} recurring item${posted.length > 1 ? "s" : ""}`)
          }
        }).catch(() => {
          // Silent — don't alert user for background recurring errors
        })
      },
      (err) => console.error("Firestore recurring error:", err),
    )

    return unsub
  }, [user])

  // Recurring schedule handlers
  async function handleAddRecurring(item: Omit<RecurringTransaction, "id">) {
    if (!user) return
    try {
      await addRecurring(user.uid, item)
      showToast("Recurring schedule created")
    } catch {
      showToast("Failed to create recurring schedule.", "info")
    }
  }

  async function handleToggleRecurringActive(id: string, active: boolean) {
    if (!user) return
    try {
      await updateRecurring(user.uid, id, { active })
      showToast(active ? "Recurring schedule resumed" : "Recurring schedule paused")
    } catch {
      showToast("Update failed. Check your connection.", "info")
    }
  }

  async function handleDeleteRecurring(id: string) {
    if (!user) return
    try {
      await deleteRecurring(user.uid, id)
      showToast("Recurring schedule deleted")
    } catch {
      showToast("Delete failed. Check your connection.", "info")
    }
  }

  async function handleTriggerRecurringNow(item: RecurringTransaction) {
    if (!user) return
    try {
      await triggerRecurringImmediately(user.uid, item)
      showToast(`Recorded: ${item.item}`)
    } catch {
      showToast("Failed to record. Check your connection.", "info")
    }
  }

  // Seeding demo expenses to Firestore
  async function handleSeedDemoData() {
    if (!user) return
    const now = Date.now()
    const demoItems: Omit<Expense, "id">[] = [
      {
        type: "expense",
        amount: 25000,
        categoryId: "drinks",
        categoryName: "Drinks",
        item: "Vietnamese Coffee",
        note: "Morning coffee",
        date: "2026-09-07",
        time: "8:30 AM",
        createdAt: now - 3600000 * 3,
      },
      {
        type: "expense",
        amount: 100000,
        categoryId: "food",
        categoryName: "Food",
        item: "Lunch",
        note: "",
        date: "2026-09-07",
        time: "1:00 PM",
        createdAt: now - 3600000 * 2,
      },
      {
        type: "expense",
        amount: 30000,
        categoryId: "transportation",
        categoryName: "Transportation",
        item: "Grab",
        note: "",
        date: "2026-09-07",
        time: "12:15 PM",
        createdAt: now - 3600000 * 2.5,
      },
      {
        type: "expense",
        amount: 250000,
        categoryId: "shopping",
        categoryName: "Shopping",
        item: "T-Shirt",
        note: "",
        date: "2026-09-06",
        time: "6:00 PM",
        createdAt: now - 86400000 - 3600000 * 2,
      },
      {
        type: "expense",
        amount: 45000,
        categoryId: "drinks",
        categoryName: "Drinks",
        item: "Milk Tea",
        note: "",
        date: "2026-09-06",
        time: "5:30 PM",
        createdAt: now - 86400000 - 3600000 * 3,
      },
    ]

    for (const item of demoItems) {
      await addExpense(user.uid, item)
    }
  }

  const openAddExpense = (categoryId?: string) => {
    setEditingExpense(null)
    if (categoryId) {
      setSelectedCategoryId(categoryId)
    }
    setAddExpenseOpen(true)
  }

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setAddExpenseOpen(true)
  }

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (headerSearch.trim()) {
      navigate(`/history?q=${encodeURIComponent(headerSearch.trim())}`)
    }
  }

  //  Sign out
  async function handleSignOut() {
    await signOut(auth)
  }

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Wallet className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Loading PocketTrack…</p>
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
    <div className={`min-h-screen bg-[#f7f7f5] text-zinc-900 ${darkMode ? "dark" : ""}`}>
      <div className="mx-auto flex min-h-screen max-w-[1600px]">

        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-zinc-200 bg-white p-5 lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div>
            {/* Logo */}
            <div className="mb-8 flex items-center gap-2.5 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-lg font-bold tracking-tight text-zinc-900">
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }`
                }
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </NavLink>

            </nav>
          </div>

          <div className="pt-6 space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-[#f0fdf4] p-4">
              <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-zinc-900 leading-snug">
                Better tracking, brighter tomorrow.
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
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

        {/* ── Main Content Area ── */}
        <main className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-5 py-3.5 backdrop-blur-md sm:px-8">
            {/* Mobile Logo */}
            <div className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              PocketTrack
            </div>

            {/* Desktop Search Bar */}
            <form onSubmit={handleHeaderSearch} className="hidden max-w-md flex-1 lg:block">
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search expenses, items, or categories..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white"
              />
            </form>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              {/* Currency Quick Switcher */}
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/90 py-1 pl-2 pr-5 text-[11px] font-semibold text-zinc-700 outline-none transition hover:bg-zinc-100 focus:border-emerald-500 focus:bg-white cursor-pointer shadow-2xs appearance-none sm:rounded-xl sm:py-1.5 sm:pl-2.5 sm:pr-6 sm:text-xs"
                  title="Switch Currency"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 sm:right-1.5 sm:h-3.5 sm:w-3.5" />
              </div>

              {/* Notifications — hidden on mobile to save space */}
              <button
                type="button"
                className="relative hidden rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 sm:flex"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              </button>

              {/* Dark mode — hidden on mobile to save space */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="hidden rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 sm:flex"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* User Profile — always visible */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-emerald-500/20"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                    {initials}
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <span className="text-xs font-semibold text-zinc-800">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-zinc-200 bg-white py-1.5 shadow-xl z-50">
                    <div className="border-b border-zinc-100 px-4 py-2">
                      <p className="text-xs font-semibold text-zinc-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
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
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Routing */}
          <div className="flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    expenses={expenses}
                    userName={firstName}
                    onAddExpense={openAddExpense}
                    onEditExpense={openEditExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onSeedDemoData={handleSeedDemoData}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <HistoryPage
                    expenses={expenses}
                    trashCount={trashCount}
                    onEditExpense={openEditExpense}
                    onDeleteExpense={handleDeleteExpense}
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
                  />
                }
              />
              <Route
                path="/trash"
                element={
                  <TrashPage
                    userId={user.uid}
                    onRestore={handleRestoreExpense}
                    onTrashEmptied={() => showToast("Trash emptied")}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-6 items-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                isActive ? "text-emerald-600 font-semibold" : "text-zinc-400"
              }`
            }
          >
            <Home className="h-5 w-5" />
            Home
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                isActive ? "text-emerald-600 font-semibold" : "text-zinc-400"
              }`
            }
          >
            <ReceiptText className="h-5 w-5" />
            History
          </NavLink>

          <NavLink
            to="/recurring"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                isActive ? "text-emerald-600 font-semibold" : "text-zinc-400"
              }`
            }
          >
            <Repeat className="h-5 w-5" />
            Recurring
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                isActive ? "text-emerald-600 font-semibold" : "text-zinc-400"
              }`
            }
          >
            <BarChart3 className="h-5 w-5" />
            Analytics
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                isActive ? "text-emerald-600 font-semibold" : "text-zinc-400"
              }`
            }
          >
            <SettingsIcon className="h-5 w-5" />
            Settings
          </NavLink>

        </div>
      </nav>

      {/* Mobile Floating Add Expense Button */}
      <button
        type="button"
        aria-label="Add expense"
        onClick={() => openAddExpense()}
        className="fixed bottom-18 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95 lg:hidden"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Add / Edit Transaction */}
      <AddExpenseSheet
        open={addExpenseOpen}
        defaultCategoryId={selectedCategoryId}
        initialExpense={editingExpense}
        onClose={() => {
          setAddExpenseOpen(false)
          setEditingExpense(null)
        }}
        onSave={handleSaveExpense}
        onUpdate={handleUpdateExpense}
        onSaveRecurring={handleAddRecurring}
      />
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-auto lg:translate-x-0">
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
  )
}

export default App
