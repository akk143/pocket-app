import { adminAuth } from "../../server/firebaseAdmin"
import { authenticatePassword, establishSession } from "../../server/auth"
import {
  type ApiRequest,
  type ApiResponse,
  ApiError,
  assertAllowedFields,
  assertSameOrigin,
  preventCaching,
  requestBody,
  requireMethod,
  sendError,
} from "../../server/http"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)
  try {
    requireMethod(req, res, "POST")
    assertSameOrigin(req)
    const body = requestBody(req)
    assertAllowedFields(body, ["email", "password", "displayName"])
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Please enter a valid email address")
    }
    if (password.length < 6 || password.length > 4096) {
      throw new ApiError(400, "Password must be at least 6 characters")
    }
    if (!displayName || displayName.length > 120) {
      throw new ApiError(400, "Name must contain 1 to 120 characters")
    }

    const credential = await authenticatePassword("signUp", email, password)
    await adminAuth().updateUser(credential.localId, { displayName })
    await establishSession(credential.idToken, res)

    return res.status(201).json({
      user: { uid: credential.localId, email: credential.email, displayName },
    })
  } catch (error) {
    return sendError(res, error, "Registration failed. Please try again.")
  }
}
