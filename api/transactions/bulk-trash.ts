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

    const uniqueIds = [...new Set(body.ids as string[])]
    const collection = adminDb().collection("users").doc(user.uid).collection("expenses")
    const documents = await adminDb().getAll(...uniqueIds.map((id) => collection.doc(id)))
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
  } catch (error) {
    return sendError(res, error, "Could not move transactions to Trash")
  }
}
