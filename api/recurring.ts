import { adminDb } from "../server/firebaseAdmin"
import {
  type ApiRequest,
  type ApiResponse,
  preventCaching,
  assertSameOrigin,
  requireUser,
  sendError,
} from "../server/http"
import { validateNewRecurring } from "../server/validation"
import { requestBody } from "../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
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
  } catch (error) {
    return sendError(res, error, "Could not load or save recurring schedules")
  }
}
