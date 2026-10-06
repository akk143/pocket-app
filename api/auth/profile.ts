import { adminAuth } from "../../server/firebaseAdmin"
import {
  type ApiRequest,
  type ApiResponse,
  ApiError,
  RATE_LIMITS,
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
    rateLimit(req, res, RATE_LIMITS.apiWrite)
    requireMethod(req, res, "PATCH")
    assertSameOrigin(req)
    const user = await requireUser(req, { includeCurrentProfile: true })
    const body = requestBody(req)
    assertAllowedFields(body, ["displayName"])
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
    if (!displayName || displayName.length > 120) {
      throw new ApiError(400, "Name must contain 1 to 120 characters")
    }

    await adminAuth().updateUser(user.uid, { displayName })
    return res.status(200).json({ user: { ...user, displayName } })
  } catch (error) {
    return sendError(res, error, "Could not update your profile")
  }
}
