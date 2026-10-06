import { adminDb } from "../../server/firebaseAdmin"
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
  requireMethod,
  requireUser,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.bulkWrite)
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    const user = await requireUser(req)
    const body = requestBody(req)
    assertAllowedFields(body, ["ids"])
    if (
      !Array.isArray(body.ids) ||
      body.ids.length < 1 ||
      body.ids.length > 400 ||
      body.ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
    ) {
      throw new ApiError(400, "Select between 1 and 400 valid transactions")
    }

    const ids = [...new Set(body.ids as string[])]
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
  } catch (error) {
    return sendError(res, error, "Could not permanently delete transactions")
  }
}
