import { timingSafeEqual } from "node:crypto"
import { adminDb } from "../../server/firebaseAdmin"
import { postRecurring } from "../../server/recurring"
import { RATE_LIMITS, preventCaching, rateLimit, type ApiRequest, type ApiResponse } from "../../server/http"

function authorized(req: ApiRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = req.headers.authorization
  if (!secret || typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return false
  }
  const supplied = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.cron)
  } catch (error) {
    return res.status(429).json({ error: error instanceof Error ? error.message : "Too many requests" })
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    return res.status(405).json({ error: "Method not allowed" })
  }
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" })

  try {
    const now = new Date()
    const latestPossibleLocalDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const snapshot = await adminDb()
      .collectionGroup("recurring")
      .where("nextDueDate", "<=", latestPossibleLocalDate)
      .get()
    const dueItems = snapshot.docs
      .filter((document) => {
        const userDocument = document.ref.parent.parent
        return document.get("active") === true &&
          document.ref.parent.id === "recurring" &&
          userDocument?.parent.id === "users"
      })
    let postedCount = 0
    let failureCount = 0
    let processedCount = 0

    for (let offset = 0; offset < dueItems.length; offset += 10) {
      const results = await Promise.all(
        dueItems.slice(offset, offset + 10).map(async (document) => {
          const userId = document.ref.parent.parent?.id
          if (!userId) return { processed: false, posted: false, failed: false }
          try {
            const result = await postRecurring(userId, document.ref, { dueOnly: true, now })
            return { processed: true, posted: result.posted, failed: false }
          } catch (error) {
            console.error("Could not process recurring schedule:", document.id, error)
            return { processed: true, posted: false, failed: true }
          }
        }),
      )
      for (const result of results) {
        if (result.processed) processedCount += 1
        if (result.posted) postedCount += 1
        if (result.failed) failureCount += 1
      }
    }

    return res
      .status(failureCount ? 500 : 200)
      .json({ processed: processedCount, posted: postedCount, failures: failureCount })
  } catch (error) {
    console.error("Recurring cron failed:", error)
    return res.status(500).json({ error: "Could not process recurring transactions" })
  }
}
