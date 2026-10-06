import {
  type ApiRequest,
  type ApiResponse,
  RATE_LIMITS,
  assertSameOrigin,
  clearSessionCookie,
  preventCaching,
  rateLimit,
  requireMethod,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.apiWrite)
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    clearSessionCookie(res)
    return res.status(200).json({ ok: true })
  } catch (error) {
    return sendError(res, error, "Could not sign out")
  }
}
