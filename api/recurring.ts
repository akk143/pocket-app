import { adminDb } from "../server/firebaseAdmin.js"
import {
  ApiError,
  RATE_LIMITS,
  type ApiRequest,
  type ApiResponse,
  assertSameOrigin,
  preventCaching,
  rateLimit,
  requestBody,
  requireUser,
  sendError,
} from "../server/http.js"
import { validateNewRecurring, validateRecurringPatch } from "../server/validation.js"
import { postRecurring } from "../server/recurring.js"
import type { RecurringTransaction } from "../src/types/expense"

/**
 * Consolidated recurring handler — routes by path and method:
 *
 *   GET    /api/recurring            → list all recurring schedules
 *   POST   /api/recurring            → create recurring schedule
 *
 *   PATCH  /api/recurring/:id        → update recurring schedule
 *   DELETE /api/recurring/:id        → delete recurring schedule
 *
 *   POST   /api/recurring/:id/post   → manually trigger recurring now
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)

  const url = req.url ?? ""
  const path = url.split("?")[0].replace(/\/+$/, "")
  const sub = path.replace(/^\/api\/recurring\/?/, "") // "" | "<id>" | "<id>/post"

  try {
    // ── GET/POST /api/recurring ───────────────────────────────────────────────
    if (sub === "" || sub === "index") {
      return await handleCollection(req, res)
    }

    // ── POST /api/recurring/:id/post ──────────────────────────────────────────
    const postMatch = sub.match(/^([A-Za-z0-9_-]{1,128})\/post$/)
    if (postMatch) {
      return await handlePost(req, res, postMatch[1])
    }

    // ── PATCH/DELETE /api/recurring/:id ───────────────────────────────────────
    const idMatch = sub.match(/^([A-Za-z0-9_-]{1,128})$/)
    if (idMatch) {
      return await handleDocument(req, res, idMatch[1])
    }

    return res.status(404).json({ error: "Not found" })
  } catch (error) {
    return sendError(res, error, "Could not process recurring schedule request")
  }
}

// ── GET /api/recurring  |  POST /api/recurring ────────────────────────────────

async function handleCollection(req: ApiRequest, res: ApiResponse) {
  rateLimit(req, res, req.method === "GET" ? RATE_LIMITS.apiRead : RATE_LIMITS.apiWrite)
  const user = await requireUser(req)
  const collection = adminDb().collection("users").doc(user.uid).collection("recurring")

  if (req.method === "GET") {
    const snapshot = await collection.orderBy("createdAt", "desc").get()
    return res.status(200).json({
      recurring: snapshot.docs.map((document) => ({ ...document.data(), id: document.id })),
    })
  }

  if (req.method === "POST") {
    assertSameOrigin(req)
    const item = validateNewRecurring(requestBody(req))
    const document = await collection.add(item)
    return res.status(201).json({ id: document.id })
  }

  res.setHeader("Allow", "GET, POST")
  return res.status(405).json({ error: "Method not allowed" })
}

// ── PATCH/DELETE /api/recurring/:id ──────────────────────────────────────────

async function handleDocument(req: ApiRequest, res: ApiResponse, id: string) {
  rateLimit(req, res, RATE_LIMITS.apiWrite)
  const user = await requireUser(req)
  const document = adminDb().collection("users").doc(user.uid).collection("recurring").doc(id)

  if (req.method === "DELETE") {
    assertSameOrigin(req)
    const snapshot = await document.get()
    if (!snapshot.exists) throw new ApiError(404, "Recurring schedule not found")
    await document.delete()
    return res.status(200).json({ ok: true })
  }

  if (req.method === "PATCH") {
    assertSameOrigin(req)
    const snapshot = await document.get()
    if (!snapshot.exists) throw new ApiError(404, "Recurring schedule not found")
    const patch = validateRecurringPatch(
      snapshot.data() as Omit<RecurringTransaction, "id">,
      requestBody(req),
    )
    await document.update(patch)
    return res.status(200).json({ ok: true })
  }

  res.setHeader("Allow", "PATCH, DELETE")
  return res.status(405).json({ error: "Method not allowed" })
}

// ── POST /api/recurring/:id/post ──────────────────────────────────────────────

async function handlePost(req: ApiRequest, res: ApiResponse, id: string) {
  rateLimit(req, res, RATE_LIMITS.apiWrite)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }
  assertSameOrigin(req)
  const user = await requireUser(req)
  const body = requestBody(req)
  if (Object.keys(body).length) throw new ApiError(400, "Unexpected request fields")

  const recurringRef = adminDb().collection("users").doc(user.uid).collection("recurring").doc(id)
  const result = await postRecurring(user.uid, recurringRef, { dueOnly: false, manual: true })
  if (!result.posted) throw new ApiError(409, "Already posted today for this recurring item")

  return res.status(201).json({ id: result.id })
}
