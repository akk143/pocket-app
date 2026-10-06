import { adminDb } from "../server/firebaseAdmin"
import {
  RATE_LIMITS,
  assertSameOrigin,
  type ApiRequest,
  type ApiResponse,
  preventCaching,
  rateLimit,
  requestBody,
  requireUser,
  sendError,
} from "../server/http"
import { validateNewTransaction } from "../server/validation"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, req.method === "GET" ? RATE_LIMITS.apiRead : RATE_LIMITS.apiWrite)
    const user = await requireUser(req)
    const collection = adminDb().collection("users").doc(user.uid).collection("expenses")

    if (req.method === "GET") {
      const snapshot = await collection.orderBy("createdAt", "desc").get()
      const transactions: Record<string, unknown>[] = snapshot.docs.map((document) => {
        const data = document.data() as Record<string, unknown>
        return { ...data, id: document.id }
      })
      return res.status(200).json({ transactions: transactions.filter((item) => !item.deletedAt) })
    }

    if (req.method === "POST") {
      assertSameOrigin(req)
      const transaction = validateNewTransaction(requestBody(req))
      const document = await collection.add(transaction)
      return res.status(201).json({ id: document.id })
    }

    return res.status(405).setHeader("Allow", "GET, POST").json({ error: "Method not allowed" })
  } catch (error) {
    return sendError(res, error, "Could not load or save transactions")
  }
}
