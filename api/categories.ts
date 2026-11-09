import { adminDb } from "../server/firebaseAdmin.js"
import {
  ApiError,
  RATE_LIMITS,
  type ApiRequest,
  type ApiResponse,
  assertAllowedFields,
  assertSameOrigin,
  preventCaching,
  rateLimit,
  requestBody,
  requireUser,
  sendError,
} from "../server/http.js"
import {
  CATEGORY_ICON_NAMES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "../src/constants/categories.js"
import type { CustomCategory } from "../src/types/category.js"

const CATEGORY_FIELDS = ["name", "type", "icon", "color"] as const
const UPDATE_FIELDS = ["name", "icon", "color", "archived"] as const
const COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function normalizeName(name: unknown): string {
  if (typeof name !== "string") {
    throw new ApiError(400, "Category name is required")
  }
  const trimmed = name.trim()
  if (!trimmed) {
    throw new ApiError(400, "Category name cannot be blank")
  }
  if (trimmed.length > 40) {
    throw new ApiError(400, "Category name must be 40 characters or fewer")
  }
  return trimmed
}

function validateIcon(icon: unknown): string {
  if (typeof icon !== "string" || !CATEGORY_ICON_NAMES.includes(icon)) {
    throw new ApiError(400, "Please select an approved category icon")
  }
  return icon
}

function validateColor(color: unknown): string {
  if (typeof color !== "string" || !COLOR_HEX_PATTERN.test(color)) {
    throw new ApiError(400, "Please select a valid hex color code")
  }
  return color.toLowerCase()
}

async function checkDuplicateName(
  userId: string,
  type: "expense" | "income",
  name: string,
  excludeCategoryId?: string,
): Promise<void> {
  const normalized = name.toLowerCase()

  // 1. Check against built-ins of the same type
  const builtIns = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  if (builtIns.some((b) => b.name.trim().toLowerCase() === normalized)) {
    throw new ApiError(409, `A built-in ${type} category named "${name}" already exists`)
  }

  // 2. Check against user's custom categories of the same type that are active
  const snapshot = await adminDb()
    .collection("users")
    .doc(userId)
    .collection("categories")
    .where("type", "==", type)
    .get()

  for (const doc of snapshot.docs) {
    if (excludeCategoryId && doc.id === excludeCategoryId) continue
    const data = doc.data() as CustomCategory
    // Only active categories conflict
    if (!data.archivedAt && data.name.trim().toLowerCase() === normalized) {
      throw new ApiError(409, `You already have an active ${type} category named "${name}"`)
    }
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)

  let sub = ""
  if (req.query?.path) {
    const queryPath = Array.isArray(req.query.path)
      ? req.query.path.join("/")
      : String(req.query.path)
    sub = queryPath.split("?")[0].replace(/^\/+|\/+$/g, "")
  }
  if (!sub) {
    const url = req.url ?? ""
    const path = url.split("?")[0].replace(/\/+$/, "")
    sub = path.replace(/^\/api\/categories\/?/, "").replace(/^\/+|\/+$/g, "")
  }

  try {
    if (sub === "" || sub === "index") {
      return await handleCollection(req, res)
    }

    const idMatch = sub.match(/^([A-Za-z0-9_-]{1,128})$/)
    if (idMatch) {
      return await handleDocument(req, res, idMatch[1])
    }

    return res.status(404).json({ error: "Not found" })
  } catch (error) {
    return sendError(res, error, "Could not process category request")
  }
}

// ── GET /api/categories  |  POST /api/categories ─────────────────────────────

async function handleCollection(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, req.method === "GET" ? RATE_LIMITS.apiRead : RATE_LIMITS.apiWrite)
  const user = await requireUser(req)
  const collection = adminDb().collection("users").doc(user.uid).collection("categories")

  if (req.method === "GET") {
    const snapshot = await collection.orderBy("createdAt", "asc").get()
    const categories: CustomCategory[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<CustomCategory, "id">
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        archivedAt: data.archivedAt ?? null,
      }
    })
    return res.status(200).json({ categories })
  }

  if (req.method === "POST") {
    assertSameOrigin(req)
    const body = requestBody(req)
    assertAllowedFields(body, CATEGORY_FIELDS)

    const name = normalizeName(body.name)
    if (body.type !== "expense" && body.type !== "income") {
      throw new ApiError(400, "Category type must be 'expense' or 'income'")
    }
    const type = body.type as "expense" | "income"
    const icon = validateIcon(body.icon)
    const color = validateColor(body.color)

    await checkDuplicateName(user.uid, type, name)

    const now = Date.now()
    const categoryId = `cat_${now}_${Math.random().toString(36).slice(2, 9)}`
    const docRef = collection.doc(categoryId)

    const newCategory: Omit<CustomCategory, "id"> = {
      name,
      type,
      icon,
      color,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    }

    await docRef.set(newCategory)
    return res.status(201).json({ category: { ...newCategory, id: categoryId } })
  }

  res.setHeader("Allow", "GET, POST")
  return res.status(405).json({ error: "Method not allowed" })
}

