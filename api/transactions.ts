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
import { validateNewTransaction, validateTransactionPatch } from "../server/validation.js"
import type { Expense } from "../src/types/expense.js"

/**
 * Consolidated transactions handler — routes by path and method:
 *
 *   GET    /api/transactions                  → list active transactions
 *   POST   /api/transactions                  → create transaction
 *
 *   GET    /api/transactions/trash            → list trashed transactions
 *   DELETE /api/transactions/trash            → empty trash (delete all trashed)
 *
 *   POST   /api/transactions/bulk-trash       → move many → trash
 *   POST   /api/transactions/bulk-restore     → restore many from trash
 *   POST   /api/transactions/bulk-permanent   → permanently delete many from trash
 *
 *   PATCH  /api/transactions/:id             → update transaction
 *   DELETE /api/transactions/:id             → move single → trash
 *
 *   POST   /api/transactions/:id/restore     → restore single from trash
 *   DELETE /api/transactions/:id/permanent   → permanently delete single from trash
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)

  const url = req.url ?? ""
  const path = url.split("?")[0].replace(/\/+$/, "")
  // Strip /api/transactions prefix; what remains is the sub-path
  const sub = path.replace(/^\/api\/transactions\/?/, "") // e.g. "" | "trash" | "bulk-trash" | "<id>" | "<id>/restore"

  try {
    // ── Static keyword routes (must come before the :id wildcard) ─────────────

    if (sub === "" || sub === "index") {
      return await handleCollection(req, res)
    }

    if (sub === "trash") {
      return await handleTrash(req, res)
    }

    if (sub === "bulk-trash") {
      return await handleBulkTrash(req, res)
    }

    if (sub === "bulk-restore") {
      return await handleBulkRestore(req, res)
    }

    if (sub === "bulk-permanent") {
      return await handleBulkPermanent(req, res)
    }

    // ── :id/action routes ─────────────────────────────────────────────────────

    const restoreMatch = sub.match(/^([A-Za-z0-9_-]{1,128})\/restore$/)
    if (restoreMatch) {
      return await handleRestore(req, res, restoreMatch[1])
    }

    const permanentMatch = sub.match(/^([A-Za-z0-9_-]{1,128})\/permanent$/)
    if (permanentMatch) {
      return await handlePermanent(req, res, permanentMatch[1])
    }

    // ── :id route ─────────────────────────────────────────────────────────────

    const idMatch = sub.match(/^([A-Za-z0-9_-]{1,128})$/)
    if (idMatch) {
      return await handleDocument(req, res, idMatch[1])
    }

    return res.status(404).json({ error: "Not found" })
  } catch (error) {
    return sendError(res, error, "Could not process transaction request")
  }
}

// ── GET /api/transactions  |  POST /api/transactions ─────────────────────────

async function handleCollection(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, req.method === "GET" ? RATE_LIMITS.apiRead : RATE_LIMITS.apiWrite)
  const user = await requireUser(req)
  const collection = adminDb().collection("users").doc(user.uid).collection("expenses")

  if (req.method === "GET") {
    const snapshot = await collection.orderBy("createdAt", "desc").get()
    const transactions: Record<string, unknown>[] = snapshot.docs.map((document) => {
      const data = document.data() as Record<string, unknown>
      return { ...data, id: document.id }
    })
    return res.status(200).json({ transactions: transactions.filter((item) => !item.deletedAt) })
  }

  if (req.method === "POST") {
    assertSameOrigin(req)
    const transaction = validateNewTransaction(requestBody(req))
    const document = await collection.add(transaction)
    return res.status(201).json({ id: document.id })
  }

  res.setHeader("Allow", "GET, POST")
  return res.status(405).json({ error: "Method not allowed" })
}

// ── GET /api/transactions/trash  |  DELETE /api/transactions/trash ────────────

async function handleTrash(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, req.method === "GET" ? RATE_LIMITS.apiRead : RATE_LIMITS.bulkWrite)
  const user = await requireUser(req)
  const collection = adminDb().collection("users").doc(user.uid).collection("expenses")

  if (req.method === "GET") {
    const snapshot = await collection.where("deletedAt", ">", 0).get()
    const transactions = snapshot.docs
      .sort((a, b) => {
        const aCreatedAt = a.get("createdAt")
        const bCreatedAt = b.get("createdAt")
        return (typeof bCreatedAt === "number" ? bCreatedAt : 0) -
          (typeof aCreatedAt === "number" ? aCreatedAt : 0)
      })
      .map((document) => ({ ...document.data(), id: document.id }))
    return res.status(200).json({ transactions })
  }

  if (req.method === "DELETE") {
    assertSameOrigin(req)
    const snapshot = await collection.where("deletedAt", ">", 0).get()
    const deleted = snapshot.docs
    for (let offset = 0; offset < deleted.length; offset += 400) {
      const batch = adminDb().batch()
      for (const document of deleted.slice(offset, offset + 400)) batch.delete(document.ref)
      await batch.commit()
    }
    return res.status(200).json({ deletedCount: deleted.length })
  }

  res.setHeader("Allow", "DELETE, GET")
  return res.status(405).json({ error: "Method not allowed" })
}

// ── POST /api/transactions/bulk-trash ─────────────────────────────────────────

async function handleBulkTrash(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, RATE_LIMITS.bulkWrite)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }
  assertSameOrigin(req)
  const user = await requireUser(req)
  const body = requestBody(req)
  assertAllowedFields(body, ["ids"])
  const ids = validatedIds(body)
  const collection = adminDb().collection("users").doc(user.uid).collection("expenses")
  const documents = await adminDb().getAll(...ids.map((id) => collection.doc(id)))
  const timestamp = Date.now()
  const batch = adminDb().batch()
  const movedIds: string[] = []
  for (const document of documents) {
    if (document.exists && !document.get("deletedAt")) {
      batch.update(document.ref, { deletedAt: timestamp })
      movedIds.push(document.id)
    }
  }
  if (movedIds.length) await batch.commit()
  return res.status(200).json({ movedIds })
}

// ── POST /api/transactions/bulk-restore ───────────────────────────────────────

async function handleBulkRestore(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, RATE_LIMITS.bulkWrite)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }
  assertSameOrigin(req)
  const user = await requireUser(req)
  const body = requestBody(req)
  assertAllowedFields(body, ["ids"])
  const ids = validatedIds(body)
  const collection = adminDb().collection("users").doc(user.uid).collection("expenses")
  const documents = await adminDb().getAll(...ids.map((id) => collection.doc(id)))
  const batch = adminDb().batch()
  const restoredIds: string[] = []
  for (const document of documents) {
    if (document.exists && document.get("deletedAt")) {
      batch.update(document.ref, { deletedAt: null })
      restoredIds.push(document.id)
    }
  }
  if (restoredIds.length) await batch.commit()
  return res.status(200).json({ restoredIds })
}

// ── POST /api/transactions/bulk-permanent ─────────────────────────────────────

async function handleBulkPermanent(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, RATE_LIMITS.bulkWrite)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }
  assertSameOrigin(req)
  const user = await requireUser(req)
  const body = requestBody(req)
  assertAllowedFields(body, ["ids"])
  const ids = validatedIds(body)
  const collection = adminDb().collection("users").doc(user.uid).collection("expenses")
  const documents = await adminDb().getAll(...ids.map((id) => collection.doc(id)))
  const batch = adminDb().batch()
  let deletedCount = 0
  for (const document of documents) {
    if (document.exists && document.get("deletedAt")) {
      batch.delete(document.ref)
      deletedCount += 1
    }
  }
  if (deletedCount) await batch.commit()
  return res.status(200).json({ deletedCount })
}

// ── PATCH/DELETE /api/transactions/:id ───────────────────────────────────────

async function handleDocument(req: ApiRequest, res: ApiResponse, id: string) {
  rateLimit(req, res, RATE_LIMITS.apiWrite)
  const user = await requireUser(req)
  const document = adminDb().collection("users").doc(user.uid).collection("expenses").doc(id)

  if (req.method === "DELETE") {
    assertSameOrigin(req)
    const snapshot = await document.get()
    if (!snapshot.exists || snapshot.get("deletedAt")) {
      throw new ApiError(404, "Transaction not found")
    }
    await document.update({ deletedAt: Date.now() })
    return res.status(200).json({ ok: true })
  }

  if (req.method === "PATCH") {
    assertSameOrigin(req)
    const snapshot = await document.get()
    if (!snapshot.exists) throw new ApiError(404, "Transaction not found")
    if (snapshot.get("deletedAt")) throw new ApiError(409, "Restore this transaction before editing it")
    const patch = validateTransactionPatch(snapshot.data() as Omit<Expense, "id">, requestBody(req))
    await document.update(patch)
    return res.status(200).json({ ok: true })
  }

  res.setHeader("Allow", "PATCH, DELETE")
  return res.status(405).json({ error: "Method not allowed" })
}

// ── POST /api/transactions/:id/restore ───────────────────────────────────────

async function handleRestore(req: ApiRequest, res: ApiResponse, id: string) {
  rateLimit(req, res, RATE_LIMITS.apiWrite)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }
  assertSameOrigin(req)
  const user = await requireUser(req)
  const body = requestBody(req)
  if (Object.keys(body).length) throw new ApiError(400, "Unexpected request fields")
  const document = adminDb().collection("users").doc(user.uid).collection("expenses").doc(id)
  const snapshot = await document.get()
  if (!snapshot.exists || !snapshot.get("deletedAt")) {
    throw new ApiError(404, "Transaction not found in Trash")
  }
  await document.update({ deletedAt: null })
  return res.status(200).json({ ok: true })
}

// ── DELETE /api/transactions/:id/permanent ────────────────────────────────────

async function handlePermanent(req: ApiRequest, res: ApiResponse, id: string) {
  rateLimit(req, res, RATE_LIMITS.apiWrite)
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE")
    return res.status(405).json({ error: "Method not allowed" })
  }
  assertSameOrigin(req)
  const user = await requireUser(req)
  const document = adminDb().collection("users").doc(user.uid).collection("expenses").doc(id)
  const snapshot = await document.get()
  if (!snapshot.exists || !snapshot.get("deletedAt")) {
    throw new ApiError(404, "Transaction not found in Trash")
  }
  await document.delete()
  return res.status(200).json({ ok: true })
}

// ── Shared ID validation helper ───────────────────────────────────────────────

function validatedIds(body: Record<string, unknown>): string[] {
  if (
    !Array.isArray(body.ids) ||
    body.ids.length < 1 ||
    body.ids.length > 400 ||
    body.ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
  ) {
    throw new ApiError(400, "Select between 1 and 400 valid transactions")
  }
  return [...new Set(body.ids as string[])]
}


