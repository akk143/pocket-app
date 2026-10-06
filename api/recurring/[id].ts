import { adminDb } from "../../server/firebaseAdmin"
import {
  ApiError,
  RATE_LIMITS,
  type ApiRequest,
  type ApiResponse,
  assertSameOrigin,
  preventCaching,
  rateLimit,
  requiredDocumentId,
  requestBody,
  requireUser,
  sendError,
} from "../../server/http"
import { validateRecurringPatch } from "../../server/validation"
import type { RecurringTransaction } from "../../src/types/expense"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.apiWrite)
    const user = await requireUser(req)
    const id = requiredDocumentId(req)
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
  } catch (error) {
    return sendError(res, error, "Could not update recurring schedule")
  }
}
