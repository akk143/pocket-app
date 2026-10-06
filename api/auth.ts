import { adminAuth } from "../server/firebaseAdmin"
import { authenticatePassword, establishSession } from "../server/auth"
import {
  type ApiRequest,
  type ApiResponse,
  ApiError,
  RATE_LIMITS,
  assertAllowedFields,
  assertSameOrigin,
  clearSessionCookie,
  preventCaching,
  rateLimit,
  requestBody,
  requireMethod,
  requireUser,
  sendError,
} from "../server/http"

/**
 * Consolidated auth handler — routes by path suffix:
 *
 *   GET  /api/auth/session   → session check
 *   POST /api/auth/login     → sign in
 *   POST /api/auth/logout    → sign out
 *   POST /api/auth/register  → create account
 *   PATCH /api/auth/profile  → update display name
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  preventCaching(res)

  // Derive the sub-action from the URL path
  const url = req.url ?? ""
  // Strip query string and trailing slash, normalise
  const path = url.split("?")[0].replace(/\/+$/, "").toLowerCase()
  // path is like /api/auth/login or /api/auth/session
  const action = path.split("/").pop() // "login" | "logout" | "register" | "session" | "profile"

  try {
    switch (action) {
      // ── GET /api/auth/session ──────────────────────────────────────────────
      case "session": {
        if (req.method !== "GET") {
          res.setHeader("Allow", "GET")
          return res.status(405).json({ error: "Method not allowed" })
        }
        rateLimit(req, res, RATE_LIMITS.sessionRead)
        try {
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

      // ── POST /api/auth/login ───────────────────────────────────────────────
      case "login": {
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
      }

      // ── POST /api/auth/logout ──────────────────────────────────────────────
      case "logout": {
        rateLimit(req, res, RATE_LIMITS.apiWrite)
        requireMethod(req, res, "POST")
        assertSameOrigin(req)
        clearSessionCookie(res)
        return res.status(200).json({ ok: true })
      }

      // ── POST /api/auth/register ────────────────────────────────────────────
      case "register": {
        rateLimit(req, res, RATE_LIMITS.authRegister)
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
      }

      // ── PATCH /api/auth/profile ────────────────────────────────────────────
      case "profile": {
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
      }

      default:
        return res.status(404).json({ error: "Not found" })
    }
  } catch (error) {
    return sendError(res, error, "Request failed")
  }
}
