import { adminDb } from "../../server/firebaseAdmin"
import {
  RATE_LIMITS,
  type ApiRequest,
  type ApiResponse,
  preventCaching,
  assertSameOrigin,
  rateLimit,
  requireUser,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
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

    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE, GET")
      return res.status(405).json({ error: "Method not allowed" })
    }
    assertSameOrigin(req)
    const snapshot = await collection.where("deletedAt", ">", 0).get()
    const deleted = snapshot.docs

    for (let offset = 0; offset < deleted.length; offset += 400) {
      const batch = adminDb().batch()
      for (const document of deleted.slice(offset, offset + 400)) batch.delete(document.ref)
      await batch.commit()
    }

    return res.status(200).json({ deletedCount: deleted.length })
  } catch (error) {
    return sendError(res, error, "Could not load or empty Trash")
  }
}
