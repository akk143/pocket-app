import { useState, useEffect, useId, useRef } from "react"
import { Check, Loader2, Tag, Trash2, Archive, RotateCcw, X, AlertCircle } from "lucide-react"
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_NAMES,
  CATEGORY_COLORS,
} from "../constants/categories"
import type { CategoryDef } from "../constants/categories"
import type { CreateCategoryPayload, UpdateCategoryPayload } from "../types/category"
import ConfirmDialog from "./ConfirmDialog"

interface CategoryModalProps {
  open: boolean
  mode: "add" | "edit"
  category?: CategoryDef | null
  initialType?: "expense" | "income"
  existingCategories?: CategoryDef[]
  onClose: () => void
  onSave: (payload: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>
  onArchiveToggle?: (categoryId: string, archive: boolean) => Promise<void>
  onDelete?: (categoryId: string) => Promise<void>
}

export default function CategoryModal({
  open,
  mode,
  category,
  initialType = "expense",
  existingCategories,
  onClose,
  onSave,
  onArchiveToggle,
  onDelete,
}: CategoryModalProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"expense" | "income">(initialType)
  const [icon, setIcon] = useState<string>("Tag")
  const [color, setColor] = useState<string>(CATEGORY_COLORS[3]) // emerald default
  const [iconSearch, setIconSearch] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const nameInputId = useId()

  useEffect(() => {
    if (!open) return
    setErrorMessage(null)
    setIconSearch("")

    if (mode === "edit" && category) {
      setName(category.name)
      setType(category.type)
      // Find matching icon name in CATEGORY_ICONS
      const matchingIcon =
        CATEGORY_ICON_NAMES.find(
          (name) => CATEGORY_ICONS[name] === category.component,
        ) || "Tag"
      setIcon(matchingIcon)
      setColor(category.color || CATEGORY_COLORS[0])
    } else {
      setName("")
      setType(initialType)
      setIcon(initialType === "income" ? "Wallet" : "ShoppingBag")
      setColor(initialType === "income" ? "#10b981" : "#f97316")
    }

    // Auto-focus input when opened
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [open, mode, category, initialType])

  if (!open) return null

  const filteredIcons = CATEGORY_ICON_NAMES.filter((iName) =>
    iName.toLowerCase().includes(iconSearch.toLowerCase().trim()),
  )

  const PreviewComponent = CATEGORY_ICONS[icon] || Tag

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMessage("Please enter a category name.")
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      nameInputRef.current?.focus()
      return
    }

    if (trimmedName.length > 40) {
      setErrorMessage("Category name must be 40 characters or less.")
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      nameInputRef.current?.focus()
      return
    }

    // Check for existing duplicate category of the same type
    const targetType = mode === "add" ? type : category?.type || type
    if (existingCategories) {
      const duplicate = existingCategories.find((c) => {
        if (c.type !== targetType) return false
        if (category && c.id === category.id) return false
        return c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      })
      if (duplicate) {
        const errorMsg = duplicate.archived
          ? `An archived ${targetType} category named "${trimmedName}" already exists. You can restore it instead.`
          : `A ${targetType} category named "${trimmedName}" already exists.`
        setErrorMessage(errorMsg)
        formRef.current?.scrollTo({ top: 0, behavior: "smooth" })
        nameInputRef.current?.focus()
        return
      }
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      if (mode === "add") {
        await onSave({
          name: trimmedName,
          type,
          icon,
          color,
        })
      } else if (category) {
        await onSave({
          name: trimmedName,
          icon,
          color,
        })
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category."
      setErrorMessage(msg)
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      nameInputRef.current?.focus()
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchiveToggle = async () => {
    if (!category || !onArchiveToggle) return
    setIsArchiving(true)
    setErrorMessage(null)
    try {
      await onArchiveToggle(category.id, !category.archived)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update archive status."
      setErrorMessage(msg)
    } finally {
      setIsArchiving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!category || !onDelete) return
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      await onDelete(category.id)
      setIsConfirmDeleteOpen(false)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category."
      setErrorMessage(msg)
      setIsConfirmDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 backdrop-blur-[2px] dark:bg-zinc-950/60 sm:items-center sm:p-4">
        {/* Backdrop click to close */}
        <div
          aria-hidden="true"
          onClick={() => {
            if (!isSaving && !isArchiving && !isDeleting) onClose()
          }}
          className="absolute inset-0"
        />

        {/* Modal Window */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <div>
              <h2
                id="category-modal-title"
                className="text-base font-bold text-zinc-900 dark:text-white sm:text-lg"
              >
                {mode === "add" ? "New Custom Category" : "Edit Category"}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {mode === "add"
                  ? "Create a custom category for transactions"
                  : "Change name, icon, color, or archive status"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isArchiving || isDeleting}
              aria-label="Close dialog"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form Content */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6 sm:py-5"
          >
            <div className="space-y-4">
              {/* Error banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="flex-1 font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Live Preview Card */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors"
                  style={{ backgroundColor: `${color}1a` }}
                >
                  <PreviewComponent className="h-5 w-5" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                      {name.trim() || "Category Name"}
                    </p>
                    <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      {type === "income" ? "Income" : "Expense"}
                    </span>
                    {category?.archived && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    Live preview of category appearance
                  </p>
                </div>
              </div>

              {/* Type Switcher (only when adding) */}
              {mode === "add" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Category Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-100/60 p-1 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        setType("expense")
                        if (icon === "Wallet") setIcon("ShoppingBag")
                        if (color === "#10b981") setColor("#f97316")
                      }}
                      className={`flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition ${
                        type === "expense"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setType("income")
                        if (icon === "ShoppingBag") setIcon("Wallet")
                        if (color === "#f97316") setColor("#10b981")
                      }}
                      className={`flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition ${
                        type === "income"
                          ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-700 dark:text-emerald-300"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Category Name */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor={nameInputId}
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    {name.length}/40
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  id={nameInputId}
                  type="text"
                  maxLength={40}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder="e.g. Pets, Gaming, Side Projects"
                  required
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? `${nameInputId}-error` : undefined}
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium transition placeholder:text-zinc-400 focus:outline-none dark:bg-zinc-800/80 dark:placeholder:text-zinc-500 ${
                    errorMessage
                      ? "border-rose-500 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-500 dark:text-rose-100"
                      : "border-zinc-200 text-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:text-white"
                  }`}
                />
                {errorMessage && (
                  <p
                    id={`${nameInputId}-error`}
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </p>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Color Accent
                </label>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {CATEGORY_COLORS.map((c) => {
                    const isSelected = color.toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`Select color ${c}`}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                          isSelected ? "scale-110 ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-900" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Icon ({filteredIcons.length})
                  </label>
                  <input
                    type="text"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Search icons..."
                    className="h-7 w-36 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div className="grid max-h-44 grid-cols-7 gap-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/50 sm:grid-cols-8">
                  {filteredIcons.map((iName) => {
                    const IconComp = CATEGORY_ICONS[iName] || Tag
                    const isSelected = icon === iName
                    return (
                      <button
                        key={iName}
                        type="button"
                        onClick={() => setIcon(iName)}
                        title={iName}
                        aria-label={`Select icon ${iName}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                          isSelected
                            ? "bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900"
                            : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Edit Mode Management Actions: Archive & Delete */}
              {mode === "edit" && category && (
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Category Status & Management
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {onArchiveToggle && (
                      <button
                        type="button"
                        onClick={handleArchiveToggle}
                        disabled={isArchiving || isSaving || isDeleting}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          category.archived
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300"
                        }`}
                      >
                        {isArchiving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : category.archived ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                        <span>{category.archived ? "Restore Category" : "Archive Category"}</span>
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => setIsConfirmDeleteOpen(true)}
                        disabled={isDeleting || isSaving || isArchiving}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    Archived categories cannot be selected for new transactions, but existing records remain unchanged.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1">
                {errorMessage && (
                  <p
                    className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    title={errorMessage}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2 sm:truncate">{errorMessage}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isArchiving || isDeleting}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isArchiving || isDeleting || !name.trim()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{mode === "add" ? "Create Category" : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {category && (
        <ConfirmDialog
          open={isConfirmDeleteOpen}
          title={`Delete "${category.name}"?`}
          message="Are you sure you want to delete this category? Categories referenced by existing transactions or recurring schedules cannot be deleted and should be archived instead."
          confirmLabel="Delete"
          isLoading={isDeleting}
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmDeleteOpen(false)}
        />
      )}
    </>
  )
}
