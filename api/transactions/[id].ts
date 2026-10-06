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
  requireMethod,
  requireUser,
  sendError,
} from "../../server/http"
import { validateTransactionPatch } from "../../server/validation"
import type { Expense } from "../../src/types/expense"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.apiWrite)
    const user = await requireUser(req)
    const id = requiredDocumentId(req)
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

    requireMethod(req, res, "PATCH")
    assertSameOrigin(req)
    const snapshot = await document.get()
    if (!snapshot.exists) throw new ApiError(404, "Transaction not found")
    if (snapshot.get("deletedAt")) throw new ApiError(409, "Restore this transaction before editing it")

    const patch = validateTransactionPatch(snapshot.data() as Omit<Expense, "id">, requestBody(req))
    await document.update(patch)
    return res.status(200).json({ ok: true })
  } catch (error) {
    return sendError(res, error, "Could not update transaction")
  }
}