// ── PATCH /api/categories/:id  |  DELETE /api/categories/:id ─────────────────

async function handleDocument(req: ApiRequest, res: ApiResponse, id: string) {
  rateLimit(req, res, RATE_LIMITS.apiWrite)
  const user = await requireUser(req)
  const docRef = adminDb().collection("users").doc(user.uid).collection("categories").doc(id)

  if (req.method === "PATCH") {
    assertSameOrigin(req)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      throw new ApiError(404, "Category not found")
    }

    const current = snapshot.data() as CustomCategory
    const body = requestBody(req)
    assertAllowedFields(body, UPDATE_FIELDS)

    const updates: Partial<CustomCategory> = {
      updatedAt: Date.now(),
    }

    let nextName = current.name
    let willBeActive = !current.archivedAt

    if (body.archived !== undefined) {
      if (typeof body.archived !== "boolean") {
        throw new ApiError(400, "Archived field must be a boolean")
      }
      willBeActive = !body.archived
      updates.archivedAt = body.archived ? Date.now() : null
    }

    if (body.name !== undefined) {
      nextName = normalizeName(body.name)
      updates.name = nextName
    }

    if (body.icon !== undefined) {
      updates.icon = validateIcon(body.icon)
    }

    if (body.color !== undefined) {
      updates.color = validateColor(body.color)
    }

    // Check for duplicate name if renaming, or unarchiving an active name
    if (willBeActive && (body.name !== undefined || body.archived === false)) {
      await checkDuplicateName(user.uid, current.type, nextName, id)
    }

    await docRef.update(updates)
    const updatedSnap = await docRef.get()
    const updatedData = updatedSnap.data() as Omit<CustomCategory, "id">

    return res.status(200).json({
      category: {
        id,
        ...updatedData,
        archivedAt: updatedData.archivedAt ?? null,
      },
    })
  }

  if (req.method === "DELETE") {
    assertSameOrigin(req)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      throw new ApiError(404, "Category not found")
    }

    // Check if referenced in transactions
    const expensesRef = adminDb().collection("users").doc(user.uid).collection("expenses")
    const expenseUsage = await expensesRef.where("categoryId", "==", id).limit(1).get()
    if (!expenseUsage.empty) {
      throw new ApiError(
        409,
        "Cannot permanently delete a category that is referenced by transactions. You can archive it instead.",
      )
    }

    // Check if referenced in recurring schedules
    const recurringRef = adminDb().collection("users").doc(user.uid).collection("recurring")
    const recurringUsage = await recurringRef.where("categoryId", "==", id).limit(1).get()
    if (!recurringUsage.empty) {
      throw new ApiError(
        409,
        "Cannot permanently delete a category that is referenced by recurring schedules. You can archive it instead.",
      )
    }

    await docRef.delete()
    return res.status(200).json({ ok: true })
  }

  res.setHeader("Allow", "PATCH, DELETE")
  return res.status(405).json({ error: "Method not allowed" })
}
