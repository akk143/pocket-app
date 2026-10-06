import {
  ApiError,
  RATE_LIMITS,
  type ApiRequest,
  type ApiResponse,
  preventCaching,
  rateLimit,
  requireUser,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    rateLimit(req, res, RATE_LIMITS.sessionRead)
    return res.status(200).json({
      user: await requireUser(req, { includeCurrentProfile: true }),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return res.status(200).json({ user: null })
    }
    return sendError(res, error, "Could not verify your session")
  }
}
