import {
  type ApiRequest,
  type ApiResponse,
  assertSameOrigin,
  clearSessionCookie,
  preventCaching,
  requireMethod,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    clearSessionCookie(res)
    return res.status(200).json({ ok: true })
  } catch (error) {
    return sendError(res, error, "Could not sign out")
  }
}
