import { adminAuth } from "./firebaseAdmin"
import {
  ApiError,
  SESSION_MAX_AGE_SECONDS,
  setSessionCookie,
  type ApiResponse,
} from "./http"

interface FirebaseCredentialResult {
  idToken: string
  localId: string
  email: string
  displayName?: string
}

export async function authenticatePassword(
  mode: "signUp" | "signInWithPassword",
  email: string,
  password: string,
): Promise<FirebaseCredentialResult> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY
  if (!apiKey) throw new Error("Firebase Authentication server configuration is missing")

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${mode}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  )
  const result = await response.json() as {
    idToken?: string
    localId?: string
    email?: string
    displayName?: string
    error?: { message?: string }
  }

  if (!response.ok || !result.idToken || !result.localId || !result.email) {
    const code = result.error?.message ?? ""
    console.error("Firebase Authentication request failed:", {
      mode,
      status: response.status,
      code: code || "UNKNOWN_ERROR",
    })
    if (code.includes("EMAIL_EXISTS")) throw new ApiError(409, "An account with this email already exists")
    if (code.includes("INVALID_EMAIL")) throw new ApiError(400, "Please enter a valid email address")
    if (code.includes("WEAK_PASSWORD")) throw new ApiError(400, "Password must be at least 6 characters")
    if (code.includes("INVALID_LOGIN_CREDENTIALS") || code.includes("EMAIL_NOT_FOUND") || code.includes("INVALID_PASSWORD")) {
      throw new ApiError(401, "Incorrect email or password")
    }
    if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
      throw new ApiError(429, "Too many attempts. Please try again later")
    }
    throw new ApiError(503, "Firebase Authentication is temporarily unavailable")
  }

  return result as FirebaseCredentialResult
}

export async function establishSession(idToken: string, res: ApiResponse) {
  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  })
  setSessionCookie(res, sessionCookie)
}
