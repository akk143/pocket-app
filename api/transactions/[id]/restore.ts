import { adminDb } from "../../../server/firebaseAdmin"
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
} from "../../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.apiWrite)
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    const user = await requireUser(req)
    const body = requestBody(req)
    if (Object.keys(body).length) throw new ApiError(400, "Unexpected request fields")

    const id = requiredDocumentId(req)
    const document = adminDb().collection("users").doc(user.uid).collection("expenses").doc(id)
    const snapshot = await document.get()
    if (!snapshot.exists || !snapshot.get("deletedAt")) {
      throw new ApiError(404, "Transaction not found in Trash")
    }
    await document.update({ deletedAt: null })
    return res.status(200).json({ ok: true })
  } catch (error) {
    return sendError(res, error, "Could not restore transaction")
  }
}
