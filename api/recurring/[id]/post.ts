import { adminDb } from "../../../server/firebaseAdmin"
import {
  ApiError,
  type ApiRequest,
  type ApiResponse,
  assertSameOrigin,
  preventCaching,
  requiredDocumentId,
  requestBody,
  requireMethod,
  requireUser,
  sendError,
} from "../../../server/http"
import { postRecurring } from "../../../server/recurring"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    const user = await requireUser(req)
    const body = requestBody(req)
    if (Object.keys(body).length) throw new ApiError(400, "Unexpected request fields")

    const id = requiredDocumentId(req)
    const recurringRef = adminDb().collection("users").doc(user.uid).collection("recurring").doc(id)
    const result = await postRecurring(user.uid, recurringRef, { dueOnly: false, manual: true })
    if (!result.posted) throw new ApiError(409, "Already posted today for this recurring item")

    return res.status(201).json({ id: result.id })
  } catch (error) {
    return sendError(res, error, "Could not post recurring transaction")
  }
}
