import { adminAuth } from "../../server/firebaseAdmin"
import { authenticatePassword, establishSession } from "../../server/auth"
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
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    rateLimit(req, res, RATE_LIMITS.authLogin)
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    const body = requestBody(req)
    assertAllowedFields(body, ["email", "password"])
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    if (!email || email.length > 254 || !password || password.length > 4096) {
      throw new ApiError(400, "Enter a valid email address and password")
    }

    const credential = await authenticatePassword("signInWithPassword", email, password)
    await establishSession(credential.idToken, res)
    const user = await adminAuth().getUser(credential.localId)

    return res.status(200).json({
      user: {
        uid: user.uid,
        email: user.email ?? credential.email,
        displayName: user.displayName ?? null,
      },
    })
  } catch (error) {
    return sendError(res, error, "Sign-in failed. Please try again.")
  }
}
