import { adminDb } from "../../../server/firebaseAdmin"
import {
  ApiError,
  type ApiRequest,
  type ApiResponse,
  assertSameOrigin,
  preventCaching,
  requiredDocumentId,
  requireMethod,
  requireUser,
  sendError,
} from "../../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    requireMethod(req, res, "DELETE")
    assertSameOrigin(req)
    const user = await requireUser(req)
    const id = requiredDocumentId(req)
    const document = adminDb().collection("users").doc(user.uid).collection("expenses").doc(id)
    const snapshot = await document.get()
    if (!snapshot.exists || !snapshot.get("deletedAt")) {
      throw new ApiError(404, "Transaction not found in Trash")
    }
    await document.delete()
    return res.status(200).json({ ok: true })
  } catch (error) {
    return sendError(res, error, "Could not permanently delete transaction")
  }
}
