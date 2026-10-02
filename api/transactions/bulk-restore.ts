import { adminDb } from "../../server/firebaseAdmin"
import {
  ApiError,
  type ApiRequest,
  type ApiResponse,
  assertAllowedFields,
  assertSameOrigin,
  preventCaching,
  requestBody,
  requireMethod,
  requireUser,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
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
    const restoredIds: string[] = []
    for (const document of documents) {
      if (document.exists && document.get("deletedAt")) {
        batch.update(document.ref, { deletedAt: null })
        restoredIds.push(document.id)
      }
    }
    if (restoredIds.length) await batch.commit()
    return res.status(200).json({ restoredIds })
  } catch (error) {
    return sendError(res, error, "Could not restore transactions")
  }
}
